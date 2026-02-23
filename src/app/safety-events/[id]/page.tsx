
'use client';

import React from 'react';
import { useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { format } from 'date-fns';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  ShieldAlert, 
  AlertTriangle, 
  ClipboardCheck, 
  User, 
  MapPin, 
  Calendar as CalendarIcon,
  FileEdit,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function ViewSafetyEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const firestore = useFirestore();

  const eventDocRef = useMemoFirebase(
    () => (firestore && id ? doc(firestore, 'safetyEvents', id) : null),
    [firestore, id]
  );
  const { data: event, isLoading: eventLoading } = useDoc(eventDocRef);

  const projectsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'projects') : null),
    [firestore]
  );
  const { data: projects } = useCollection(projectsCollection);

  const project = projects?.find(p => p.id === event?.projectId);

  if (eventLoading) {
    return <div className="p-6 space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!event) return <div className="p-10 text-center text-slate-500">Safety event not found.</div>;

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'Critical': return <Badge className="bg-red-500 font-bold px-3 py-1 rounded-sm uppercase">{severity}</Badge>;
      case 'High': return <Badge className="bg-orange-500 font-bold px-3 py-1 rounded-sm uppercase">{severity}</Badge>;
      case 'Medium': return <Badge className="bg-yellow-500 text-black font-bold px-3 py-1 rounded-sm uppercase">{severity}</Badge>;
      default: return <Badge variant="outline" className="font-bold px-3 py-1 rounded-sm uppercase">{severity}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-sm" asChild>
            <Link href="/safety-events"><ChevronLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-800">
              Safety Record: {event.type}
            </h1>
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-2">
              <span>Status: {event.status}</span>
              <span className="text-slate-300">|</span>
              <span>Ref: {id.substring(0, 8)}</span>
            </div>
          </div>
        </div>
        <Button asChild className="h-9 rounded-sm gap-2 bg-[#46a395] hover:bg-[#3d8c7f]">
          <Link href={`/safety-events/${id}/edit`}>
            <FileEdit className="h-4 w-4" /> Edit Record
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card className="rounded-sm border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="p-4 border-b bg-slate-50/50 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-primary" /> Event Description
              </CardTitle>
              {getSeverityBadge(event.severity)}
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <p className="text-sm text-slate-700 leading-relaxed font-medium bg-slate-50 p-4 rounded-sm border border-slate-100 border-l-4 border-l-primary italic">
                "{event.description}"
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-sm bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Exact Location</div>
                      <div className="text-xs font-bold text-slate-700">{event.location || 'Not specified'}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-sm bg-orange-50 flex items-center justify-center text-orange-500 shrink-0">
                      <CalendarIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Occurrence Date</div>
                      <div className="text-xs font-bold text-slate-700">
                        {event.date ? (event.date.toDate ? format(event.date.toDate(), 'PPP') : format(new Date(event.date), 'PPP')) : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-sm bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Registered By</div>
                      <div className="text-xs font-bold text-slate-700">{event.authorName || 'N/A'}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-sm bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Last Sync</div>
                      <div className="text-xs font-bold text-slate-700">
                        {event.updatedAt ? (event.updatedAt.toDate ? format(event.updatedAt.toDate(), 'Pp') : format(new Date(event.updatedAt), 'Pp')) : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-sm border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="p-4 border-b bg-green-50/30">
              <CardTitle className="text-xs font-bold uppercase flex items-center gap-2 text-green-700">
                <ClipboardCheck className="h-3.5 w-3.5" /> Remediation & Corrective Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-sm text-slate-600 leading-relaxed min-h-[100px]">
                {event.correctiveActions || 'No corrective actions registered for this event yet.'}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-sm border-slate-200 shadow-sm">
            <CardHeader className="p-4 border-b bg-slate-50/50">
              <CardTitle className="text-xs font-bold uppercase flex items-center gap-2">
                <ShieldAlert className="h-3.5 w-3.5 text-primary" /> Project Context
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="p-3 bg-slate-50 rounded-sm border border-slate-100">
                <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">Assigned Project</div>
                <div className="text-xs font-black text-slate-800">{project?.name || 'Loading project...'}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-sm border border-slate-100">
                <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">Company</div>
                <div className="text-xs font-bold text-slate-600">{project?.companyName || 'N/A'}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-sm border-slate-200 shadow-sm">
            <CardHeader className="p-4 border-b bg-slate-50/50">
              <CardTitle className="text-xs font-bold uppercase">Compliance Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Severity</span>
                  <span className="text-[10px] font-black">{event.severity}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Type</span>
                  <span className="text-[10px] font-black">{event.type}</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Current Status</span>
                  <Badge variant={event.status === 'Closed' ? 'secondary' : 'default'} className="h-5 text-[9px] rounded-sm font-black uppercase">{event.status}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
