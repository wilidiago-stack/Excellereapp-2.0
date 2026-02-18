
'use client';

import { TimeEntryForm } from '@/components/time-entry-form';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Timer, Info, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function NewTimeEntryPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-100px)] gap-2">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-8 w-8 rounded-sm" asChild>
          <Link href="/time-sheet">
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">Register Daily Hours</h1>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Master Sheet Time / Operations</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-2 flex-1 min-h-0">
        <Card className="w-full md:w-72 shrink-0 rounded-sm border-slate-200 shadow-sm flex flex-col bg-slate-50/30">
          <CardHeader className="p-4 border-b bg-white">
            <CardTitle className="text-xs font-bold uppercase flex items-center gap-2">
              <Timer className="h-3.5 w-3.5 text-[#46a395]" /> Entry Guide
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-3">
              <div className="p-3 bg-white rounded-sm border border-slate-100 shadow-sm">
                <h4 className="text-[10px] font-bold text-slate-700 uppercase mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3 text-[#46a395]" /> Accurate Tracking
                </h4>
                <p className="text-[9px] text-slate-500 leading-relaxed">
                  Log your hours as close to real-time as possible. Daily entries ensure precise project costing.
                </p>
              </div>
              <div className="p-3 bg-white rounded-sm border border-slate-100 shadow-sm">
                <h4 className="text-[10px] font-bold text-slate-700 uppercase mb-1 flex items-center gap-1.5">
                  <Info className="h-3 w-3 text-orange-400" /> Task Detail
                </h4>
                <p className="text-[9px] text-slate-500 leading-relaxed">
                  Provide a brief but clear summary of the activities performed. This is used for client reporting.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1 overflow-hidden flex flex-col rounded-sm border-slate-200 shadow-sm">
          <div className="flex-1 overflow-y-auto no-scrollbar p-6">
            <div className="max-w-2xl mx-auto">
              <TimeEntryForm />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
