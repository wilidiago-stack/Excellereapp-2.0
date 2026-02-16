'use client';

import React, { useMemo, useState } from 'react';
import { PlusCircle, MoreHorizontal } from 'lucide-react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, doc, deleteDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function ProjectsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);

  const projectsCollection = useMemo(
    () => (firestore ? collection(firestore, 'projects') : null),
    [firestore]
  );
  const { data: projects, loading } = useCollection(projectsCollection);

  const handleDelete = () => {
    if (!firestore || !selectedProject) return;
    const projectDocRef = doc(firestore, 'projects', selectedProject.id);

    deleteDoc(projectDocRef)
      .then(() => {
        toast({
          title: 'Project Deleted',
          description: `Project ${selectedProject.name} has been deleted.`,
        });
        setShowDeleteDialog(false);
        setSelectedProject(null);
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: projectDocRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
        setShowDeleteDialog(false);
        setSelectedProject(null);
      });
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="grid gap-2">
            <CardTitle>Projects</CardTitle>
            <CardDescription>Manage your projects here.</CardDescription>
          </div>
          <Button asChild>
            <Link href="/projects/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create new project
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              )}
              {!loading && projects?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No projects found.
                  </TableCell>
                </TableRow>
              )}
              {projects?.map((project: any) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell>{project.companyName}</TableCell>
                  <TableCell>
                    {project.startDate
                      ? format(project.startDate.toDate(), 'PPP')
                      : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{project.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href={`/projects/${project.id}/edit`}>
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedProject(project);
                            setShowDeleteDialog(true);
                          }}
                          className="text-destructive"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              project <strong>{selectedProject?.name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
