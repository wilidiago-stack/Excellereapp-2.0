'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Clock, FolderKanban, HardHat, Users } from 'lucide-react';
import { OverviewChart } from '@/components/overview-chart';
import { useFirestore, useDoc, useCollection, useMemoFirebase, useAuth } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  const { user } = useAuth();
  const firestore = useFirestore();

  // State to handle client-side date and time to avoid hydration mismatch
  const [dateTime, setDateTime] = useState<{ time: string; date: string } | null>(null);

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setDateTime({
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        date: now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      });
    };

    updateDateTime();
    const timer = setInterval(updateDateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const metadataDoc = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'system', 'metadata') : null),
    [firestore, user?.uid]
  );
  const { data: systemMetadata, isLoading: metadataLoading } = useDoc(metadataDoc);

  const projectsCollection = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'projects') : null),
    [firestore, user?.uid]
  );
  const { data: projects, isLoading: projectsLoading } =
    useCollection(projectsCollection);

  const contractorsCollection = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'contractors') : null),
    [firestore, user?.uid]
  );
  const { data: contractors, isLoading: contractorsLoading } =
    useCollection(contractorsCollection);

  const loading = metadataLoading || projectsLoading || contractorsLoading;

  const userCount = systemMetadata?.userCount ?? 0;
  const projectCount = projects?.length ?? 0;
  const contractorCount = contractors?.length ?? 0;

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
              Local Time
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {!dateTime ? (
              <Skeleton className="h-7 w-32" />
            ) : (
              <div className="flex flex-col gap-1">
                <div className="text-2xl font-bold">{dateTime.time}</div>
                <p className="text-[10px] text-muted-foreground capitalize truncate">
                  {dateTime.date}
                </p>
              </div>
            )}
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
