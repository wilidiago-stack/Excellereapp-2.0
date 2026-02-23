'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Cloud, Sun, CloudRain, CloudSun, Wind, Thermometer, Droplets, MapPin, Search, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useProjectContext } from '@/context/project-context';

const getSimulatedWeather = (city: string) => {
  const seed = city.length;
  const temp = 15 + (seed % 15);
  return {
    city,
    temp,
    humidity: 40 + (seed % 40),
    wind: 5 + (seed % 20),
    conditions: ['Sunny', 'Cloudy', 'Partly Cloudy', 'Light Rain'][seed % 4],
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
  const currentCity = selectedCity || projectCities[0] || (selectedProjectId ? 'Location Pending' : 'Portfolio Resumen');
  const weather = useMemo(() => getSimulatedWeather(currentCity), [currentCity]);

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] gap-2">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Weather Service</h1>
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span>Real-time conditions for {selectedProjectId ? 'Active Project' : 'All Sites'}.</span>
            {selectedProjectId && <Badge variant="secondary" className="h-4 rounded-sm text-[9px] bg-[#46a395]/10 text-[#46a395] border-[#46a395]/20 font-bold">Context Active</Badge>}
          </div>
        </div>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-2"><RefreshCw className="h-3.5 w-3.5" /> Refresh</Button>
      </div>

      <div className="flex flex-col md:flex-row gap-2 flex-1 min-h-0">
        <Card className="w-full md:w-72 shrink-0 rounded-sm border-slate-200 shadow-sm flex flex-col">
          <CardHeader className="p-4 border-b bg-slate-50/50">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search sites..." className="pl-8 h-9 bg-white border-slate-200 text-xs" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent className="p-2 flex-1 overflow-y-auto no-scrollbar space-y-1">
            {isLoading ? <Skeleton className="h-12 w-full" /> : filteredCities.length === 0 ? <div className="text-center py-10 opacity-50"><MapPin className="h-8 w-8 mx-auto mb-2" /><p className="text-xs">No sites</p></div> : (
              filteredCities.map((city) => {
                const cityWeather = getSimulatedWeather(city);
                const Icon = cityWeather.icon;
                return (
                  <button key={city} onClick={() => setSelectedCity(city)} className={`w-full text-left p-3 rounded-sm transition-all border flex items-center justify-between ${currentCity === city ? 'bg-white border-[#46a395] shadow-sm' : 'bg-transparent border-transparent hover:bg-white hover:border-slate-200'}`}>
                    <div className="flex flex-col gap-0.5"><span className="font-bold text-xs">{city}</span><span className="text-[10px] text-slate-500">Site Monitor</span></div>
                    <div className="flex items-center gap-2"><span className="text-xs font-medium">{cityWeather.temp}°C</span><Icon className={`h-4 w-4 ${cityWeather.color}`} /></div>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        <div className="flex-1 flex flex-col gap-2 overflow-y-auto no-scrollbar">
          <Card className="rounded-sm border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-[#46a395] p-6 text-white">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1"><MapPin className="h-4 w-4" /><span className="text-sm font-medium uppercase opacity-80">Location Focus</span></div>
                  <h2 className="text-3xl font-bold">{currentCity}</h2>
                </div>
                <div className="flex items-center gap-6"><div className="text-right"><div className="text-5xl font-bold">{weather.temp}°</div><div className="text-sm opacity-90">{weather.conditions}</div></div><weather.icon className="h-16 w-16 text-white/90" /></div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-white/20">
                <div className="flex items-center gap-3"><div className="h-10 w-10 rounded-sm bg-white/10 flex items-center justify-center"><Wind className="h-5 w-5" /></div><div><p className="text-[10px] uppercase opacity-70">Wind</p><p className="text-sm font-bold">{weather.wind} km/h</p></div></div>
                <div className="flex items-center gap-3"><div className="h-10 w-10 rounded-sm bg-white/10 flex items-center justify-center"><Droplets className="h-5 w-5" /></div><div><p className="text-[10px] uppercase opacity-70">Hum</p><p className="text-sm font-bold">{weather.humidity}%</p></div></div>
                <div className="flex items-center gap-3"><div className="h-10 w-10 rounded-sm bg-white/10 flex items-center justify-center"><Thermometer className="h-5 w-5" /></div><div><p className="text-[10px] uppercase opacity-70">Feels</p><p className="text-sm font-bold">{weather.temp + 2}°</p></div></div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}