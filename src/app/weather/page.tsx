'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { 
  Cloud, Sun, CloudRain, CloudSun, Wind, 
  Thermometer, Droplets, MapPin, Search, 
  RefreshCw, Umbrella, CalendarDays 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useProjectContext } from '@/context/project-context';
import { format, addDays } from 'date-fns';

const getSimulatedWeather = (city: string) => {
  const seed = city.length;
  const temp = 60 + (seed % 30);
  const conditions = ['Sunny', 'Cloudy', 'Partly Cloudy', 'Light Rain'][seed % 4];
  
  const forecast = Array.from({ length: 7 }).map((_, i) => {
    const daySeed = seed + i;
    const dayTemp = 55 + (daySeed % 35);
    return {
      date: addDays(new Date(), i),
      temp: dayTemp,
      conditions: ['Sunny', 'Cloudy', 'Rain', 'Overcast'][daySeed % 4],
      rainProb: (daySeed * 7) % 100,
    };
  });

  return {
    city,
    temp,
    humidity: 40 + (seed % 40),
    wind: 5 + (seed % 20),
    conditions,
    forecast,
    icon: seed % 4 === 0 ? Sun : seed % 4 === 1 ? Cloud : seed % 4 === 2 ? CloudSun : CloudRain,
    color: seed % 4 === 0 ? 'text-orange-500' : seed % 4 === 1 ? 'text-slate-400' : seed % 4 === 2 ? 'text-blue-400' : 'text-blue-600'
  };
};

