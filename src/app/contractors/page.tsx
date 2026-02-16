'use client';

import { useMemo, useState } from 'react';
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
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, doc, deleteDoc } from 'firebase/firestore';
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

export default function ContractorsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedContractor, setSelectedContractor] = useState<any>(null);

  const contractorsCollection = useMemo(
    () => (firestore ? collection(firestore, 'contractors') : null),
    [firestore]
  );
  const { data: contractors, loading } = useCollection(contractorsCollection);

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
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Contractors</CardTitle>
            <CardDescription>Manage your contractors here.</CardDescription>
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
                  <TableCell colSpan={4} className="h-24 text-center">
                    No contractors found.
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
    </>
  );
}
