'use client';

import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MapPin, Navigation, Info } from 'lucide-react';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function MapPage() {
  const firestore = useFirestore();
  const [searchQuery, setSearchQuery] = useState('');

  const projectsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'projects') : null),
    [firestore]
  );
  const { data: projects, isLoading } = useCollection(projectsCollection);

  const filteredProjects = projects?.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.city.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Project Map</h1>
          <p className="text-muted-foreground">Geographic distribution of all active and completed projects.</p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm">
             <Info className="mr-2 h-4 w-4" />
             Map Legend
           </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-2 h-full min-h-0">
        {/* Sidebar for Projects */}
        <Card className="w-full md:w-80 flex flex-col shrink-0 shadow-sm border-slate-200 overflow-hidden">
          <CardHeader className="pb-3 border-b bg-slate-50/50">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Filter by name or city..." 
                className="pl-8 bg-white border-slate-200" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-1 no-scrollbar p-2 bg-slate-50/30">
            {isLoading ? (
              <div className="space-y-2 p-2">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                <MapPin className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-sm font-medium text-slate-500">No projects found</p>
                <p className="text-xs text-slate-400">Try a different search term or check filters.</p>
              </div>
            ) : (
              filteredProjects.map((project) => (
                <button 
                  key={project.id}
                  className="w-full text-left p-3 rounded-sm transition-all hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 group flex flex-col gap-1"
                >
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${project.status === 'In Progress' ? 'bg-[#46a395]' : 'bg-orange-400'}`} />
                    <span className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{project.name}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 pl-4">
                    <span className="truncate">{project.address || `${project.city}, ${project.state}`}</span>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Map Container */}
        <Card className="flex-1 overflow-hidden relative shadow-sm border-slate-200">
          <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
             <iframe
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="no"
              marginHeight={0}
              marginWidth={0}
              src="https://www.openstreetmap.org/export/embed.html?bbox=-120%2C15%2C-60%2C55&layer=mapnik"
              className="border-none opacity-90 transition-opacity hover:opacity-100"
              title="Project Map"
            ></iframe>
          </div>
          
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <Button variant="secondary" size="icon" className="shadow-md bg-white hover:bg-slate-50 h-9 w-9">
              <Navigation className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Legend Overlay */}
          <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm p-3 rounded-sm border border-slate-200 shadow-lg text-[10px] space-y-2 min-w-[120px]">
            <p className="font-bold text-slate-700 border-b pb-1 mb-1">Status Legend</p>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-[#46a395]" />
              <span className="text-slate-600">In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-orange-400" />
              <span>Not Started / Hold</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-slate-400" />
              <span className="text-slate-500">Completed</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
