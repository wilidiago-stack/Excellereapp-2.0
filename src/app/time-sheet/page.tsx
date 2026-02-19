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
  startOfMonth,
  endOfMonth,
  isSameMonth,
  isSameDay,
  addDays,
  startOfWeeks,
  isWithinInterval
} from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Timer, 
  Clock, 
  Calendar as CalendarIcon,
  Info,
  TrendingUp,
  AlertCircle,
  Loader2,
  CalendarDays
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirestore, useCollection, useAuth, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, setDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function TimeSheetPage() {
  const { user, loading: authLoading } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  // State for week navigation (Starts on Monday)
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  
  // Local state for hours to allow live calculations while typing
  const [gridHours, setGridHours] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState<string | null>(null);

  const weekDays = useMemo(() => {
    const end = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: currentWeekStart, end });
  }, [currentWeekStart]);

  // Queries
  const projectsCollection = useMemoFirebase(() => (firestore ? collection(firestore, 'projects') : null), [firestore]);
  const { data: projects, isLoading: projectsLoading } = useCollection(projectsCollection);

  const entriesQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, 'time_entries'),
      where('userId', '==', user.uid),
      where('date', '>=', currentWeekStart),
      where('date', '<=', endOfWeek(currentWeekStart, { weekStartsOn: 1 })),
      orderBy('date', 'asc')
    );
  }, [firestore, user?.uid, currentWeekStart]);

  const { data: entries, isLoading: entriesLoading } = useCollection(entriesQuery);

  // Sync gridHours when entries arrive from Firestore
  useEffect(() => {
    if (entries) {
      const newHours: Record<string, string> = {};
      entries.forEach(e => {
        const dateVal = e.date?.toDate ? e.date.toDate() : new Date(e.date);
        const dateKey = format(dateVal, 'yyyy-MM-dd');
        newHours[`${e.projectId}_${dateKey}`] = e.hours.toString();
      });
      setGridHours(newHours);
    }
  }, [entries]);

  const handleInputChange = (projectId: string, date: Date, value: string) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const key = `${projectId}_${dateKey}`;
    setGridHours(prev => ({ ...prev, [key]: value }));
  };

  const handleCellBlur = async (projectId: string, date: Date, value: string) => {
    if (!firestore || !user?.uid) return;
    
    const hours = value === '' ? 0 : parseFloat(value);
    if (isNaN(hours)) return;

    const dateKey = format(date, 'yyyy-MM-dd');
    const key = `${projectId}_${dateKey}`;
    
    const existingEntry = (entries || []).find(e => {
      const d = e.date?.toDate ? e.date.toDate() : new Date(e.date);
      return e.projectId === projectId && format(d, 'yyyy-MM-dd') === dateKey;
    });

    if (existingEntry && existingEntry.hours === hours) return;

    setIsSaving(key);
    
    const entryId = existingEntry?.id || `${user.uid}_${projectId}_${dateKey}`;
    const entryRef = doc(firestore, 'time_entries', entryId);

    const data = {
      userId: user.uid,
      projectId,
      date: startOfDay(date),
      hours: hours,
      description: 'Weekly Entry',
      updatedAt: serverTimestamp(),
    };

    setDoc(entryRef, data, { merge: true })
      .then(() => {
        setIsSaving(null);
        toast({
          title: "Entry Saved",
          description: `Logged ${hours}h for ${format(date, 'MMM dd')}`,
          duration: 2000,
        });
      })
      .catch((err) => {
        setIsSaving(null);
        const permissionError = new FirestorePermissionError({
          path: entryRef.path,
          operation: 'write',
          requestResourceData: data,
        });
        errorEmitter.emit('permission-error', permissionError);
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
  
  const totalOvertime = weekDays.reduce((acc, day) => {
    const dailyTotal = calculateDayTotal(day);
    return acc + Math.max(0, dailyTotal - 8);
  }, 0);

  const totalRegular = Math.max(0, totalWeekHours - totalOvertime);

  const loading = authLoading || projectsLoading || (entriesLoading && Object.keys(gridHours).length === 0);

  // Helper to render mini calendar
  const renderMiniCalendar = () => {
    const monthStart = startOfMonth(currentWeekStart);
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const weekInterval = { 
      start: currentWeekStart, 
      end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }) 
    };

    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    const weekLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    return (
      <div className="space-y-3 pt-4 border-t mt-4">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Navigation View</h4>
          <span className="text-[10px] font-bold text-slate-600">{format(monthStart, 'MMMM yyyy')}</span>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {weekLabels.map((label, i) => (
            <div key={i} className="text-[8px] font-bold text-slate-300 text-center py-1">{label}</div>
          ))}
          {days.map((day, i) => {
            const isSelectedWeek = isWithinInterval(day, weekInterval);
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, monthStart);

            return (
              <div 
                key={i} 
                className={cn(
                  "h-6 w-full flex items-center justify-center text-[9px] rounded-sm transition-all relative",
                  !isCurrentMonth && "opacity-20",
                  isSelectedWeek ? "bg-[#46a395] text-white font-bold" : "text-slate-500",
                  isToday && !isSelectedWeek && "border border-[#46a395] text-[#46a395]"
                )}
              >
                {format(day, 'd')}
                {isSelectedWeek && i % 7 === 0 && <div className="absolute -left-1 top-0 bottom-0 w-0.5 bg-[#46a395] rounded-full" />}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] gap-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">My Time Sheet</h1>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider text-primary/70">Weekly Performance Tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 rounded-sm" onClick={() => {
            setCurrentWeekStart(subWeeks(currentWeekStart, 1));
            setGridHours({}); 
          }}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 px-4 py-1 bg-slate-100 rounded-sm border border-slate-200">
            <CalendarIcon className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-xs font-black text-slate-700">
              {format(currentWeekStart, 'dd MMM')} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'dd MMM, yyyy')}
            </span>
          </div>
          <Button variant="outline" size="sm" className="h-8 rounded-sm" onClick={() => {
            setCurrentWeekStart(addWeeks(currentWeekStart, 1));
            setGridHours({});
          }}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="sm" className="h-8 text-xs font-bold rounded-sm ml-2" onClick={() => {
            setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
            setGridHours({});
          }}>
            Current Week
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-2 flex-1 min-h-0">
        <Card className="w-full md:w-72 shrink-0 rounded-sm border-slate-200 shadow-sm flex flex-col bg-slate-50/20">
          <CardHeader className="p-4 border-b bg-white">
            <CardTitle className="text-xs font-bold uppercase flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-primary" /> Period Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex-1 overflow-y-auto no-scrollbar space-y-6">
            <div className="space-y-3">
              <div className="p-4 bg-white rounded-sm border border-slate-100 shadow-sm text-center relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-1 opacity-10 group-hover:opacity-20 transition-opacity">
                   <TrendingUp className="h-8 w-8 text-primary" />
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Hours</p>
                <p className="text-4xl font-black text-slate-800">{totalWeekHours.toFixed(1)}h</p>
              </div>
              
              <div className="grid grid-cols-1 gap-2">
                <div className="p-3 rounded-sm border border-slate-100 bg-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-[#46a395]" />
                    <span className="text-[10px] font-bold uppercase text-slate-500">Regular</span>
                  </div>
                  <span className="text-xs font-black">{totalRegular.toFixed(1)}h</span>
                </div>
                <div className={cn(
                  "p-3 rounded-sm border flex items-center justify-between transition-colors",
                  totalOvertime > 0 ? "bg-orange-50 border-orange-100 text-orange-700" : "bg-white border-slate-100 text-slate-400"
                )}>
                  <div className="flex items-center gap-2">
                    <div className={cn("h-2.5 w-2.5 rounded-full", totalOvertime > 0 ? "bg-orange-500 animate-pulse" : "bg-slate-200")} />
                    <span className="text-[10px] font-bold uppercase">Overtime</span>
                  </div>
                  <span className="text-xs font-black">{totalOvertime.toFixed(1)}h</span>
                </div>
              </div>
            </div>

            {renderMiniCalendar()}

            <div className="mt-auto pt-4">
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-sm">
                <AlertCircle className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[9px] text-blue-700 leading-relaxed font-medium">
                  Hours exceeding 8 per day are calculated as overtime. Changes are saved automatically.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1 overflow-hidden flex flex-col rounded-sm border-slate-200 shadow-sm">
          <div className="flex-1 overflow-x-auto no-scrollbar">
            <Table className="border-collapse">
              <TableHeader className="bg-slate-50/80 sticky top-0 z-20 backdrop-blur-md">
                <TableRow className="hover:bg-transparent border-b-slate-200 h-14">
                  <TableHead className="text-[10px] font-black uppercase w-64 min-w-[200px] border-r px-6">Project Reference</TableHead>
                  {weekDays.map(day => (
                    <TableHead key={day.toString()} className="text-[10px] font-black uppercase text-center border-r min-w-[90px]">
                      <div className="flex flex-col gap-0.5">
                        <span className={cn(format(day, 'EEE') === 'Sun' || format(day, 'EEE') === 'Sat' ? "text-orange-400" : "text-slate-600")}>
                          {format(day, 'EEEE')}
                        </span>
                        <span className="text-[11px] text-slate-400">{format(day, 'MMM dd')}</span>
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="text-[10px] font-black uppercase text-center w-24 bg-slate-100/50">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [1, 2, 3, 4, 5].map(i => (
                    <TableRow key={i}>
                      <TableCell className="border-r px-6"><Skeleton className="h-8 w-full rounded-sm" /></TableCell>
                      {weekDays.map(d => <TableCell key={d.toString()} className="border-r p-2"><Skeleton className="h-10 w-full rounded-sm" /></TableCell>)}
                      <TableCell className="p-2"><Skeleton className="h-10 w-full rounded-sm" /></TableCell>
                    </TableRow>
                  ))
                ) : projects?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-48 text-center text-xs text-slate-400 italic">No active projects found. Please create a project to log time.</TableCell>
                  </TableRow>
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
                          <TableCell key={day.toString()} className="p-0 border-r focus-within:ring-1 focus-within:ring-inset focus-within:ring-primary/30 relative">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max="24"
                              value={currentVal}
                              onChange={(e) => handleInputChange(project.id, day, e.target.value)}
                              onBlur={(e) => handleCellBlur(project.id, day, e.target.value)}
                              className={cn(
                                "w-full h-14 bg-transparent text-center text-sm font-bold border-none outline-none focus:bg-white transition-all text-slate-600 placeholder:text-slate-200",
                                saving && "opacity-50"
                              )}
                              placeholder="0.0"
                            />
                            {saving && <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <Loader2 className="h-3 w-3 animate-spin text-primary opacity-50" />
                            </div>}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center font-black text-xs text-slate-700 bg-slate-50/30">
                        {calculateProjectTotal(project.id) > 0 ? calculateProjectTotal(project.id).toFixed(1) : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              <tfoot className="bg-slate-100/50 font-bold border-t-2 border-slate-200">
                <TableRow className="h-14">
                  <TableCell className="text-[10px] font-black uppercase text-slate-500 border-r px-6">Daily Totals</TableCell>
                  {weekDays.map(day => {
                    const dailyTotal = calculateDayTotal(day);
                    const isOT = dailyTotal > 8;
                    return (
                      <TableCell key={day.toString()} className="text-center border-r px-2">
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          <span className={cn("text-sm font-black", isOT ? "text-orange-600" : "text-slate-700")}>
                            {dailyTotal.toFixed(1)}
                          </span>
                          {isOT && <span className="text-[8px] font-black uppercase text-orange-400">OT: {(dailyTotal - 8).toFixed(1)}</span>}
                        </div>
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center text-sm font-black text-primary bg-white shadow-inner">
                    {totalWeekHours.toFixed(1)}
                  </TableCell>
                </TableRow>
              </tfoot>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}
