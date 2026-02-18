'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  MoreHorizontal, 
  PlusCircle, 
  Users, 
  Search, 
  ShieldCheck, 
  Clock, 
  Mail, 
  Phone, 
  Briefcase, 
  Shield, 
  Activity, 
  User as UserIcon,
  ChevronRight,
  ExternalLink,
  Edit,
  Trash2,
  Settings
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useAuth } from '@/firebase';
import { collection, doc, deleteDoc } from 'firebase/firestore';
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
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const usersCollection = useMemoFirebase(
    () => (firestore && currentUser ? collection(firestore, 'users') : null),
    [firestore, currentUser?.uid]
  );
  const { data: users, isLoading: usersLoading } = useCollection(usersCollection);

  const filteredUsers = users?.filter(u => 
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Sync selectedUser if users list updates
  useEffect(() => {
    if (selectedUser && users) {
      const updated = users.find(u => u.id === selectedUser.id);
      if (updated) setSelectedUser(updated);
    }
  }, [users, selectedUser]);

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
          <p className="text-xs text-muted-foreground text-pretty">Administer system access, roles, and detailed permissions.</p>
        </div>
        <Button asChild size="sm" className="h-8 rounded-sm gap-2">
          <Link href="/users/new">
            <PlusCircle className="h-3.5 w-3.5" />
            Create User
          </Link>
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-2 flex-1 min-h-0">
        {/* Sidebar: User Selector & Search */}
        <Card className="w-full md:w-80 shrink-0 rounded-sm border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <CardHeader className="p-4 border-b bg-slate-50/50 space-y-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input 
                placeholder="Find users..." 
                className="pl-8 h-9 bg-white border-slate-200 text-xs" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span>Directory</span>
              <div className="flex gap-2">
                <span className="flex items-center gap-1"><div className="h-1.5 w-1.5 rounded-full bg-[#46a395]"/> {stats.active}</span>
                <span className="flex items-center gap-1"><div className="h-1.5 w-1.5 rounded-full bg-orange-400"/> {stats.pending}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto no-scrollbar bg-slate-50/30">
            {usersLoading ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-12 w-full rounded-sm" />)}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4 opacity-50">
                <Users className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-xs font-medium text-slate-500">No users found</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredUsers.map((u: any) => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className={`w-full text-left p-3 transition-all flex items-center gap-3 group relative ${
                      selectedUser?.id === u.id 
                      ? 'bg-white shadow-sm ring-1 ring-inset ring-primary/20 z-10' 
                      : 'hover:bg-white hover:shadow-sm'
                    }`}
                  >
                    <Avatar className="h-8 w-8 rounded-sm shrink-0 border border-slate-200">
                      <AvatarFallback className="text-[10px] font-bold bg-slate-100 text-slate-600 rounded-sm">
                        {u.firstName?.charAt(0)}{u.lastName?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-[11px] font-bold truncate ${selectedUser?.id === u.id ? 'text-primary' : 'text-slate-700'}`}>
                          {u.firstName} {u.lastName}
                        </span>
                        <div className={`h-1.5 w-1.5 rounded-full ${u.status === 'active' ? 'bg-[#46a395]' : 'bg-orange-400'}`} />
                      </div>
                      <p className="text-[10px] text-slate-500 truncate">{u.email}</p>
                    </div>
                    {selectedUser?.id === u.id && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Content: User Detailed View */}
        <div className="flex-1 min-w-0 overflow-y-auto no-scrollbar">
          {!selectedUser ? (
            <Card className="h-full rounded-sm border-slate-200 shadow-sm border-dashed flex flex-col items-center justify-center text-center p-8 bg-slate-50/20">
              <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <ShieldCheck className="h-8 w-8 text-slate-300" />
              </div>
              <h3 className="text-sm font-bold text-slate-700 mb-1">System Administration</h3>
              <p className="text-[11px] text-slate-500 max-w-xs text-balance">
                Select a user from the directory to view their full profile, managed modules, and system permissions.
              </p>
              <div className="grid grid-cols-3 gap-4 mt-8 w-full max-w-sm">
                <div className="p-3 bg-white rounded-sm border border-slate-200 shadow-sm">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Total</p>
                  <p className="text-xl font-bold text-slate-700">{stats.total}</p>
                </div>
                <div className="p-3 bg-white rounded-sm border border-slate-200 shadow-sm">
                  <p className="text-[10px] text-[#46a395] font-bold uppercase mb-1">Active</p>
                  <p className="text-xl font-bold text-[#46a395]">{stats.active}</p>
                </div>
                <div className="p-3 bg-white rounded-sm border border-slate-200 shadow-sm">
                  <p className="text-[10px] text-orange-400 font-bold uppercase mb-1">Review</p>
                  <p className="text-xl font-bold text-orange-400">{stats.pending}</p>
                </div>
              </div>
            </Card>
          ) : (
            <div className="space-y-2 animate-in fade-in slide-in-from-right-2 duration-300">
              {/* Header Profile Card */}
              <Card className="rounded-sm border-slate-200 shadow-sm overflow-hidden">
                <div className="h-24 bg-slate-100 relative">
                   <div className="absolute bottom-0 left-6 translate-y-1/2 p-1 bg-white rounded-sm shadow-md border border-slate-200">
                      <Avatar className="h-20 w-24 rounded-sm">
                        <AvatarFallback className="text-2xl font-black bg-primary text-white rounded-sm">
                          {selectedUser.firstName?.charAt(0)}{selectedUser.lastName?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                   </div>
                   <div className="absolute top-4 right-4 flex gap-2">
                      <Button variant="outline" size="sm" className="h-8 bg-white/80 backdrop-blur-sm rounded-sm gap-2" asChild>
                        <Link href={`/users/${selectedUser.id}/edit`}>
                          <Edit className="h-3.5 w-3.5" /> Edit Profile
                        </Link>
                      </Button>
                      <Button variant="destructive" size="icon" className="h-8 w-8 rounded-sm" onClick={() => setShowDeleteDialog(true)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                   </div>
                </div>
                <CardContent className="pt-14 pb-6 px-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                      <h2 className="text-2xl font-black tracking-tighter text-slate-800">
                        {selectedUser.firstName} {selectedUser.lastName}
                      </h2>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-tight rounded-sm bg-slate-50">
                          {selectedUser.role}
                        </Badge>
                        <Badge variant={getStatusVariant(selectedUser.status)} className="text-[10px] font-bold uppercase tracking-tight rounded-sm">
                          {selectedUser.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-slate-500">
                       <div className="flex flex-col items-end">
                          <p className="text-[9px] font-bold uppercase text-slate-400">System ID</p>
                          <p className="text-[10px] font-mono">{selectedUser.id.substring(0, 8)}...</p>
                       </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
                {/* Details Section */}
                <Card className="rounded-sm border-slate-200 shadow-sm lg:col-span-2">
                  <CardHeader className="p-4 border-b bg-slate-50/50">
                    <CardTitle className="text-xs font-bold uppercase flex items-center gap-2">
                      <UserIcon className="h-3.5 w-3.5 text-primary" /> Profile Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1.5">
                          <Mail className="h-3 w-3" /> Email Address
                        </label>
                        <p className="text-sm font-medium text-slate-700">{selectedUser.email}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1.5">
                          <Phone className="h-3 w-3" /> Phone Number
                        </label>
                        <p className="text-sm font-medium text-slate-700">{selectedUser.phoneNumber || 'Not provided'}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1.5">
                          <Briefcase className="h-3 w-3" /> Company
                        </label>
                        <p className="text-sm font-medium text-slate-700">{selectedUser.company || 'External / Individual'}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1.5">
                          <Activity className="h-3 w-3" /> Position
                        </label>
                        <p className="text-sm font-medium text-slate-700">{selectedUser.position || 'Not specified'}</p>
                      </div>
                    </div>

                    <Separator className="my-6" />

                    <div className="space-y-4">
                      <label className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1.5">
                        <Shield className="h-3 w-3" /> Assigned Modules
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedUser.assignedModules && selectedUser.assignedModules.length > 0 ? (
                          selectedUser.assignedModules.map((m: string) => (
                            <Badge key={m} variant="secondary" className="text-[10px] font-semibold bg-slate-100 text-slate-600 border-slate-200 rounded-sm px-2 py-0.5">
                              {m.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-xs text-slate-400 italic">No modules assigned to this user.</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Sidebar Context Card */}
                <Card className="rounded-sm border-slate-200 shadow-sm h-fit">
                  <CardHeader className="p-4 border-b bg-slate-50/50">
                    <CardTitle className="text-xs font-bold uppercase flex items-center gap-2">
                      <Settings className="h-3.5 w-3.5 text-primary" /> Account Metadata
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <div className="p-3 bg-slate-50 rounded-sm border border-slate-100 flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Role Level</span>
                      <div className="flex items-center gap-2">
                        <ShieldCheck className={`h-4 w-4 ${selectedUser.role === 'admin' ? 'text-[#46a395]' : 'text-slate-400'}`} />
                        <span className="text-xs font-bold text-slate-700 capitalize">{selectedUser.role}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-3 pt-2">
                      <h4 className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Interface Settings</h4>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-600 font-medium">Pinned Shortcuts</span>
                        <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded-sm">{selectedUser.pinnedShortcuts?.length || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-600 font-medium">Auto-Lock Session</span>
                        <span className="text-[10px] text-slate-400">Enabled</span>
                      </div>
                    </div>

                    <Button variant="link" className="w-full text-[10px] h-auto p-0 text-primary justify-start gap-1" asChild>
                      <Link href="#">
                        <ExternalLink className="h-2.5 w-2.5" /> View access logs
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Permanent Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This action will immediately revoke all access for <strong>{selectedUser?.firstName} {selectedUser?.lastName}</strong>. This record cannot be recovered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-sm text-xs h-8">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-sm text-xs h-8">
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
