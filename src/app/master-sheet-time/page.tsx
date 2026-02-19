
'use client';

import { useState, useMemo } from 'react';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  addWeeks, 
  subWeeks, 
  startOfDay,
  getISOWeek
} from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Sheet as SheetIcon, 
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  Clock3,
  Loader2
} from 'lucide-react';
import { useFirestore, useCollection, useAuth, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function MasterSheetTimePage() {
  const { user: currentUser, role, loading: authLoading } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Stabilize dates for query dependencies to prevent infinite calculation loops
  const startOfPeriod = useMemo(() => startOfDay(currentWeekStart), [currentWeekStart]);
  const endOfPeriod = useMemo(() => endOfWeek(currentWeekStart, { weekStartsOn: 1 }), [currentWeekStart]);

  const weekDays = useMemo(() => {
    return eachDayOfInterval({ start: startOfPeriod, end: endOfPeriod });
  }, [startOfPeriod, endOfPeriod]);

  const weekId = useMemo(() => `${format(currentWeekStart, 'yyyy')}-${getISOWeek(currentWeekStart)}`, [currentWeekStart]);

  const isReady = !authLoading && role === 'admin';

  const usersCollection = useMemoFirebase(() => (firestore && isReady ? collection(firestore, 'users') : null), [firestore, isReady]);
  const { data: allUsers, isLoading: usersLoading } = useCollection(usersCollection);

  const entriesQuery = useMemoFirebase(() => {
    if (!firestore || !isReady) return null;
    return query(
      collection(firestore, 'time_entries'),
      where('date', '>=', startOfPeriod),
      where('date', '<=', endOfPeriod),
      orderBy('date', 'asc')
    );
  }, [firestore, isReady, startOfPeriod, endOfPeriod]);

  const { data: entries, isLoading: entriesLoading } = useCollection(entriesQuery);

  const submissionsQuery = useMemoFirebase(() => {
    if (!firestore || !isReady) return null;
    return query(
      collection(firestore, 'weekly_submissions'),
      where('weekId', '==', weekId)
    );
  }, [firestore, weekId, isReady]);

  const { data: submissions } = useCollection(submissionsQuery);

  const submissionMap = useMemo(() => {
    const map: Record<string, any> = {};
    submissions?.forEach(s => { map[s.userId] = s; });
    return map;
  }, [submissions]);

  const processedData = useMemo(() => {
    const userHours: Record<string, Record<string, number>> = {};
    const userSet = new Set<string>();
    entries?.forEach(e => {
      const uId = e.userId;
      const d = e.date?.toDate ? e.date.toDate() : new Date(e.date);
      const dateKey = format(d, 'yyyy-MM-dd');
      const hours = parseFloat(e.hours.toString()) || 0;
      if (hours > 0) {
        if (!userHours[uId]) userHours[uId] = {};
        userHours[uId][dateKey] = (userHours[uId][dateKey] || 0) + hours;
        userSet.add(uId);
      }
    });
    return { userHours, activeUserIds: Array.from(userSet) };
  }, [entries]);

  const activeUsers = useMemo(() => {
    if (!allUsers) return [];
    return allUsers.filter(u => processedData.activeUserIds.includes(u.id));
  }, [allUsers, processedData.activeUserIds]);

  const totalTeamHours = weekDays.reduce((acc, day) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    return acc + processedData.activeUserIds.reduce((sum, uId) => sum + (processedData.userHours[uId]?.[dateKey] || 0), 0);
  }, 0);

  const handleApproveWeek = async (userId: string) => {
    if (!firestore || role !== 'admin') return;
    setApprovingId(userId);
    const submissionDocId = `${userId}_${weekId}`;
    const subRef = doc(firestore, 'weekly_submissions', submissionDocId);
    const data = { status: 'approved', approvedAt: serverTimestamp(), approvedBy: currentUser?.uid, userId, weekId };
    setDoc(subRef, data, { merge: true })
      .then(() => {
        setApprovingId(null);
        toast({ title: "Approved", description: "The week has been approved." });
      })
      .catch(err => {
        setApprovingId(null);
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: subRef.path, operation: 'write', requestResourceData: data }));
      });
  };

  const initialLoad = authLoading || (isReady && !allUsers && usersLoading);

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] gap-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">Master Sheet Time</h1>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest text-[#46a395]">Team Performance & Approvals</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 rounded-sm" onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-sm border border-slate-200">
            <CalendarIcon className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-xs font-bold text-slate-700">
              {format(currentWeekStart, 'dd MMM')} - {format(endOfPeriod, 'dd MMM, yyyy')}
            </span>
          </div>
          <Button variant="outline" size="sm" className="h-8 rounded-sm" onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-2 flex-1 min-h-0">
        <Card className="w-full md:w-72 shrink-0 rounded-sm border-slate-200 shadow-sm flex flex-col">
          <CardHeader className="p-4 border-b bg-slate-50/50">
            <CardTitle className="text-xs font-bold uppercase flex items-center gap-2 text-slate-600">
              <SheetIcon className="h-3.5 w-3.5 text-[#46a395]" /> Team Control
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex-1 overflow-y-auto no-scrollbar space-y-6">
            <div className="space-y-3">
              <div className="p-4 bg-white rounded-sm border border-slate-100 shadow-sm text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Team Hours</p>
                <p className="text-3xl font-black text-[#46a395]">{totalTeamHours.toFixed(1)}h</p>
              </div>
              <div className="p-3 rounded-sm border border-slate-100 bg-slate-50 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-slate-500">Active Contributors</span>
                <span className="text-xs font-bold">{activeUsers.length}</span>
              </div>
            </div>
            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Approval Status</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-medium">
                  <span className="flex items-center gap-1.5"><AlertCircle className="h-3 w-3 text-slate-400" /> Pending</span>
                  <span className="font-bold">{activeUsers.filter(u => !submissionMap[u.id] || submissionMap[u.id].status === 'draft').length}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-medium">
                  <span className="flex items-center gap-1.5"><Clock3 className="h-3 w-3 text-orange-400" /> Submitted</span>
                  <span className="font-bold">{activeUsers.filter(u => submissionMap[u.id]?.status === 'submitted').length}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-medium text-[#46a395]">
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" /> Approved</span>
                  <span className="font-bold">{activeUsers.filter(u => submissionMap[u.id]?.status === 'approved').length}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex-1 flex flex-col gap-2 min-w-0 overflow-hidden">
          <Card className="flex-1 overflow-hidden flex flex-col rounded-sm border-slate-200 shadow-sm">
            <div className="flex-1 overflow-x-auto no-scrollbar">
              <Table className="border-collapse">
                <TableHeader className="bg-slate-50/80 sticky top-0 z-20">
                  <TableRow className="hover:bg-transparent border-b-slate-200 h-14">
                    <TableHead className="text-[10px] font-black uppercase w-64 min-w-[200px] border-r px-4">Contributor</TableHead>
                    {weekDays.map((day, i) => (
                      <TableHead key={`head-${i}`} className="text-[10px] font-black uppercase text-center border-r min-w-[80px]">
                        <div className="flex flex-col"><span>{format(day, 'EEE')}</span><span className="text-slate-400">{format(day, 'dd')}</span></div>
                      </TableHead>
                    ))}
                    <TableHead className="text-[10px] font-black uppercase text-center w-24 border-r">Total</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-center w-32 bg-slate-100/50">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className={cn(entriesLoading && "opacity-50 transition-opacity")}>
                  {initialLoad ? (
                    [1, 2, 3, 4, 5].map(i => (
                      <TableRow key={`row-loading-${i}`}>
                        <TableCell className="border-r px-4"><Skeleton className="h-8 w-full" /></TableCell>
                        {weekDays.map((d, j) => <TableCell key={`cell-loading-${i}-${j}`} className="border-r p-2"><Skeleton className="h-10 w-full" /></TableCell>)}
                        <TableCell className="p-2 border-r"><Skeleton className="h-10 w-full" /></TableCell>
                        <TableCell className="p-2"><Skeleton className="h-10 w-full" /></TableCell>
                      </TableRow>
                    ))
                  ) : activeUsers.length === 0 ? (
                    <TableRow><TableCell colSpan={weekDays.length + 3} className="h-48 text-center text-xs text-slate-400 italic">No activity registered.</TableCell></TableRow>
                  ) : (
                    activeUsers.map(u => {
                      const userSubmission = submissionMap[u.id];
                      const status = userSubmission?.status || 'draft';
                      const userTotal = weekDays.reduce((acc, day) => acc + (processedData.userHours[u.id]?.[format(day, 'yyyy-MM-dd')] || 0), 0);
                      const isApproving = approvingId === u.id;
                      return (
                        <TableRow key={u.id} className="hover:bg-slate-50/30 border-b-slate-100 group transition-colors">
                          <TableCell className="py-3 px-4 border-r">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0">
                                <span className="text-[10px] font-bold text-slate-500">{u.firstName?.charAt(0)}{u.lastName?.charAt(0)}</span>
                              </div>
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-700 truncate">{u.firstName} {u.lastName}</span>
                                  {status === 'approved' && <CheckCircle2 className="h-3 w-3 text-[#46a395]" />}
                                </div>
                                <span className="text-[9px] text-slate-400 uppercase font-medium">{u.role}</span>
                              </div>
                            </div>
                          </TableCell>
                          {weekDays.map((day, i) => {
                            const hours = processedData.userHours[u.id]?.[format(day, 'yyyy-MM-dd')] || 0;
                            return (
                              <TableCell key={`${u.id}-${i}`} className={cn("text-center text-xs font-bold border-r", hours > 0 ? "text-slate-600" : "text-slate-200")}>
                                {hours > 0 ? hours.toFixed(1) : '-'}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-center font-black text-xs text-slate-700 border-r">{userTotal.toFixed(1)}h</TableCell>
                          <TableCell className="py-2.5 px-2 bg-slate-50/20">
                            {status === 'submitted' ? (
                              <Button size="sm" className="w-full h-8 text-[9px] font-bold uppercase tracking-wider bg-orange-500" onClick={() => handleApproveWeek(u.id)} disabled={isApproving}>
                                {isApproving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Approve"}
                              </Button>
                            ) : status === 'approved' ? (
                              <Badge className="w-full justify-center h-8 text-[9px] font-bold uppercase rounded-sm bg-green-100 text-green-700">Approved</Badge>
                            ) : (
                              <Badge variant="outline" className="w-full justify-center h-8 text-[9px] font-bold uppercase rounded-sm text-slate-400">Draft</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
