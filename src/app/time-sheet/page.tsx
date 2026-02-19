'use client';

import { useState, useMemo, useEffect } from 'react';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  addWeeks, 
  subWeeks, 
  startOfDay
} from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Calendar as CalendarIcon,
  TrendingUp,
  AlertCircle,
  Loader2,
  PieChart,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirestore, useCollection, useAuth, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, setDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function TimeSheetPage() {
  const { user, loading: authLoading } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [gridHours, setGridHours] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  const weekDays = useMemo(() => {
    const end = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: currentWeekStart, end });
  }, [currentWeekStart]);

  const projectsCollection = useMemoFirebase(() => (firestore ? collection(firestore, 'projects') : null), [firestore]);
  const { data: projects, isLoading: projectsLoading } = useCollection(projectsCollection);

  const entriesQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, 'time_entries'),
      where('userId', '==', user.uid),
      where('date', '>=', startOfDay(currentWeekStart)),
      where('date', '<=', endOfWeek(currentWeekStart, { weekStartsOn: 1 })),
      orderBy('date', 'asc')
    );
  }, [firestore, user?.uid, currentWeekStart]);

  const { data: entries, isLoading: entriesLoading } = useCollection(entriesQuery);

  const normalizeDateKey = (dateVal: any): string => {
    if (!dateVal) return '';
    let d: Date;
    if (dateVal.toDate && typeof dateVal.toDate === 'function') d = dateVal.toDate();
    else if (dateVal instanceof Date) d = dateVal;
    else d = new Date(dateVal);
    return format(startOfDay(d), 'yyyy-MM-dd');
  };

  useEffect(() => {
    if (isNavigating) return;

    if (!entriesLoading) {
      const newHours: Record<string, string> = {};
      if (entries) {
        entries.forEach(e => {
          const dateKey = normalizeDateKey(e.date);
          if (dateKey) {
            newHours[`${e.projectId}_${dateKey}`] = e.hours.toString();
          }
        });
      }
      setGridHours(newHours);
    }
  }, [entries, entriesLoading, isNavigating]);

  const handleInputChange = (projectId: string, date: Date, value: string) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const key = `${projectId}_${dateKey}`;
    setGridHours(prev => ({ ...prev, [key]: value }));
  };

  const handleCellBlur = async (projectId: string, date: Date, value: string) => {
    if (!firestore || !user?.uid) return;
    
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
      description: 'Weekly Entry',
      updatedAt: serverTimestamp(),
    };

    setDoc(entryRef, data, { merge: true })
      .then(() => {
        setIsSaving(null);
        toast({ title: "Hours saved", description: `Registered ${hours}h for ${format(date, 'MMM dd')}`, duration: 2000 });
      })
      .catch((err) => {
        setIsSaving(null);
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: entryRef.path, operation: 'write', requestResourceData: data }));
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
  const totalOvertime = weekDays.reduce((acc, day) => acc + Math.max(0, calculateDayTotal(day) - 8), 0);
  const totalRegular = Math.max(0, totalWeekHours - totalOvertime);

  const projectDistribution = (projects || []).map(p => {
    const total = calculateProjectTotal(p.id);
    return { name: p.name, total, percentage: totalWeekHours > 0 ? (total / totalWeekHours) * 100 : 0 };
  }).filter(p => p.total > 0).sort((a, b) => b.total - a.total);

  const loading = authLoading || projectsLoading || (entriesLoading && !isNavigating) || isNavigating;

  const handleWeekChange = (newDate: Date) => {
    setIsNavigating(true);
    setGridHours({}); // CLEAR IMMEDIATELY TO PREVENT JUMP
    setCurrentWeekStart(newDate);
    setTimeout(() => setIsNavigating(false), 400);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] gap-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">My Time Sheet</h1>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider text-primary/70">Performance Tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 rounded-sm" onClick={() => handleWeekChange(subWeeks(currentWeekStart, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 px-4 py-1 bg-slate-100 rounded-sm border border-slate-200">
            <CalendarIcon className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-xs font-black text-slate-700">
              {format(currentWeekStart, 'dd MMM')} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'dd MMM, yyyy')}
            </span>
          </div>
          <Button variant="outline" size="sm" className="h-8 rounded-sm" onClick={() => handleWeekChange(addWeeks(currentWeekStart, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="sm" className="h-8 text-xs font-bold rounded-sm ml-2" onClick={() => handleWeekChange(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
            Current Week
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-2 flex-1 min-h-0">
        <Card className="w-full md:w-72 shrink-0 rounded-sm border-slate-200 shadow-sm flex flex-col bg-slate-50/20">
          <CardHeader className="p-4 border-b bg-white">
            <CardTitle className="text-xs font-bold uppercase flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-primary" /> Weekly Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex-1 overflow-y-auto no-scrollbar space-y-6">
            <div className="space-y-3">
              <div className="p-4 bg-white rounded-sm border border-slate-100 shadow-sm text-center relative overflow-hidden group">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Hours</p>
                <p className="text-4xl font-black text-slate-800">{totalWeekHours.toFixed(1)}h</p>
              </div>
              
              <div className="grid grid-cols-1 gap-2">
                <div className="p-3 rounded-sm border border-slate-100 bg-white flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-slate-500">Regular</span>
                  <span className="text-xs font-black">{totalRegular.toFixed(1)}h</span>
                </div>
                <div className={cn("p-3 rounded-sm border flex items-center justify-between transition-colors", totalOvertime > 0 ? "bg-orange-50 border-orange-100 text-orange-700" : "bg-white border-slate-100 text-slate-400")}>
                  <span className="text-[10px] font-bold uppercase">Overtime</span>
                  <span className="text-xs font-black">{totalOvertime.toFixed(1)}h</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 px-1">
                <PieChart className="h-3 w-3" /> Distribution
              </h4>
              <div className="space-y-3">
                {projectDistribution.length > 0 ? (
                  projectDistribution.map((pd, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-[9px] font-bold uppercase">
                        <span className="text-slate-500 truncate pr-2">{pd.name}</span>
                        <span className="text-slate-700 font-black">{pd.total.toFixed(1)}h</span>
                      </div>
                      <Progress value={pd.percentage} className="h-1 rounded-full bg-slate-100" />
                    </div>
                  ))
                ) : (
                  <p className="text-[9px] text-slate-400 italic text-center">No data for this period</p>
                )}
              </div>
            </div>

            <div className="mt-auto pt-4">
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-sm">
                <AlertCircle className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[9px] text-blue-700 leading-relaxed font-medium">
                  Los cambios se guardan automáticamente al perder el foco de la celda.
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
                    <TableHead className="text-[10px] font-black uppercase w-64 min-w-[200px] border-r px-6">Proyecto / Referencia</TableHead>
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
                <TableBody>
                  {loading ? (
                    [1, 2, 3, 4, 5].map(i => (
                      <TableRow key={i}>
                        <TableCell className="border-r px-6"><Skeleton className="h-8 w-full rounded-sm" /></TableCell>
                        {weekDays.map(d => <TableCell key={d.toString()} className="border-r p-2"><Skeleton className="h-10 w-full rounded-sm" /></TableCell>)}
                        <TableCell className="p-2"><Skeleton className="h-10 w-full rounded-sm" /></TableCell>
                      </TableRow>
                    ))
                  ) : (projects || []).length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="h-48 text-center text-xs text-slate-400 italic">No active projects found.</TableCell></TableRow>
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
                                className={cn("w-full h-14 bg-transparent text-center text-sm font-bold border-none outline-none focus:bg-white transition-all text-slate-600 placeholder:text-slate-200", saving && "opacity-50")} 
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
                    <TableCell className="text-[10px] font-black uppercase text-slate-500 border-r px-6">Totales Diarios</TableCell>
                    {weekDays.map(day => {
                      const dailyTotal = calculateDayTotal(day);
                      const isOT = dailyTotal > 8;
                      return (
                        <TableCell key={day.toString()} className="text-center border-r px-2">
                          <div className="flex flex-col items-center justify-center">
                            <span className={cn("text-sm font-black", isOT ? "text-orange-600" : "text-slate-700")}>
                              {loading ? <Skeleton className="h-4 w-8 mx-auto" /> : dailyTotal.toFixed(1)}
                            </span>
                            {isOT && <span className="text-[8px] font-black uppercase text-orange-400">OT</span>}
                          </div>
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center text-sm font-black text-primary bg-white">
                      {loading ? <Skeleton className="h-4 w-10 mx-auto" /> : totalWeekHours.toFixed(1)}
                    </TableCell>
                  </TableRow>
                </tfoot>
              </Table>
            </div>
          </Card>

          <Card className="rounded-sm border-slate-200 shadow-sm p-6 bg-slate-50/10">
            <div className="max-w-xl mx-auto">
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Navigation View</h4>
                  <span className="text-xs font-bold text-slate-600">{format(currentWeekStart, 'MMMM yyyy')}</span>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, i) => (
                    <div key={i} className="text-[10px] font-bold text-slate-300 text-center py-1 uppercase">{label}</div>
                  ))}
                  {eachDayOfInterval({ 
                    start: startOfWeek(currentWeekStart, { weekStartsOn: 1 }), 
                    end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }) 
                  }).map((day, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "h-10 w-full flex items-center justify-center text-[11px] rounded-sm transition-all relative border border-transparent bg-[#46a395] text-white font-bold shadow-sm"
                      )}
                    >
                      {format(day, 'd')}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}