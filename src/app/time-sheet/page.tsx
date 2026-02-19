
'use client';

import { useState, useMemo, useEffect } from 'react';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  addWeeks, 
  subWeeks, 
  startOfDay,
  parseISO,
  getISOWeek
} from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Calendar as CalendarIcon,
  PieChart,
  AlertCircle,
  Loader2,
  Send,
  Lock,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirestore, useCollection, useDoc, useAuth, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, setDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Badge } from '@/components/ui/badge';

export default function TimeSheetPage() {
  const { user, loading: authLoading, role } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [gridHours, setGridHours] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const weekDays = useMemo(() => {
    const end = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: currentWeekStart, end });
  }, [currentWeekStart]);

  const weekId = useMemo(() => `${format(currentWeekStart, 'yyyy')}-${getISOWeek(currentWeekStart)}`, [currentWeekStart]);
  const submissionId = useMemo(() => (user ? `${user.uid}_${weekId}` : null), [user, weekId]);

  const projectsCollection = useMemoFirebase(() => (firestore ? collection(firestore, 'projects') : null), [firestore]);
  const { data: projects, isLoading: projectsLoading } = useCollection(projectsCollection);

  const submissionRef = useMemoFirebase(() => (firestore && submissionId ? doc(firestore, 'weekly_submissions', submissionId) : null), [firestore, submissionId]);
  const { data: submissionData, isLoading: submissionLoading } = useDoc(submissionRef);

  const weekStatus = submissionData?.status || 'draft';
  const isLocked = weekStatus !== 'draft';

  const normalizeDateKey = (dateVal: any): string => {
    if (!dateVal) return '';
    try {
      let d: Date;
      if (dateVal.toDate && typeof dateVal.toDate === 'function') d = dateVal.toDate();
      else if (dateVal instanceof Date) d = dateVal;
      else if (typeof dateVal === 'string') d = parseISO(dateVal);
      else d = new Date(dateVal);
      return format(d, 'yyyy-MM-dd');
    } catch (e) {
      return '';
    }
  };

  const entriesQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid || authLoading || !role) return null;
    
    const baseRef = collection(firestore, 'time_entries');
    const start = startOfDay(currentWeekStart);
    const end = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
    
    return query(
      baseRef,
      where('userId', '==', user.uid),
      where('date', '>=', start),
      where('date', '<=', end),
      orderBy('date', 'asc')
    );
  }, [firestore, user?.uid, currentWeekStart, authLoading, role]);

  const { data: entries, isLoading: entriesLoading } = useCollection(entriesQuery);

  useEffect(() => {
    if (entriesLoading || !entries) return;

    const newHours: Record<string, string> = {};
    entries.forEach(e => {
      const dateKey = normalizeDateKey(e.date);
      if (dateKey) {
        newHours[`${e.projectId}_${dateKey}`] = e.hours.toString();
      }
    });
    setGridHours(newHours);
  }, [entries, entriesLoading]);

  const handleInputChange = (projectId: string, date: Date, value: string) => {
    if (isLocked) return;
    const dateKey = format(date, 'yyyy-MM-dd');
    const key = `${projectId}_${dateKey}`;
    setGridHours(prev => ({ ...prev, [key]: value }));
  };

  const handleCellBlur = async (projectId: string, date: Date, value: string) => {
    if (!firestore || !user?.uid || isLocked) return;
    
    const hours = value === '' || value === '0' ? 0 : parseFloat(value);
    if (isNaN(hours)) return;

    const dateKey = format(date, 'yyyy-MM-dd');
    const key = `${projectId}_${dateKey}`;
    
    const existingEntry = (entries || []).find(e => {
      return e.projectId === projectId && normalizeDateKey(e.date) === dateKey;
    });

    if (existingEntry && parseFloat(existingEntry.hours.toString()) === hours) return;
    if (!existingEntry && hours === 0) return;

    setIsSaving(key);
    
    const entryId = existingEntry?.id || `${user.uid}_${projectId}_${dateKey}`;
    const entryRef = doc(firestore, 'time_entries', entryId);

    const data = {
      userId: user.uid,
      projectId,
      date: startOfDay(date), 
      hours: hours,
      description: 'Logged via Weekly Sheet',
      updatedAt: serverTimestamp(),
      status: weekStatus
    };

    setDoc(entryRef, data, { merge: true })
      .then(() => {
        setIsSaving(null);
        toast({ title: "Saved", description: `${hours}h registered successfully.`, duration: 1500 });
      })
      .catch((err) => {
        setIsSaving(null);
        errorEmitter.emit('permission-error', new FirestorePermissionError({ 
          path: entryRef.path, 
          operation: 'write', 
          requestResourceData: data 
        }));
      });
  };

  const handleSubmitWeek = async () => {
    if (!firestore || !submissionRef || isLocked) return;
    setIsSubmitting(true);

    const data = {
      userId: user?.uid,
      weekId,
      status: 'submitted',
      submittedAt: serverTimestamp(),
      weekStart: startOfDay(currentWeekStart)
    };

    setDoc(submissionRef, data, { merge: true })
      .then(() => {
        setIsSubmitting(false);
        toast({ title: "Week Submitted", description: "Your hours have been sent for review." });
      })
      .catch(err => {
        setIsSubmitting(false);
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: submissionRef.path,
          operation: 'write',
          requestResourceData: data
        }));
      });
  };

  const calculateDayTotal = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    return (projects || []).reduce((acc, proj) => {
      const key = `${proj.id}_${dateKey}`;
      return acc + (parseFloat(gridHours[key]) || 0);
    }, 0);
  };

  const calculateProjectTotal = (projectId: string) => {
    return weekDays.reduce((acc, day) => {
      const key = `${projectId}_${format(day, 'yyyy-MM-dd')}`;
      return acc + (parseFloat(gridHours[key]) || 0);
    }, 0);
  };

  const totalWeekHours = weekDays.reduce((acc, day) => acc + calculateDayTotal(day), 0);
  const totalRegular = Math.min(totalWeekHours, 40);
  const totalOvertime = Math.max(0, totalWeekHours - 40);

  const initialLoading = authLoading || projectsLoading || !projects || submissionLoading;
  const isSyncing = entriesLoading;

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] gap-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">Time Sheet</h1>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest text-[#46a395]">Personal Activity Log</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 rounded-sm" onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 px-4 py-1 bg-slate-100 rounded-sm border border-slate-200">
            <CalendarIcon className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-xs font-black text-slate-700">
              {format(currentWeekStart, 'dd MMM')} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'dd MMM, yyyy')}
            </span>
          </div>
          <Button variant="outline" size="sm" className="h-8 rounded-sm" onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="sm" className="h-8 text-xs font-bold rounded-sm ml-2" onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
            Today
          </Button>
        </div>
      </div>

      {/* Week Status Banner */}
      <div className={cn(
        "p-2 px-4 rounded-sm flex items-center justify-between border shadow-sm transition-all",
        weekStatus === 'draft' ? "bg-slate-50 border-slate-200" :
        weekStatus === 'submitted' ? "bg-orange-50 border-orange-200" :
        "bg-green-50 border-green-200"
      )}>
        <div className="flex items-center gap-3">
          {weekStatus === 'draft' ? <AlertCircle className="h-4 w-4 text-slate-400" /> : 
           weekStatus === 'submitted' ? <Loader2 className="h-4 w-4 text-orange-500 animate-spin" /> : 
           <CheckCircle2 className="h-4 w-4 text-[#46a395]" />}
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase text-slate-400">Current Period Status</span>
            <span className="text-xs font-black uppercase text-slate-700">{weekStatus}</span>
          </div>
        </div>
        {weekStatus === 'draft' && totalWeekHours > 0 && (
          <Button size="sm" className="h-8 gap-2 font-bold text-[10px] uppercase tracking-wider" onClick={handleSubmitWeek} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Submit Week for Review
          </Button>
        )}
        {isLocked && (
          <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase italic">
            <Lock className="h-3.5 w-3.5" />
            Entry Locked for Review
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-2 flex-1 min-h-0">
        <Card className="w-full md:w-72 shrink-0 rounded-sm border-slate-200 shadow-sm flex flex-col bg-slate-50/20">
          <CardHeader className="p-4 border-b bg-white">
            <CardTitle className="text-xs font-bold uppercase flex items-center gap-2 text-slate-600">
              <Clock className="h-3.5 w-3.5 text-primary" /> Weekly Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex-1 overflow-y-auto no-scrollbar space-y-6">
            <div className="space-y-3">
              <div className="p-4 bg-white rounded-sm border border-slate-100 shadow-sm text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Hours</p>
                <p className="text-4xl font-black text-slate-800">{totalWeekHours.toFixed(1)}h</p>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <div className="p-3 rounded-sm border border-slate-100 bg-white flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-slate-500">Regular (Max 40h)</span>
                  <span className="text-xs font-black">{totalRegular.toFixed(1)}h</span>
                </div>
                <div className={cn("p-3 rounded-sm border flex items-center justify-between", totalOvertime > 0 ? "bg-orange-50 border-orange-100 text-orange-700" : "bg-white border-slate-100 text-slate-400")}>
                  <span className="text-[10px] font-bold uppercase">Overtime</span>
                  <span className="text-xs font-black">{totalOvertime.toFixed(1)}h</span>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-4">
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-sm">
                <AlertCircle className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[9px] text-blue-700 leading-relaxed font-medium">
                  {isLocked ? "Editing is disabled because this week has been submitted." : "Changes are saved automatically as you type."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex-1 flex flex-col gap-2 min-w-0 overflow-hidden">
          <Card className="flex-1 overflow-hidden flex flex-col rounded-sm border-slate-200 shadow-sm">
            <div className="flex-1 overflow-x-auto no-scrollbar">
              <Table className="border-collapse">
                <TableHeader className="bg-slate-50/80 sticky top-0 z-20 backdrop-blur-md">
                  <TableRow className="hover:bg-transparent border-b-slate-200 h-14">
                    <TableHead className="text-[10px] font-black uppercase w-64 min-w-[200px] border-r px-6">Project Reference</TableHead>
                    {weekDays.map(day => (
                      <TableHead key={day.toString()} className="text-[10px] font-black uppercase text-center border-r min-w-[90px]">
                        <div className="flex flex-col gap-0.5">
                          <span className={cn(format(day, 'EEE') === 'Sun' || format(day, 'EEE') === 'Sat' ? "text-orange-400" : "text-slate-600")}>{format(day, 'EEE')}</span>
                          <span className="text-[11px] text-slate-400">{format(day, 'dd')}</span>
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="text-[10px] font-black uppercase text-center w-24 bg-slate-100/50">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className={cn((isSyncing || isLocked) && "opacity-60 transition-opacity")}>
                  {initialLoading ? (
                    [1, 2, 3, 4, 5].map(i => (
                      <TableRow key={`load-row-${i}`}>
                        <TableCell className="border-r px-6"><Skeleton className="h-8 w-full rounded-sm" /></TableCell>
                        {weekDays.map((d, j) => (
                          <TableCell key={`load-cell-${i}-${j}`} className="border-r p-2">
                            <Skeleton className="h-10 w-full rounded-sm" />
                          </TableCell>
                        ))}
                        <TableCell className="p-2"><Skeleton className="h-10 w-full rounded-sm" /></TableCell>
                      </TableRow>
                    ))
                  ) : (projects || []).length === 0 ? (
                    <TableRow><TableCell colSpan={weekDays.length + 2} className="h-48 text-center text-xs text-slate-400 italic">No assigned projects found.</TableCell></TableRow>
                  ) : (
                    projects?.map(project => (
                      <TableRow key={project.id} className="hover:bg-slate-50/30 border-b-slate-100 group transition-colors">
                        <TableCell className="py-4 px-6 border-r">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-700 tracking-tight">{project.name}</span>
                            <span className="text-[9px] text-slate-400 font-bold uppercase truncate mt-0.5">{project.companyName}</span>
                          </div>
                        </TableCell>
                        {weekDays.map(day => {
                          const dateKey = format(day, 'yyyy-MM-dd');
                          const lookupKey = `${project.id}_${dateKey}`;
                          const currentVal = gridHours[lookupKey] || '';
                          const saving = isSaving === lookupKey;
                          return (
                            <TableCell key={`${project.id}-${dateKey}`} className="p-0 border-r focus-within:ring-1 focus-within:ring-inset focus-within:ring-primary/30 relative">
                              <input 
                                type="number" 
                                step="0.5" 
                                min="0" 
                                max="24" 
                                value={currentVal} 
                                readOnly={isLocked}
                                onChange={(e) => handleInputChange(project.id, day, e.target.value)} 
                                onBlur={(e) => handleCellBlur(project.id, day, e.target.value)} 
                                className={cn(
                                  "w-full h-14 bg-transparent text-center text-sm font-bold border-none outline-none focus:bg-white transition-all text-slate-600 placeholder:text-slate-200",
                                  saving && "opacity-50",
                                  isLocked && "cursor-not-allowed bg-slate-50/10"
                                )} 
                                placeholder="0.0" 
                              />
                              {saving && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><Loader2 className="h-3 w-3 animate-spin text-primary" /></div>}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center font-black text-xs text-slate-700 bg-slate-50/30">
                          {calculateProjectTotal(project.id).toFixed(1)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                <tfoot className="bg-slate-100/50 font-bold border-t-2 border-slate-200">
                  <TableRow className="h-14">
                    <TableCell className="text-[10px] font-black uppercase text-slate-500 border-r px-6">Daily Totals</TableCell>
                    {weekDays.map(day => (
                      <TableCell key={`foot-sum-${day.toString()}`} className="text-center border-r px-2">
                        <div className="flex flex-col items-center justify-center">
                          <span className="text-sm font-black text-slate-700">
                            {initialLoading ? <Skeleton className="h-4 w-8 mx-auto" /> : calculateDayTotal(day).toFixed(1)}
                          </span>
                        </div>
                      </TableCell>
                    ))}
                    <TableCell className="text-center text-sm font-black text-[#46a395] bg-white">
                      {initialLoading ? <Skeleton className="h-4 w-10 mx-auto" /> : totalWeekHours.toFixed(1)}
                    </TableCell>
                  </TableRow>
                </tfoot>
              </Table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
