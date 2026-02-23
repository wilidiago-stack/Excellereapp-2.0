
'use client';

import React from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { SafetyEventForm } from '@/components/safety-event-form';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ShieldAlert, FileEdit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditSafetyEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const firestore = useFirestore();

  const eventDocRef = useMemoFirebase(
    () => (firestore && id ? doc(firestore, 'safetyEvents', id) : null),
    [firestore, id]
  );
  const { data: event, isLoading } = useDoc(eventDocRef);

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] gap-2">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-8 w-8 rounded-sm" asChild>
          <Link href="/safety-events">
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">Update Safety Record</h1>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">HSE Modification Control</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-2 flex-1 min-h-0">
        <Card className="w-full md:w-72 shrink-0 rounded-sm border-slate-200 shadow-sm flex flex-col bg-slate-50/30">
          <CardHeader className="p-4 border-b bg-white">
            <CardTitle className="text-xs font-bold uppercase flex items-center gap-2">
              <FileEdit className="h-3.5 w-3.5 text-[#46a395]" /> Record Info
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="p-3 bg-white rounded-sm border border-slate-100 shadow-sm">
              <h4 className="text-[10px] font-bold text-slate-700 uppercase mb-1">Traceability</h4>
              <p className="text-[9px] text-slate-500 leading-relaxed">
                All changes to safety records are logged. Ensure corrective actions are properly documented.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1 overflow-hidden flex flex-col rounded-sm border-slate-200 shadow-sm">
          <div className="flex-1 overflow-y-auto no-scrollbar p-6">
            <div className="max-w-3xl mx-auto">
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-40 w-full" />
                </div>
              ) : event ? (
                <SafetyEventForm initialData={{ ...event, id }} />
              ) : (
                <div className="text-center py-10 text-slate-500">Record not found.</div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
