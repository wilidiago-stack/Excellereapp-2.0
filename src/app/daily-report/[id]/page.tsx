'use client';

import React from 'react';
import { useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  FileEdit, 
  CloudSun, 
  ShieldCheck, 
  Clock, 
  MapPin, 
  ClipboardList, 
  Wind, 
  Thermometer, 
  Droplets,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  Users as UsersIcon,
  Printer,
  FileDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ViewDailyReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const firestore = useFirestore();

  const reportDocRef = useMemoFirebase(
    () => (firestore && id ? doc(firestore, 'dailyReports', id) : null),
    [firestore, id]
  );
  const { data: report, isLoading: reportLoading } = useDoc(reportDocRef);

  const projectsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'projects') : null),
    [firestore]
  );
  const { data: projects, isLoading: projectsLoading } = useCollection(projectsCollection);

  const contractorsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'contractors') : null),
    [firestore]
  );
  const { data: contractors, isLoading: contractorsLoading } = useCollection(contractorsCollection);

  const project = projects?.find(p => p.id === report?.projectId);
  const getContractorName = (cId: string) => contractors?.find(c => c.id === cId)?.name || 'Unknown Contractor';

  const formatReportDate = (dateVal: any) => {
    if (!dateVal) return 'N/A';
    try {
      if (dateVal.toDate) return format(dateVal.toDate(), 'PPPP');
      if (dateVal instanceof Date) return format(dateVal, 'PPPP');
      if (typeof dateVal === 'string') return format(parseISO(dateVal), 'PPPP');
      return 'Invalid Date';
    } catch (e) {
      return 'N/A';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const isLoading = reportLoading || projectsLoading || contractorsLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col h-full gap-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!report) {
    return <div className="p-10 text-center text-slate-500">Daily report not found or record deleted.</div>;
  }

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-500">
      <style jsx global>{`
        @media print {
          header, aside, .no-print, button, .print-hidden {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
          }
          .flex-col {
            display: block !important;
          }
          .grid {
            display: block !important;
          }
          .card {
            border: 1px solid #e2e8f0 !important;
            margin-bottom: 20px !important;
            break-inside: avoid;
          }
          body {
            background: white !important;
          }
        }
      `}</style>

      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-sm" asChild>
            <Link href="/daily-report">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-800">
              Report: {formatReportDate(report.date)}
            </h1>
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-2">
              <span>Shift: {report.shift || 'N/A'}</span>
              <span className="text-slate-300">|</span>
              <span>Author: {report.username || 'N/A'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handlePrint} variant="outline" className="h-9 rounded-sm gap-2">
            <Printer className="h-4 w-4" /> Download PDF
          </Button>
          <Button asChild className="h-9 rounded-sm gap-2 bg-[#46a395] hover:bg-[#3d8c7f]">
            <Link href={`/daily-report/${id}/edit`}>
              <FileEdit className="h-4 w-4" /> Edit Report
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 print-content">
        {/* Project & Weather Summary */}
        <Card className="rounded-sm border-slate-200 shadow-sm overflow-hidden lg:col-span-2 card">
          <CardHeader className="p-4 border-b bg-slate-50/50 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase flex items-center gap-2">
              <ClipboardList className="h-3.5 w-3.5 text-primary" /> Project Context
            </CardTitle>
            <Badge variant="outline" className="rounded-sm text-[9px] font-black uppercase">{project?.name || 'Loading Project...'}</Badge>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-sm bg-blue-50 flex items-center justify-center text-blue-500">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Site Location</div>
                  <div className="text-sm font-bold text-slate-700">{report.weather?.city || 'Not specified'}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-sm bg-orange-50 flex items-center justify-center text-orange-500">
                  <CloudSun className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Sky Conditions</div>
                  <div className="text-sm font-bold text-slate-700">{report.weather?.conditions || 'N/A'}</div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-4 rounded-sm border border-slate-100">
              <div className="text-center">
                <Thermometer className="h-4 w-4 mx-auto mb-1 text-slate-400" />
                <div className="text-[9px] font-bold text-slate-400 uppercase">High/Low</div>
                <div className="text-xs font-black">{report.weather?.highTemp || 0}° / {report.weather?.lowTemp || 0}°</div>
              </div>
              <div className="text-center border-x border-slate-200 px-2">
                <Wind className="h-4 w-4 mx-auto mb-1 text-slate-400" />
                <div className="text-[9px] font-bold text-slate-400 uppercase">Wind</div>
                <div className="text-xs font-black">{report.weather?.wind || 0} mph</div>
              </div>
              <div className="text-center">
                <Droplets className="h-4 w-4 mx-auto mb-1 text-slate-400" />
                <div className="text-[9px] font-bold text-slate-400 uppercase">Humidity</div>
                <div className="text-xs font-black">N/A</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Safety Stats */}
        <Card className="rounded-sm border-slate-200 shadow-sm flex flex-col card">
          <CardHeader className="p-4 border-b bg-slate-50/50">
            <CardTitle className="text-xs font-bold uppercase flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-[#46a395]" /> HSE Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex-1">
            <div className="space-y-2">
              {Object.entries(report.safetyStats || {}).map(([key, val]: any) => (
                <div key={key} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                  <span className="text-[10px] font-medium text-slate-500 uppercase tracking-tight">
                    {key.replace(/([A-Z])/g, ' $1')}
                  </span>
                  <Badge variant={val > 0 && key.toLowerCase().includes('incident') ? 'destructive' : 'secondary'} className="h-5 rounded-sm text-[10px] font-bold min-w-[24px] justify-center">
                    {val || 0}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Activities & Permits */}
        <Card className="rounded-sm border-slate-200 shadow-sm lg:col-span-3 card">
          <CardHeader className="p-4 border-b bg-slate-50/50">
            <CardTitle className="text-xs font-bold uppercase flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-primary" /> Daily Activities & Compliance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/30">
                <TableRow className="h-10 hover:bg-transparent border-b-slate-200">
                  <TableHead className="text-[10px] font-bold uppercase px-6">Contractor</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Activity</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Location</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Permits Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.dailyActivities?.length > 0 ? (
                  report.dailyActivities.map((act: any, i: number) => (
                    <TableRow key={i} className="hover:bg-slate-50/20 border-b-slate-100">
                      <TableCell className="py-4 px-6 font-bold text-xs text-slate-700">{getContractorName(act.contractorId)}</TableCell>
                      <TableCell className="py-4 text-xs text-slate-600">{act.activity || 'N/A'}</TableCell>
                      <TableCell className="py-4 text-xs text-slate-500 font-medium">{act.location || 'N/A'}</TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-wrap gap-1">
                          {act.permits?.map((p: string) => (
                            <Badge key={p} variant="outline" className="text-[9px] h-4 rounded-sm bg-slate-50 text-slate-500">{p}</Badge>
                          ))}
                          {(!act.permits || act.permits.length === 0) && <span className="text-[10px] text-slate-300 italic">None</span>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={4} className="h-24 text-center text-xs text-slate-400">No activities registered.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Man Hours */}
        <Card className="rounded-sm border-slate-200 shadow-sm lg:col-span-2 card">
          <CardHeader className="p-4 border-b bg-slate-50/50">
            <CardTitle className="text-xs font-bold uppercase flex items-center gap-2">
              <UsersIcon className="h-3.5 w-3.5 text-[#46a395]" /> Labor Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="h-10 hover:bg-transparent">
                  <TableHead className="text-[10px] font-bold uppercase px-6">Contractor</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-center w-24">Headcount</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-center w-24">Hrs/Man</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-center w-24">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.manHours?.length > 0 ? report.manHours.map((mh: any, i: number) => (
                  <TableRow key={i} className="hover:bg-slate-50/20">
                    <TableCell className="py-3 px-6 text-xs font-semibold">{getContractorName(mh.contractorId)}</TableCell>
                    <TableCell className="py-3 text-xs text-center font-bold text-slate-500">{mh.headcount || 0}</TableCell>
                    <TableCell className="py-3 text-xs text-center font-bold text-slate-500">{mh.hours || 0}</TableCell>
                    <TableCell className="py-3 text-xs text-center font-black text-slate-700">{((mh.headcount || 0) * (mh.hours || 0)).toFixed(1)}h</TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={4} className="h-24 text-center text-xs text-slate-400">No labor records registered.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Observations */}
        <Card className="rounded-sm border-slate-200 shadow-sm card">
          <CardHeader className="p-4 border-b bg-slate-50/50">
            <CardTitle className="text-xs font-bold uppercase flex items-center gap-2">
              <Paperclip className="h-3.5 w-3.5 text-orange-400" /> Observations
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-4">
              {report.notes?.map((n: any, i: number) => (
                <div key={i} className="p-3 bg-slate-50 rounded-sm border border-slate-100 shadow-sm relative group">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={n.status === 'open' ? 'default' : 'secondary'} className="text-[8px] h-4 rounded-sm uppercase">{n.status || 'open'}</Badge>
                    {n.status === 'closed' ? <CheckCircle2 className="h-3 w-3 text-[#46a395]" /> : <AlertCircle className="h-3 w-3 text-orange-400" />}
                  </div>
                  <p className="text-xs text-slate-600 italic leading-relaxed">{n.note || 'No comment provided.'}</p>
                </div>
              ))}
              {(!report.notes || report.notes.length === 0) && (
                <div className="py-10 text-center text-xs text-slate-400">No field observations noted.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
