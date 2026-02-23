'use client';

import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useProjectContext } from '@/context/project-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, HardHat, User, ShieldCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProjectTeamPage() {
  const firestore = useFirestore();
  const { selectedProjectId } = useProjectContext();

  const contractorsQuery = useMemoFirebase(() => {
    if (!firestore || !selectedProjectId) return null;
    return query(
      collection(firestore, 'contractors'),
      where('status', '==', 'Active'),
      where('assignedProjects', 'array-contains', selectedProjectId)
    );
  }, [firestore, selectedProjectId]);

  const { data: contractors, isLoading } = useCollection(contractorsQuery);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold tracking-tight text-slate-800">Project Team</h1>
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <span>Active vendors and personnel for the selected project.</span>
          {selectedProjectId && (
            <Badge variant="secondary" className="h-4 rounded-sm text-[9px] bg-[#46a395]/10 text-[#46a395] border-[#46a395]/20 font-bold uppercase">
              Project Filter Active
            </Badge>
          )}
        </div>
      </div>

      {!selectedProjectId ? (
        <Card className="border-dashed py-20 flex flex-col items-center justify-center text-center">
          <Users className="h-12 w-12 text-slate-300 mb-4" />
          <h2 className="text-sm font-bold text-slate-600">No Project Selected</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">Please select a project in the Dashboard to view the specific team assignments.</p>
        </Card>
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full rounded-sm" />)}
        </div>
      ) : contractors?.length === 0 ? (
        <Card className="border-dashed py-20 flex flex-col items-center justify-center text-center">
          <HardHat className="h-12 w-12 text-slate-300 mb-4" />
          <h2 className="text-sm font-bold text-slate-600">No Active Contractors</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">There are no active contractors assigned to this project yet.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contractors?.map((contractor) => (
            <Card key={contractor.id} className="rounded-sm shadow-sm border-slate-200 overflow-hidden hover:border-primary/30 transition-colors">
              <CardHeader className="bg-slate-50/50 p-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-sm bg-primary/10 flex items-center justify-center text-primary">
                      <HardHat className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-sm font-bold truncate max-w-[150px]">{contractor.name}</CardTitle>
                  </div>
                  <Badge className="bg-[#46a395] text-[9px] h-4 rounded-sm">Active</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-500">
                    <User className="h-3.5 w-3.5" />
                    <span className="text-[11px] font-medium uppercase tracking-wider">Contact Person</span>
                  </div>
                  <p className="text-xs font-bold text-slate-700">{contractor.contactPerson || 'N/A'}</p>
                </div>
                {contractor.services && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-500">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Services</span>
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-2 italic">{contractor.services}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
