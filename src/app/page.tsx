'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { 
  FolderKanban, 
  HardHat, 
  Users, 
  Target, 
  LayoutDashboard 
} from 'lucide-react';
import { OverviewChart } from '@/components/overview-chart';
import { 
  useFirestore, 
  useDoc, 
  useCollection, 
  useMemoFirebase, 
  useAuth 
} from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjectContext } from '@/context/project-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMemo } from 'react';

export default function Home() {
  const { user, role, assignedProjects } = useAuth();
  const firestore = useFirestore();
  const { selectedProjectId, setSelectedProjectId } = useProjectContext();

  const metadataDoc = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'system', 'metadata') : null),
    [firestore, user?.uid]
  );
  const { data: systemMetadata, isLoading: metadataLoading } = useDoc(metadataDoc);

  const projectsCollection = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'projects') : null),
    [firestore, user?.uid]
  );
  const { data: projects, isLoading: projectsLoading } = useCollection(projectsCollection);

  const contractorsCollection = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'contractors') : null),
    [firestore, user?.uid]
  );
  const { data: contractors, isLoading: contractorsLoading } = useCollection(contractorsCollection);

  const loading = metadataLoading || projectsLoading || contractorsLoading;

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    if (role === 'admin') return projects;
    return projects.filter(p => assignedProjects?.includes(p.id));
  }, [projects, role, assignedProjects]);

  const projectCount = filteredProjects.length;
  const contractorCount = contractors?.length ?? 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
        
        {/* Card 1: Total Users */}
        <Card className="rounded-sm border-slate-200 shadow-sm p-4 bg-[#46a395] text-white overflow-hidden relative group cursor-default">
          <div className="absolute right-[-10px] top-[-10px] opacity-10 group-hover:scale-110 transition-transform">
            <Users className="h-24 w-24" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Total Users</p>
          {loading ? (
            <Skeleton className="h-8 w-20 bg-white/20 mt-1" />
          ) : (
            <h3 className="text-2xl font-black mt-1 leading-none">{systemMetadata?.userCount || 0}</h3>
          )}
          <p className="text-[9px] mt-2 font-bold opacity-70">System-wide directory</p>
        </Card>
        
        {/* Card 2: My Projects */}
        <Card className="rounded-sm border-slate-200 shadow-sm p-4 bg-[#46a395] text-white overflow-hidden relative group cursor-default">
          <div className="absolute right-[-10px] top-[-10px] opacity-10 group-hover:scale-110 transition-transform">
            <FolderKanban className="h-24 w-24" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-80">My Projects</p>
          {loading ? (
            <Skeleton className="h-8 w-20 bg-white/20 mt-1" />
          ) : (
            <h3 className="text-2xl font-black mt-1 leading-none">{projectCount}</h3>
          )}
          <p className="text-[9px] mt-2 font-bold opacity-70">Accessible portfolio</p>
        </Card>

        {/* Card 3: Contractors */}
        <Card className="rounded-sm border-slate-200 shadow-sm p-4 bg-[#46a395] text-white overflow-hidden relative group cursor-default">
          <div className="absolute right-[-10px] top-[-10px] opacity-10 group-hover:scale-110 transition-transform">
            <HardHat className="h-24 w-24" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Contractors</p>
          {loading ? (
            <Skeleton className="h-8 w-20 bg-white/20 mt-1" />
          ) : (
            <h3 className="text-2xl font-black mt-1 leading-none">{contractorCount}</h3>
          )}
          <p className="text-[9px] mt-2 font-bold opacity-70">Verified vendors</p>
        </Card>

        {/* Card 4: Focused Project - Orange Accent */}
        <Card className="rounded-sm border-slate-200 shadow-sm p-4 bg-[#FF9800] text-white overflow-hidden relative group cursor-default">
          <div className="absolute right-[-10px] top-[-10px] opacity-10 group-hover:scale-110 transition-transform">
            <Target className="h-24 w-24" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Focused Project</p>
          <div className="mt-2 relative z-10">
            <Select 
              value={selectedProjectId || "all"} 
              onValueChange={(val) => setSelectedProjectId(val === "all" ? null : val)}
            >
              <SelectTrigger className="h-8 rounded-sm border-white/20 bg-white/10 text-white text-[11px] font-bold shadow-sm hover:bg-white/20 transition-colors">
                <SelectValue placeholder="Global Context" />
              </SelectTrigger>
              <SelectContent className="rounded-sm border-slate-200">
                <SelectItem value="all" className="text-xs font-bold">All Assigned Projects</SelectItem>
                {filteredProjects?.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs font-medium">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-[9px] mt-2 font-bold opacity-70">Modules filter active</p>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <LayoutDashboard className="h-4 w-4 text-slate-400" />
          <div className="flex flex-col">
            <CardTitle className="text-lg text-slate-800">Activity Overview</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">System performance trends.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <OverviewChart />
        </CardContent>
      </Card>
    </div>
  );
}