export default function WeatherPage() {
  const firestore = useFirestore();
  const { selectedProjectId } = useProjectContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  const projectsCollection = useMemoFirebase(
    () => {
      if (!firestore) return null;
      let ref = collection(firestore, 'projects');
      if (selectedProjectId) {
        return query(ref, where('__name__', '==', selectedProjectId));
      }
      return ref;
    },
    [firestore, selectedProjectId]
  );
  const { data: projects, isLoading } = useCollection(projectsCollection);

  const projectCities = useMemo(() => {
    if (!projects) return [];
    const cities = projects.map(p => p.city).filter(Boolean);
    return Array.from(new Set(cities)).sort();
  }, [projects]);

  const filteredCities = projectCities.filter(city => city.toLowerCase().includes(searchQuery.toLowerCase()));
  const currentCity = selectedCity || projectCities[0] || (selectedProjectId ? 'Location Pending' : 'Select Project');
  const weather = useMemo(() => getSimulatedWeather(currentCity), [currentCity]);

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] gap-2">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Weather Service</h1>
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span>Site conditions monitoring in Fahrenheit.</span>
            {selectedProjectId && <Badge variant="secondary" className="h-4 rounded-sm text-[9px] bg-[#46a395]/10 text-[#46a395] border-[#46a395]/20 font-bold uppercase">Context Active</Badge>}
          </div>
        </div>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-2 rounded-sm"><RefreshCw className="h-3.5 w-3.5" /> Sync Data</Button>
      </div>

      <div className="flex flex-col md:flex-row gap-2 flex-1 min-h-0">
        <Card className="w-full md:w-72 shrink-0 rounded-sm border-slate-200 shadow-sm flex flex-col">
          <CardHeader className="p-4 border-b bg-slate-50/50">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Filter sites..." className="pl-8 h-9 bg-white border-slate-200 text-xs rounded-sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent className="p-2 flex-1 overflow-y-auto no-scrollbar space-y-1">
            {isLoading ? <div className="space-y-2 p-2"><Skeleton className="h-12 w-full rounded-sm" /><Skeleton className="h-12 w-full rounded-sm" /></div> : filteredCities.length === 0 ? <div className="text-center py-10 opacity-50"><MapPin className="h-8 w-8 mx-auto mb-2 text-slate-300" /><p className="text-xs font-bold text-slate-400">NO SITES FOUND</p></div> : (
              filteredCities.map((city) => {
                const cityWeather = getSimulatedWeather(city);
                const Icon = cityWeather.icon;
                return (
                  <button key={city} onClick={() => setSelectedCity(city)} className={`w-full text-left p-3 rounded-sm transition-all border flex items-center justify-between ${currentCity === city ? 'bg-white border-[#46a395] shadow-sm' : 'bg-transparent border-transparent hover:bg-white hover:border-slate-200'}`}>
                    <div className="flex flex-col gap-0.5"><span className="font-bold text-xs">{city}</span><span className="text-[9px] text-slate-400 uppercase font-black">Active Monitoring</span></div>
                    <div className="flex items-center gap-2"><span className="text-xs font-bold text-slate-700">{cityWeather.temp}°F</span><Icon className={`h-4 w-4 ${cityWeather.color}`} /></div>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        <div className="flex-1 flex flex-col gap-2 overflow-y-auto no-scrollbar">
          <Card className="rounded-sm border-slate-200 shadow-sm overflow-hidden border-none shadow-none">
            <div className="bg-[#46a395] p-8 text-white rounded-sm shadow-md">
              <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2"><MapPin className="h-4 w-4 text-white/70" /><span className="text-xs font-bold uppercase tracking-widest opacity-80">Site Location Focus</span></div>
                  <h2 className="text-4xl font-black tracking-tighter">{currentCity}</h2>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <div className="text-6xl font-black">{weather.temp}°F</div>
                    <div className="text-sm font-bold uppercase tracking-wider opacity-90">{weather.conditions}</div>
                  </div>
                  <weather.icon className="h-20 w-20 text-white/90 drop-shadow-lg" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-10 pt-8 border-t border-white/20">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-sm bg-white/10 flex items-center justify-center border border-white/5 shadow-inner"><Wind className="h-6 w-6" /></div>
                  <div><p className="text-[10px] font-bold uppercase opacity-70 tracking-widest">Wind Speed</p><p className="text-sm font-black">{weather.wind} mph</p></div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-sm bg-white/10 flex items-center justify-center border border-white/5 shadow-inner"><Droplets className="h-6 w-6" /></div>
                  <div><p className="text-[10px] font-bold uppercase opacity-70 tracking-widest">Humidity</p><p className="text-sm font-black">{weather.humidity}%</p></div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-sm bg-white/10 flex items-center justify-center border border-white/5 shadow-inner"><Thermometer className="h-6 w-6" /></div>
                  <div><p className="text-[10px] font-bold uppercase opacity-70 tracking-widest">Feels Like</p><p className="text-sm font-black">{weather.temp + 4}°F</p></div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="rounded-sm border-slate-200 shadow-sm overflow-hidden flex-1">
            <CardHeader className="p-4 border-b bg-slate-50/50 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <CalendarDays className="h-3.5 w-3.5 text-[#46a395]" /> 7-Day Site Forecast
              </CardTitle>
              <span className="text-[9px] font-black text-slate-300 uppercase">Unit: Imperial (F)</span>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-1 divide-y divide-slate-100">
                {weather.forecast.map((day, i) => (
                  <div key={i} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors group">
                    <div className="w-24">
                      <p className="text-xs font-black text-slate-700">{i === 0 ? 'TODAY' : format(day.date, 'EEEE').toUpperCase()}</p>
                      <p className="text-[10px] font-bold text-slate-400">{format(day.date, 'MMM dd')}</p>
                    </div>
                    <div className="flex-1 flex items-center gap-4 px-4">
                      <div className="h-8 w-8 rounded-sm bg-slate-100 flex items-center justify-center text-[#46a395] group-hover:bg-white group-hover:shadow-sm transition-all">
                        {day.conditions === 'Sunny' ? <Sun className="h-4 w-4" /> : 
                         day.conditions === 'Rain' ? <CloudRain className="h-4 w-4" /> : 
                         <Cloud className="h-4 w-4" />}
                      </div>
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">{day.conditions}</span>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1 text-blue-500">
                          <Umbrella className="h-3 w-3" />
                          <span className="text-[10px] font-black">{day.rainProb}%</span>
                        </div>
                        <span className="text-[8px] font-bold text-slate-300 uppercase">PRECIP.</span>
                      </div>
                      <div className="w-16 text-right">
                        <span className="text-sm font-black text-slate-800">{day.temp}°</span>
                        <span className="text-[10px] text-slate-400 ml-1 font-bold">F</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
