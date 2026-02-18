'use client';

import React from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { ProjectForm } from '@/components/project-form';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const firestore = useFirestore();

  const projectDocRef = useMemoFirebase(
    () => (firestore && id ? doc(firestore, 'projects', id) : null),
    [firestore, id]
  );
  const { data: projectData, isLoading: loading } = useDoc(projectDocRef);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/projects">
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">
          Edit Project
        </h1>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Project Details</CardTitle>
            <CardDescription>Update the project's details below.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
            {loading && (
                <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-20 w-full" />
                </div>
            )}
            {!loading && projectData && (
                <ProjectForm initialData={{ ...projectData, id }} />
            )}
        </CardContent>
      </Card>
    </div>
  );
}
