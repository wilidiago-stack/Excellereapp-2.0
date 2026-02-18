'use client';

import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MapPin, Navigation, Info, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function MapPage() {
  const firestore = useFirestore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<any>(null);

  const projectsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'projects') : null),
    [firestore]
  );
  const { data: projects, isLoading } = useCollection(projectsCollection);

  const filteredProjects = projects?.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.city.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getMapUrl = () => {
    if (selectedProject) {
      const query = encodeURIComponent(`${selectedProject.address}, ${selectedProject.city}, ${selectedProject.state}`);
      return `https://maps.google.com/maps?q=${query}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
    }
    return `https://maps.google.com/maps?q=United%20States&t=&z=4&ie=UTF8&iwloc=&output=embed`;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] gap-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Project Map</h1>
          <p className="text-xs text-muted-foreground text-pretty">Geographic distribution of all active and completed projects using Google Maps.</p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" className="h-8 text-xs">
             <Info className="mr-2 h-3.5 w-3.5" />
             Legend
           </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-2 h-full min-h-0">
        <Card className="w-full md:w-80 flex flex-col shrink-0 shadow-sm border-slate-200 overflow-hidden rounded-sm">
          <CardHeader className="p-3 border-b bg-slate-50/50">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input 
                placeholder="Filter projects..." 
                className="pl-8 h-9 bg-white border-slate-200 text-xs" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-1 no-scrollbar p-2 bg-slate-50/30">
            {isLoading ? (
              <div className="space-y-2 p-2">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full rounded-sm" />)}
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                <MapPin className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-xs font-medium text-slate-500">No projects found</p>
              </div>
            ) : (
              filteredProjects.map((project) => (
                <button 
                  key={project.id}
                  onClick={() => setSelectedProject(project)}
                  className={`w-full text-left p-2.5 rounded-sm transition-all border group flex flex-col gap-0.5 ${
                    selectedProject?.id === project.id 
                    ? 'bg-white border-[#46a395] shadow-sm' 
                    : 'bg-transparent border-transparent hover:bg-white hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${project.status === 'In Progress' ? 'bg-[#46a395]' : 'bg-orange-400'}`} />
                    <span className="font-semibold text-xs truncate group-hover:text-primary transition-colors">{project.name}</span>
                  </div>
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[10px] text-slate-500 pl-4 truncate">{project.city}, {project.state}</span>
                    {selectedProject?.id === project.id && <ExternalLink className="h-3 w-3 text-[#46a395]" />}
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="flex-1 overflow-hidden relative shadow-sm border-slate-200 rounded-sm">
          <div className="absolute inset-0 bg-slate-100">
             <iframe
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="no"
              marginHeight={0}
              marginWidth={0}
              src={getMapUrl()}
              className="border-none transition-opacity duration-500"
              title="Google Project Map"
              allowFullScreen
            ></iframe>
          </div>
          
          <div className="absolute top-3 right-3 flex flex-col gap-2">
            <Button variant="secondary" size="icon" className="shadow-md bg-white hover:bg-slate-50 h-8 w-8 rounded-sm">
              <Navigation className="h-3.5 w-3.5" />
            </Button>
          </div>
          
          <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm p-2 rounded-sm border border-slate-200 shadow-md text-[9px] space-y-1.5 min-w-[110px]">
            <p className="font-bold text-slate-700 border-b pb-1 mb-1">Project Status</p>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-[#46a395]" />
              <span className="text-slate-600">In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-orange-400" />
              <span>Pending / Hold</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-slate-400" />
              <span className="text-slate-500">Completed</span>
            </div>
          </div>

          {selectedProject && (
            <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm p-3 rounded-sm border border-[#46a395] shadow-lg max-w-[200px] animate-in fade-in slide-in-from-left-2">
              <p className="text-[10px] font-bold text-[#46a395] uppercase mb-1">Selected Project</p>
              <h4 className="text-xs font-bold truncate">{selectedProject.name}</h4>
              <p className="text-[10px] text-slate-600 mt-1">{selectedProject.address}</p>
              <Button 
                variant="link" 
                size="sm" 
                className="h-auto p-0 text-[10px] mt-2 text-[#46a395]"
                onClick={() => setSelectedProject(null)}
              >
                Clear selection
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
