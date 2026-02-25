'use server';
/**
 * @fileOverview Genkit Flow to fetch real-time weather data.
 * Handles external API integration with wttr.in.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const WeatherForecastSchema = z.object({
  date: z.string(),
  temp: z.number(),
  conditions: z.string(),
  rainProb: z.number(),
});

const WeatherOutputSchema = z.object({
  city: z.string(),
  temp: z.number(),
  high: z.number(),
  low: z.number(),
  humidity: z.number(),
  wind: z.number(),
  conditions: z.string(),
  forecast: z.array(WeatherForecastSchema),
});

export type WeatherOutput = z.infer<typeof WeatherOutputSchema>;

/**
 * Fetches real-time weather using wttr.in JSON format.
 * @param city Name of the city to query.
 */
export async function getRealWeather(city: string): Promise<WeatherOutput> {
  if (!city) throw new Error('City name is required');
  return getRealWeatherFlow(city);
}

const getRealWeatherFlow = ai.defineFlow(
  {
    name: 'getRealWeatherFlow',
    inputSchema: z.string(),
    outputSchema: WeatherOutputSchema,
  },
  async (city) => {
    try {
      const url = `https://wttr.in/${encodeURIComponent(city)}?format=j1`;
      const response = await fetch(url, {
        next: { revalidate: 3600 } // Cache for 1 hour
      });
      
      if (!response.ok) throw new Error('Weather API service is unavailable');
      
      const data = await response.json();
      
      if (!data.current_condition || data.current_condition.length === 0) {
        throw new Error('No weather data found for this location');
      }

      const current = data.current_condition[0];
      const weatherToday = data.weather[0];
      
      // Defensive extraction of description
      const weatherDesc = current.weatherDesc?.[0]?.value || 'Clear';
      
      const forecast = data.weather.map((w: any) => {
        // Use mid-day (12:00) forecast if available, else first item
        const hourData = w.hourly?.[4] || w.hourly?.[0] || {};
        return {
          date: w.date || new Date().toISOString(),
          temp: parseInt(w.avgtempF) || 70,
          conditions: hourData.weatherDesc?.[0]?.value || 'Fair',
          rainProb: parseInt(hourData.chanceofrain) || 0,
        };
      });

      return {
        city,
        temp: parseInt(current.temp_F) || 70,
        high: parseInt(weatherToday.maxtempF) || 75,
        low: parseInt(weatherToday.mintempF) || 65,
        humidity: parseInt(current.humidity) || 50,
        wind: parseInt(current.windspeedMiles) || 5,
        conditions: weatherDesc,
        forecast: forecast.slice(0, 7),
      };
    } catch (error) {
      console.error('Weather Flow Error:', error);
      throw error;
    }
  }
);
