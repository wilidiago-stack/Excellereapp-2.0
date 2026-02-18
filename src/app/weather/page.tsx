'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { 
  Cloud, 
  Sun, 
  CloudRain, 
  CloudSun, 
  Wind, 
  Thermometer, 
  Droplets, 
  MapPin, 
  Search,
  RefreshCw,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

// Helper to simulate weather data based on city name
const getSimulatedWeather = (city: string) => {
  const seed = city.length;
  const temp = 15 + (seed % 15);
  const humidity = 40 + (seed % 40);
  const wind = 5 + (seed % 20);
  const conditions = ['Sunny', 'Cloudy', 'Partly Cloudy', 'Light Rain'][seed % 4];
  
  return {
    city,
    temp,
    humidity,
    wind,
    conditions,
    icon: seed % 4 === 0 ? Sun : seed % 4 === 1 ? Cloud : seed % 4 === 2 ? CloudSun : CloudRain,
    color: seed % 4 === 0 ? 'text-orange-500' : seed % 4 === 1 ? 'text-slate-400' : seed % 4 === 2 ? 'text-blue-400' : 'text-blue-600'
  };
};

export default function WeatherPage() {
  const firestore = useFirestore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  const projectsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'projects') : null),
    [firestore]
  );
  const { data: projects, isLoading } = useCollection(projectsCollection);

  // Extract unique cities from projects
  const projectCities = useMemo(() => {
    if (!projects) return [];
    const cities = projects.map(p => p.city).filter(Boolean);
    return Array.from(new Set(cities)).sort();
  }, [projects]);

  const filteredCities = projectCities.filter(city => 
    city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentCity = selectedCity || projectCities[0] || 'Select a City';
  const weather = useMemo(() => getSimulatedWeather(currentCity), [currentCity]);

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] gap-2">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Weather Service</h1>
          <p className="text-xs text-muted-foreground">Real-time conditions for all active project sites.</p>
        </div>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-2">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-2 flex-1 min-h-0">
        {/* Sidebar: Project Cities */}
        <Card className="w-full md:w-72 shrink-0 rounded-sm border-slate-200 shadow-sm flex flex-col">
          <CardHeader className="p-4 border-b bg-slate-50/50">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input 
                placeholder="Search project sites..." 
                className="pl-8 h-9 bg-white border-slate-200 text-xs" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-2 flex-1 overflow-y-auto no-scrollbar space-y-1">
            {isLoading ? (
              <div className="space-y-2 p-2">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full rounded-sm" />)}
              </div>
            ) : filteredCities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center opacity-50">
                <MapPin className="h-8 w-8 mb-2 text-slate-300" />
                <p className="text-xs font-medium text-slate-500">No project sites found</p>
              </div>
            ) : (
              filteredCities.map((city) => {
                const cityWeather = getSimulatedWeather(city);
                const Icon = cityWeather.icon;
                return (
                  <button
                    key={city}
                    onClick={() => setSelectedCity(city)}
                    className={`w-full text-left p-3 rounded-sm transition-all border group flex items-center justify-between ${
                      currentCity === city 
                      ? 'bg-white border-[#46a395] shadow-sm' 
                      : 'bg-transparent border-transparent hover:bg-white hover:border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-xs">{city}</span>
                      <span className="text-[10px] text-slate-500">Active Project Site</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{cityWeather.temp}°C</span>
                      <Icon className={`h-4 w-4 ${cityWeather.color}`} />
                    </div>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Main Content: Weather Detail */}
        <div className="flex-1 flex flex-col gap-2 overflow-y-auto no-scrollbar">
          <Card className="rounded-sm border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-[#46a395] p-6 text-white relative">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm font-medium uppercase tracking-widest opacity-80">Current Conditions</span>
                  </div>
                  <h2 className="text-3xl font-bold">{currentCity}</h2>
                  <p className="text-sm opacity-90 mt-1">Last updated: Just now</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-5xl font-bold">{weather.temp}°</div>
                    <div className="text-sm font-medium opacity-90">{weather.conditions}</div>
                  </div>
                  <weather.icon className="h-16 w-16 text-white/90 drop-shadow-md" />
                </div>
              </div>
              
              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-white/20">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-sm bg-white/10 flex items-center justify-center">
                    <Wind className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase opacity-70">Wind Speed</p>
                    <p className="text-sm font-bold">{weather.wind} km/h</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-sm bg-white/10 flex items-center justify-center">
                    <Droplets className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase opacity-70">Humidity</p>
                    <p className="text-sm font-bold">{weather.humidity}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-sm bg-white/10 flex items-center justify-center">
                    <Thermometer className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase opacity-70">Feels Like</p>
                    <p className="text-sm font-bold">{weather.temp + 2}°</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            <Card className="rounded-sm border-slate-200 shadow-sm">
              <CardHeader className="p-4 border-b bg-slate-50/50">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  5-Day Forecast
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {[1, 2, 3, 4, 5].map((day) => {
                  const forecast = getSimulatedWeather(currentCity + day);
                  const Icon = forecast.icon;
                  const date = new Date();
                  date.setDate(date.getDate() + day);
                  return (
                    <div key={day} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                      <div className="w-24">
                        <p className="text-xs font-bold">{date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-1 justify-center">
                        <Icon className={`h-4 w-4 ${forecast.color}`} />
                        <span className="text-[10px] font-medium text-slate-500">{forecast.conditions}</span>
                      </div>
                      <div className="w-20 text-right">
                        <span className="text-xs font-bold">{forecast.temp}°</span>
                        <span className="text-[10px] text-slate-400 ml-2">{forecast.temp - 5}°</span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="rounded-sm border-slate-200 shadow-sm">
              <CardHeader className="p-4 border-b bg-slate-50/50">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-primary" />
                  Site Safety Advisory
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className={`p-3 rounded-sm border flex gap-3 ${weather.wind > 15 ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
                    <div className={`h-8 w-8 shrink-0 rounded-sm flex items-center justify-center ${weather.wind > 15 ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                      <Wind className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold mb-0.5">Wind Impact</h4>
                      <p className="text-[10px] text-slate-600">
                        {weather.wind > 15 
                          ? 'Moderate winds detected. Secure loose materials and monitor crane operations.' 
                          : 'Low wind speeds. Standard safety protocols apply for aerial work.'}
                      </p>
                    </div>
                  </div>

                  <div className={`p-3 rounded-sm border flex gap-3 ${weather.conditions.includes('Rain') ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}`}>
                    <div className={`h-8 w-8 shrink-0 rounded-sm flex items-center justify-center ${weather.conditions.includes('Rain') ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                      <CloudRain className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold mb-0.5">Precipitation Alert</h4>
                      <p className="text-[10px] text-slate-600">
                        {weather.conditions.includes('Rain') 
                          ? 'Ongoing rain. Ensure proper drainage and avoid electrical work in exposed areas.' 
                          : 'No precipitation expected. Ideal conditions for outdoor foundation work.'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Badge variant="outline" className="text-[9px] rounded-sm bg-slate-50">
                      Recommendation: Standard PPE Required
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
