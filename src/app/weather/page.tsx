'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { 
  Cloud, Sun, CloudRain, CloudSun, Wind, 
  Thermometer, Droplets, MapPin, Search, 
  RefreshCw, Umbrella, CalendarDays, Loader2, AlertCircle,
  ShieldCheck, AlertTriangle, Info, AlertOctagon
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useProjectContext } from '@/context/project-context';
import { format, parseISO } from 'date-fns';
import { getRealWeather, type WeatherOutput } from '@/ai/flows/get-weather-flow';
import { cn } from '@/lib/utils';

export default function WeatherPage() {
  const firestore = useFirestore();
  const { selectedProjectId } = useProjectContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherOutput | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  const { data: projects, isLoading: projectsLoading } = useCollection(projectsCollection);

  const projectCities = useMemo(() => {
    if (!projects) return [];
    const cities = projects.map(p => p.city).filter(Boolean);
    return Array.from(new Set(cities)).sort();
  }, [projects]);

  const filteredCities = projectCities.filter(city => 
    city.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const currentCity = selectedCity || projectCities[0];

  useEffect(() => {
    if (currentCity) {
      fetchWeather(currentCity);
    }
  }, [currentCity]);

  const fetchWeather = async (city: string) => {
    if (!city) return;
    setIsWeatherLoading(true);
    setError(null);
    try {
      const data = await getRealWeather(city);
      setWeatherData(data);
    } catch (err: any) {
      setError(err.message || 'Could not retrieve real-time weather data.');
    } finally {
      setIsWeatherLoading(false);
    }
  };

  const getWeatherIcon = (conditions: string) => {
    const c = (conditions || '').toLowerCase();
    if (c.includes('sun') || c.includes('clear')) return Sun;
    if (c.includes('rain')) return CloudRain;
    if (c.includes('partly')) return CloudSun;
    return Cloud;
  };

  const getWeatherColor = (conditions: string) => {
    const c = (conditions || '').toLowerCase();
    if (c.includes('sun') || c.includes('clear')) return 'text-orange-500';
    if (c.includes('rain')) return 'text-blue-600';
    if (c.includes('partly')) return 'text-blue-400';
    return 'text-slate-400';
  };

  const getSafetyAdvisory = (data: WeatherOutput) => {
    const advisories = [];
    if (data.wind > 20) {
      advisories.push({
        title: "High Wind Alert",
        text: "Crane operations must be suspended if gust limits are exceeded.",
        type: "danger"
      });
    }
    if (data.temp > 90) {
      advisories.push({
        title: "Heat Stress Advisory",
        text: "Watch for signs of heat exhaustion in site personnel.",
        type: "warning"
      });
    } else if (data.temp < 32) {
      advisories.push({
        title: "Freeze & Slip Hazard",
        text: "Apply anti-slip grit to walkways and scaffolding.",
        type: "warning"
      });
    }
    if (data.conditions.toLowerCase().includes('rain')) {
      advisories.push({
        title: "Wet Site Conditions",
        text: "Increased electrical hazard. Suspend outdoor electrical work.",
        type: "info"
      });
    }
    if (advisories.length === 0) {
      advisories.push({
        title: "Optimal Site Conditions",
        text: "Maintain standard safety protocols.",
        type: "success"
      });
    }
    return advisories;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] gap-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold tracking-tight text-slate-800">Weather Service</h1>
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span>Site monitoring in Fahrenheit.</span>
            {selectedProjectId && (
              <Badge variant="secondary" className="h-4 rounded-sm text-[9px] bg-[#46a395]/10 text-[#46a395] font-bold uppercase">
                Context Active
              </Badge>
            )}
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 text-xs gap-2 rounded-sm"
          onClick={() => currentCity && fetchWeather(currentCity)}
          disabled={isWeatherLoading}
        >
          {isWeatherLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Sync Data
        </Button>
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
            {projectsLoading ? (
              <div className="space-y-2 p-2">
                <Skeleton className="h-12 w-full rounded-sm" />
                <Skeleton className="h-12 w-full rounded-sm" />
              </div>
            ) : filteredCities.length === 0 ? (
              <div className="text-center py-10 opacity-50">
                <MapPin className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <div className="text-xs font-bold text-slate-400 uppercase">NO SITES FOUND</div>
              </div>
            ) : (
              filteredCities.map((city) => (
                <button 
                  key={city} 
                  onClick={() => setSelectedCity(city)} 
                  className={`w-full text-left p-3 rounded-sm transition-all border flex items-center justify-between ${currentCity === city ? 'bg-white border-[#46a395] shadow-sm' : 'bg-transparent border-transparent hover:bg-white hover:border-slate-200'}`}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-xs">{city}</span>
                    <span className="text-[9px] text-slate-400 uppercase font-black">Active</span>
                  </div>
                  <MapPin className="h-3 w-3 text-slate-300" />
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <div className="flex-1 flex flex-col gap-2 overflow-y-auto no-scrollbar">
          {error ? (
            <Card className="p-10 flex flex-col items-center justify-center text-center gap-4 bg-red-50 border-red-100">
              <AlertCircle className="h-10 w-10 text-red-500" />
              <div className="text-sm font-bold text-red-700">{error}</div>
              <Button size="sm" onClick={() => currentCity && fetchWeather(currentCity)}>Try Again</Button>
            </Card>
          ) : isWeatherLoading || !weatherData ? (
            <div className="space-y-4">
              <Skeleton className="h-64 w-full rounded-sm" />
              <Skeleton className="h-96 w-full rounded-sm" />
            </div>
          ) : (
            <>
              <Card className="rounded-sm overflow-hidden border-none">
                <div className="bg-[#46a395] p-8 text-white rounded-sm shadow-md">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4 text-white/70" />
                        <span className="text-xs font-bold uppercase tracking-widest opacity-80">Site Focus</span>
                      </div>
                      <h2 className="text-4xl font-black tracking-tighter">{weatherData.city}</h2>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <div className="text-6xl font-black">{weatherData.temp}°F</div>
                        <div className="text-sm font-bold uppercase tracking-wider opacity-90">{weatherData.conditions}</div>
                      </div>
                      {(() => {
                        const Icon = getWeatherIcon(weatherData.conditions);
                        return <Icon className="h-20 w-20 text-white/90 drop-shadow-lg" />;
                      })()}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-10 pt-8 border-t border-white/20">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-sm bg-white/10 flex items-center justify-center border border-white/5"><Wind className="h-6 w-6" /></div>
                      <div><p className="text-[10px] font-bold uppercase opacity-70">Wind</p><p className="text-sm font-black">{weatherData.wind} mph</p></div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-sm bg-white/10 flex items-center justify-center border border-white/5"><Droplets className="h-6 w-6" /></div>
                      <div><p className="text-[10px] font-bold uppercase opacity-70">Humidity</p><p className="text-sm font-black">{weatherData.humidity}%</p></div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-sm bg-white/10 flex items-center justify-center border border-white/5"><Thermometer className="h-6 w-6" /></div>
                      <div><p className="text-[10px] font-bold uppercase opacity-70">High/Low</p><p className="text-sm font-black">{weatherData.high}° / {weatherData.low}°</p></div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="rounded-sm border-slate-200 shadow-sm overflow-hidden bg-slate-50/50">
                <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#46a395]" />
                    <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Site Safety Advisory</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 gap-2">
                    {getSafetyAdvisory(weatherData).map((adv, idx) => (
                      <div key={idx} className={cn(
                        "flex items-start gap-3 p-3 rounded-sm border",
                        adv.type === 'danger' ? "bg-red-50 border-red-100" :
                        adv.type === 'warning' ? "bg-orange-50 border-orange-100" :
                        adv.type === 'info' ? "bg-blue-50 border-blue-100" :
                        "bg-green-50 border-green-100"
                      )}>
                        {adv.type === 'danger' ? <AlertOctagon className="h-4 w-4 text-red-500 mt-0.5" /> :
                         adv.type === 'warning' ? <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" /> :
                         adv.type === 'info' ? <Info className="h-4 w-4 text-blue-500 mt-0.5" /> :
                         <ShieldCheck className="h-4 w-4 text-[#46a395] mt-0.5" />}
                        <div>
                          <h4 className={cn(
                            "text-[11px] font-black uppercase mb-0.5",
                            adv.type === 'danger' ? "text-red-700" :
                            adv.type === 'warning' ? "text-orange-700" :
                            adv.type === 'info' ? "text-blue-700" :
                            "text-green-700"
                          )}>{adv.title}</h4>
                          <p className="text-[10px] text-slate-600 leading-relaxed font-medium">{adv.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-sm border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="p-4 border-b bg-slate-50/50 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-3.5 w-3.5 text-[#46a395]" />
                    <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-slate-500">7-Day Site Forecast</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="grid grid-cols-1 divide-y divide-slate-100">
                    {weatherData.forecast.map((day, i) => {
                      const Icon = getWeatherIcon(day.conditions);
                      const color = getWeatherColor(day.conditions);
                      return (
                        <div key={i} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors group">
                          <div className="w-24">
                            <div className="text-xs font-black text-slate-700">{i === 0 ? 'TODAY' : format(parseISO(day.date), 'EEEE').toUpperCase()}</div>
                            <div className="text-[10px] font-bold text-slate-400">{format(parseISO(day.date), 'MMM dd')}</div>
                          </div>
                          <div className="flex-1 flex items-center gap-4 px-4">
                            <div className="h-8 w-8 rounded-sm bg-slate-100 flex items-center justify-center">
                              <Icon className={`h-4 w-4 ${color}`} />
                            </div>
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">{day.conditions}</span>
                          </div>
                          <div className="flex items-center gap-8">
                            <div className="flex flex-col items-end">
                              <div className="flex items-center gap-1 text-blue-500">
                                <Umbrella className="h-3 w-3" />
                                <span className="text-[10px] font-black">{day.rainProb}%</span>
                              </div>
                            </div>
                            <div className="w-16 text-right">
                              <span className="text-sm font-black text-slate-800">{day.temp}°F</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
