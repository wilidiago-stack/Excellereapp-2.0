'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Activity, FolderKanban, HardHat, Users } from 'lucide-react';
import { OverviewChart } from '@/components/overview-chart';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  const firestore = useFirestore();

  const metadataDoc = useMemoFirebase(
    () => (firestore ? doc(firestore, 'system', 'metadata') : null),
    [firestore]
  );
  const { data: systemMetadata, loading: metadataLoading } = useDoc(metadataDoc);

  const projectsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'projects') : null),
    [firestore]
  );
  const { data: projects, loading: projectsLoading } =
    useCollection(projectsCollection);

  const contractorsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'contractors') : null),
    [firestore]
  );
  const { data: contractors, loading: contractorsLoading } =
    useCollection(contractorsCollection);

  const loading = metadataLoading || projectsLoading || contractorsLoading;

  const userCount = systemMetadata?.userCount ?? 0;
  const projectCount = projects?.length ?? 0;
  const contractorCount = contractors?.length ?? 0;
  const activeProjects =
    projects?.filter((p: any) => p.status === 'In Progress').length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <div className="text-2xl font-bold">{userCount}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Total users in the system
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Projects
            </CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <div className="text-2xl font-bold">{projectCount}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Total projects managed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Contractors
            </CardTitle>
            <HardHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <div className="text-2xl font-bold">{contractorCount}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Total contractors available
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Projects
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <div className="text-2xl font-bold">{activeProjects}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Projects currently in progress
            </p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
          <CardDescription>
            Activity summary for the last 6 months.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OverviewChart />
        </CardContent>
      </Card>
    </div>
  );
}
