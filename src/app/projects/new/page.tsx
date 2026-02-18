'use client';

import { ProjectForm } from '@/components/project-form';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function NewProjectPage() {
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
          Create New Project
        </h1>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Project Details</CardTitle>
            <CardDescription>Fill in the details below to create a new project.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
            <ProjectForm />
        </CardContent>
      </Card>
    </div>
  );
}
