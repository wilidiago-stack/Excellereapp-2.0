'use server';
/**
 * @fileOverview Genkit Flow to fetch real-time weather data.
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

export async function getRealWeather(city: string): Promise<WeatherOutput> {
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
      const response = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
      if (!response.ok) throw new Error('Weather service unavailable');
      const data = await response.json();

      const current = data.current_condition[0];
      const weatherToday = data.weather[0];
      const weatherDesc = current.weatherDesc[0].value;
      
      const forecast = data.weather.map((w: any) => ({
        date: w.date,
        temp: parseInt(w.avgtempF),
        conditions: w.hourly[4].weatherDesc[0].value,
        rainProb: parseInt(w.hourly[4].chanceofrain),
      }));

      return {
        city,
        temp: parseInt(current.temp_F),
        high: parseInt(weatherToday.maxtempF),
        low: parseInt(weatherToday.mintempF),
        humidity: parseInt(current.humidity),
        wind: parseInt(current.windspeedMiles),
        conditions: weatherDesc,
        forecast: forecast.slice(0, 7),
      };
    } catch (error) {
      console.error('Weather fetch error:', error);
      throw error;
    }
  }
);
