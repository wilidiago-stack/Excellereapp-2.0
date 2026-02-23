'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, HardHat, Search } from 'lucide-react';
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
import { Input } from '@/components/ui/input';

export default function ContractorsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { selectedProjectId } = useProjectContext();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedContractor, setSelectedContractor] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredAndSortedContractors = useMemo(() => {
    if (!contractors) return [];
    
    return contractors
      .filter(c => 
        c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        c.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [contractors, searchQuery]);

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
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
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
          <div className="flex items-center gap-4">
            <div className="relative w-64 hidden md:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter by name..."
                className="pl-9 h-9 bg-white border-slate-200 text-xs rounded-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button asChild className="h-9 rounded-sm text-xs">
              <Link href="/contractors/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create new contractor
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b-slate-200">
                <TableHead className="text-[11px] font-bold uppercase">Company Name</TableHead>
                <TableHead className="text-[11px] font-bold uppercase">Contact Person</TableHead>
                <TableHead className="text-[11px] font-bold uppercase">Status</TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    Loading vendors...
                  </TableCell>
                </TableRow>
              )}
              {!loading && filteredAndSortedContractors.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center opacity-50">
                      <HardHat className="h-8 w-8 mb-2" />
                      <p className="text-xs font-medium">No contractors found for this view.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {filteredAndSortedContractors.map((contractor: any) => (
                <TableRow key={contractor.id} className="hover:bg-slate-50/50 border-b-slate-100 group">
                  <TableCell className="font-bold text-xs text-slate-700">
                    {contractor.name}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">{contractor.contactPerson}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        contractor.status === 'Active'
                          ? 'default'
                          : 'destructive'
                      }
                      className="text-[10px] font-bold rounded-sm h-5"
                    >
                      {contractor.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-sm opacity-0 group-hover:opacity-100">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-sm">
                        <DropdownMenuLabel className="text-[10px] font-bold uppercase text-slate-400">Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild className="text-xs cursor-pointer">
                          <Link href={`/contractors/${contractor.id}/edit`}>
                            Edit Profile
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedContractor(contractor);
                            setShowDeleteDialog(true);
                          }}
                          className="text-xs text-destructive cursor-pointer"
                        >
                          Remove Contractor
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
        <AlertDialogContent className="rounded-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This action cannot be undone. This will permanently delete the
              contractor <strong>{selectedContractor?.name}</strong> and all their associated assignment data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-sm text-xs h-8">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-sm text-xs h-8"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
