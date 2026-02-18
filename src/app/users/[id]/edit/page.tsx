'use client';

import React from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { UserForm } from '@/components/user-form';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft, UserCog, History, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(
    () => (firestore && id ? doc(firestore, 'users', id) : null),
    [firestore, id]
  );
  const { data: userData, isLoading: loading } = useDoc(userDocRef);

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] gap-2">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-8 w-8 rounded-sm" asChild>
          <Link href="/users">
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">Edit User Profile</h1>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Update Account Permissions</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-2 flex-1 min-h-0">
        <Card className="w-full md:w-72 shrink-0 rounded-sm border-slate-200 shadow-sm flex flex-col bg-slate-50/30">
          <CardHeader className="p-4 border-b bg-white">
            <CardTitle className="text-xs font-bold uppercase flex items-center gap-2">
              <UserCog className="h-3.5 w-3.5 text-[#46a395]" /> Account Metadata
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-3">
              <div className="p-3 bg-white rounded-sm border border-slate-100 shadow-sm">
                <h4 className="text-[10px] font-bold text-slate-700 uppercase mb-1">Last Update</h4>
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <History className="h-3 w-3" />
                  <span>{loading ? '...' : 'System synced'}</span>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2 bg-orange-50 border border-orange-100 rounded-sm">
                <ShieldAlert className="h-3.5 w-3.5 text-orange-500 shrink-0 mt-0.5" />
                <p className="text-[9px] text-orange-700 leading-relaxed font-medium">
                  Changing roles or module visibility will immediately affect the user's active session.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1 overflow-hidden flex flex-col rounded-sm border-slate-200 shadow-sm">
          <div className="flex-1 overflow-y-auto no-scrollbar p-6">
            <div className="max-w-2xl mx-auto">
              {loading ? (
                <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-40 w-full" />
                </div>
              ) : userData ? (
                 <UserForm initialData={{ ...userData, id }} />
              ) : (
                <div className="text-center py-10">User not found.</div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
