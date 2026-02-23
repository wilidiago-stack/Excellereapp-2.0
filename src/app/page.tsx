'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FolderKanban, HardHat, Users, Target, LayoutDashboard } from 'lucide-react';
import { OverviewChart } from '@/components/overview-chart';
import { useFirestore, useDoc, useCollection, useMemoFirebase, useAuth } from '@/firebase';
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

  const userCount = systemMetadata?.userCount ?? 0;
  
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-7 w-20" /> : <div className="text-2xl font-bold text-slate-800">{userCount}</div>}
            <div className="text-[10px] text-muted-foreground font-medium">System-wide directory</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">My Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-7 w-20" /> : <div className="text-2xl font-bold text-slate-800">{projectCount}</div>}
            <div className="text-[10px] text-muted-foreground font-medium">Accessible portfolio</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Contractors</CardTitle>
            <HardHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-7 w-20" /> : <div className="text-2xl font-bold text-slate-800">{contractorCount}</div>}
            <div className="text-[10px] text-muted-foreground font-medium">Verified vendors</div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-primary flex items-center gap-2">
              <Target className="h-4 w-4" /> Focused Project
            </Target>
          </CardHeader>
          <CardContent>
            <Select 
              value={selectedProjectId || "all"} 
              onValueChange={(val) => setSelectedProjectId(val === "all" ? null : val)}
            >
              <SelectTrigger className="h-9 rounded-sm border-primary/20 bg-white text-xs font-bold shadow-sm">
                <SelectValue placeholder="Global Context" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs font-bold">All Assigned Projects</SelectItem>
                {filteredProjects?.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs font-medium">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-[10px] text-muted-foreground mt-2 font-medium">
              Modules will filter based on this selection.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <LayoutDashboard className="h-4 w-4 text-slate-400" />
          <div>
            <CardTitle className="text-lg text-slate-800">Activity Overview</CardTitle>
            <CardDescription className="text-xs">System performance trends.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <OverviewChart />
        </CardContent>
      </Card>
    </div>
  );
}
