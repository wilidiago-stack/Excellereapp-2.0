'use client';

import { useState } from 'react';
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
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, HardHat } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, query, where } from 'firebase/firestore';
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
import { useProjectContext } from '@/context/project-context';

export default function ContractorsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { selectedProjectId } = useProjectContext();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedContractor, setSelectedContractor] = useState<any>(null);

  const contractorsCollection = useMemoFirebase(
    () => {
      if (!firestore) return null;
      let ref = collection(firestore, 'contractors');
      if (selectedProjectId) {
        return query(ref, where('assignedProjects', 'array-contains', selectedProjectId));
      }
      return ref;
    },
    [firestore, selectedProjectId]
  );
  const { data: contractors, isLoading: loading } = useCollection(contractorsCollection);

  const handleDelete = () => {
    if (!firestore || !selectedContractor) return;
    const contractorDocRef = doc(
      firestore,
      'contractors',
      selectedContractor.id
    );

    deleteDoc(contractorDocRef)
      .then(() => {
        toast({
          title: 'Contractor Deleted',
          description: `${selectedContractor.name} has been deleted.`,
        });
        setShowDeleteDialog(false);
        setSelectedContractor(null);
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: contractorDocRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
        setShowDeleteDialog(false);
        setSelectedContractor(null);
      });
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex flex-col gap-1">
            <CardTitle>Contractors</CardTitle>
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <span>Manage your site vendors.</span>
              {selectedProjectId && (
                <Badge variant="secondary" className="h-4 rounded-sm text-[9px] bg-[#46a395]/10 text-[#46a395] border-[#46a395]/20 font-bold uppercase">
                  Project Filter Active
                </Badge>
              )}
            </div>
          </div>
          <Button asChild>
            <Link href="/contractors/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create new contractor
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company Name</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              )}
              {!loading && contractors?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center opacity-50">
                      <HardHat className="h-8 w-8 mb-2" />
                      <p className="text-xs font-medium">No contractors found for this view.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {contractors?.map((contractor: any) => (
                <TableRow key={contractor.id}>
                  <TableCell className="font-medium">
                    {contractor.name}
                  </TableCell>
                  <TableCell>{contractor.contactPerson}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        contractor.status === 'Active'
                          ? 'default'
                          : 'destructive'
                      }
                    >
                      {contractor.status}
                    </Badge>
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
                          <Link href={`/contractors/${contractor.id}/edit`}>
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedContractor(contractor);
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
              contractor{' '}
              <strong>{selectedContractor?.name}</strong>.
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
    </div>
  );
}
