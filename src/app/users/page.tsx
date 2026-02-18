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
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, PlusCircle, Users, Search, Filter, ShieldCheck, UserClock } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useAuth } from '@/firebase';
import { collection, doc, deleteDoc } from 'firebase/firestore';
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
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

export default function UsersPage() {
  const { user } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const usersCollection = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'users') : null),
    [firestore, user?.uid]
  );
  const { data: users, isLoading: usersLoading } = useCollection(usersCollection);

  const filteredUsers = users?.filter(u => 
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleDeleteUser = async () => {
    if (!firestore || !selectedUser) return;
    const userDocRef = doc(firestore, 'users', selectedUser.id);

    deleteDoc(userDocRef)
      .then(() => {
        toast({
          title: 'User Deleted',
          description: `User ${selectedUser.firstName} has been successfully deleted.`,
        });
        setShowDeleteDialog(false);
        setSelectedUser(null);
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: userDocRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
        setShowDeleteDialog(false);
        setSelectedUser(null);
      });
  };

  const getStatusVariant = (status?: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'pending': return 'secondary';
      case 'invited': return 'outline';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  const stats = {
    total: users?.length || 0,
    active: users?.filter(u => u.status === 'active').length || 0,
    pending: users?.filter(u => u.status === 'pending').length || 0,
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] gap-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">User Management</h1>
          <p className="text-xs text-muted-foreground">Administer system access, roles, and permissions.</p>
        </div>
        <Button asChild size="sm" className="h-8 rounded-sm gap-2">
          <Link href="/users/new">
            <PlusCircle className="h-3.5 w-3.5" />
            Create User
          </Link>
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-2 flex-1 min-h-0">
        {/* Sidebar: Stats & Filter */}
        <Card className="w-full md:w-72 shrink-0 rounded-sm border-slate-200 shadow-sm flex flex-col">
          <CardHeader className="p-4 border-b bg-slate-50/50">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input 
                placeholder="Search users..." 
                className="pl-8 h-9 bg-white border-slate-200 text-xs" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-4 flex-1 overflow-y-auto no-scrollbar space-y-4">
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">System Overview</h4>
              <div className="grid grid-cols-1 gap-2">
                <div className="p-3 rounded-sm border border-slate-100 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium">Total Accounts</span>
                  </div>
                  <span className="text-xs font-bold">{stats.total}</span>
                </div>
                <div className="p-3 rounded-sm border border-slate-100 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#46a395]" />
                    <span className="text-xs font-medium">Active Now</span>
                  </div>
                  <span className="text-xs font-bold">{stats.active}</span>
                </div>
                <div className="p-3 rounded-sm border border-slate-100 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserClock className="h-3.5 w-3.5 text-orange-500" />
                    <span className="text-xs font-medium">Pending Review</span>
                  </div>
                  <span className="text-xs font-bold">{stats.pending}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Quick Filters</h4>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="text-[9px] rounded-sm cursor-pointer hover:bg-slate-100">Admins</Badge>
                <Badge variant="outline" className="text-[9px] rounded-sm cursor-pointer hover:bg-slate-100">Managers</Badge>
                <Badge variant="outline" className="text-[9px] rounded-sm cursor-pointer hover:bg-slate-100">Viewers</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content: User Table */}
        <Card className="flex-1 overflow-hidden flex flex-col rounded-sm border-slate-200 shadow-sm">
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <Table>
              <TableHeader className="bg-slate-50/50 sticky top-0 z-10">
                <TableRow className="hover:bg-transparent border-b-slate-200">
                  <TableHead className="text-[11px] font-bold h-10">Full Name</TableHead>
                  <TableHead className="text-[11px] font-bold h-10">Email Address</TableHead>
                  <TableHead className="text-[11px] font-bold h-10">Role</TableHead>
                  <TableHead className="text-[11px] font-bold h-10 text-center">Status</TableHead>
                  <TableHead className="h-10 w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersLoading ? (
                  [1, 2, 3, 4, 5].map(i => (
                    <TableRow key={i}>
                      <TableCell colSpan={5}><Skeleton className="h-10 w-full rounded-sm" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-xs text-slate-500">
                      No users found matching your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((u: any) => (
                    <TableRow key={u.id} className="hover:bg-slate-50/50 border-b-slate-100 group">
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-2">
                          <div className={`h-1.5 w-1.5 rounded-full ${u.status === 'active' ? 'bg-[#46a395]' : 'bg-slate-300'}`} />
                          <span className="text-xs font-semibold">{u.firstName} {u.lastName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-slate-500">{u.email}</TableCell>
                      <TableCell className="py-2.5">
                        <Badge variant="outline" className="text-[9px] uppercase tracking-tighter bg-white rounded-sm">{u.role}</Badge>
                      </TableCell>
                      <TableCell className="py-2.5 text-center">
                        <Badge variant={getStatusVariant(u.status)} className="text-[9px] rounded-sm h-5">
                          {u.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm opacity-0 group-hover:opacity-100">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-sm">
                            <DropdownMenuLabel className="text-[10px]">Actions</DropdownMenuLabel>
                            <DropdownMenuItem asChild className="text-xs cursor-pointer">
                              <Link href={`/users/${u.id}/edit`}>Edit Profile</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => { setSelectedUser(u); setShowDeleteDialog(true); }}
                              className="text-xs text-destructive cursor-pointer"
                            >
                              Delete Account
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Permanent Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to delete <strong>{selectedUser?.firstName} {selectedUser?.lastName}</strong>? This will remove all their system access immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-sm text-xs h-8">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-sm text-xs h-8">
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
