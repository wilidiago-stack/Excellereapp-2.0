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
  isWithinInterval
} from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Sheet as SheetIcon, 
  Clock, 
  Save, 
  Calendar as CalendarIcon,
  RefreshCw,
  Info,
  TrendingUp,
  Loader2,
  Users,
  LayoutDashboard
} from 'lucide-react';
import { useFirestore, useCollection, useAuth, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, setDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cn } from '@/lib/utils';

export default function MasterSheetTimePage() {
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
      where('date', '>=', currentWeekStart),
      where('date', '<=', endOfWeek(currentWeekStart, { weekStartsOn: 1 })),
      orderBy('date', 'asc')
    );
  }, [firestore, user?.uid, currentWeekStart]);

  const { data: entries, isLoading: entriesLoading } = useCollection(entriesQuery);

  // Helper to normalize dates
  const normalizeDate = (dateVal: any): Date => {
    if (!dateVal) return new Date();
    if (dateVal.toDate && typeof dateVal.toDate === 'function') return dateVal.toDate();
    if (dateVal instanceof Date) return dateVal;
    return new Date(dateVal);
  };

  useEffect(() => {
    // Reset navigation and sync data when loading is done
    if (!entriesLoading) {
      const newHours: Record<string, string> = {};
      if (entries) {
        entries.forEach(e => {
          const dateVal = normalizeDate(e.date);
          const dateKey = format(dateVal, 'yyyy-MM-dd');
          newHours[`${e.projectId}_${dateKey}`] = e.hours.toString();
        });
      }
      setGridHours(newHours);
      setIsNavigating(false);
    }
  }, [entries, entriesLoading]);

  const handleInputChange = (projectId: string, date: Date, value: string) => {
    const key = `${projectId}_${format(date, 'yyyy-MM-dd')}`;
    setGridHours(prev => ({ ...prev, [key]: value }));
  };

  const handleCellBlur = async (projectId: string, date: Date, value: string) => {
    if (!firestore || !user?.uid) return;
    
    const hours = value === '' ? 0 : parseFloat(value);
    if (isNaN(hours)) return;

    const dateKey = format(date, 'yyyy-MM-dd');
    const lookupKey = `${projectId}_${dateKey}`;
    
    const existingEntry = (entries || []).find(e => {
      const d = normalizeDate(e.date);
      return e.projectId === projectId && format(d, 'yyyy-MM-dd') === dateKey;
    });

    if (existingEntry && existingEntry.hours === hours) return;

    setIsSaving(lookupKey);
    const entryId = existingEntry?.id || `${user.uid}_${projectId}_${dateKey}`;
    const entryRef = doc(firestore, 'time_entries', entryId);

    const data = {
      userId: user.uid,
      projectId,
      date: startOfDay(date),
      hours: hours || 0,
      description: 'Master Sheet Entry',
      updatedAt: serverTimestamp(),
    };

    setDoc(entryRef, data, { merge: true })
      .then(() => {
        setIsSaving(null);
        toast({ title: "Cambios guardados", description: "La hoja de horas se ha actualizado correctamente.", duration: 2000 });
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

  const projectStats = (projects || []).map(p => {
    const total = calculateProjectTotal(p.id);
    return { name: p.name, total, percentage: totalWeekHours > 0 ? (total / totalWeekHours) * 100 : 0 };
  }).filter(p => p.total > 0).sort((a, b) => b.total - a.total);

  const loading = authLoading || projectsLoading || entriesLoading || isNavigating;

  const handleWeekChange = (newDate: Date) => {
    setIsNavigating(true);
    setGridHours({});
    setCurrentWeekStart(newDate);
  };

  const renderMiniCalendar = () => {
    const monthStart = startOfMonth(currentWeekStart);
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const weekInterval = { start: currentWeekStart, end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }) };
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    const weekLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Contexto Semanal</h4>
          <span className="text-xs font-bold text-slate-600">{format(monthStart, 'MMMM yyyy')}</span>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {weekLabels.map((label, i) => (
            <div key={i} className="text-[10px] font-bold text-slate-300 text-center py-1">{label}</div>
          ))}
          {days.map((day, i) => {
            const isSelectedWeek = isWithinInterval(day, weekInterval);
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, monthStart);
            return (
              <div 
                key={i} 
                className={cn(
                  "h-10 w-full flex items-center justify-center text-[11px] rounded-sm transition-all relative border border-transparent", 
                  !isCurrentMonth && "opacity-20", 
                  isSelectedWeek ? "bg-[#46a395] text-white font-bold shadow-sm" : "text-slate-500", 
                  isToday && !isSelectedWeek && "border-[#46a395] text-[#46a395]"
                )}
              >
                {format(day, 'd')}
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
          <h1 className="text-xl font-bold tracking-tight text-slate-800">Master Sheet Time</h1>
          <p className="text-xs text-muted-foreground">Vista semanal de carga horaria por proyecto.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 rounded-sm" onClick={() => handleWeekChange(subWeeks(currentWeekStart, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-sm border border-slate-200">
            <CalendarIcon className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-xs font-bold text-slate-700">
              {format(currentWeekStart, 'dd MMM')} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'dd MMM, yyyy')}
            </span>
          </div>
          <Button variant="outline" size="sm" className="h-8 rounded-sm" onClick={() => handleWeekChange(addWeeks(currentWeekStart, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="sm" className="h-8 text-xs rounded-sm ml-2" onClick={() => handleWeekChange(startOfWeek(new Date(), { weekStartsOn: 1 }))}>Hoy</Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-2 flex-1 min-h-0">
        <Card className="w-full md:w-72 shrink-0 rounded-sm border-slate-200 shadow-sm flex flex-col">
          <CardHeader className="p-4 border-b bg-slate-50/50">
            <CardTitle className="text-xs font-bold uppercase flex items-center gap-2">
              <SheetIcon className="h-3.5 w-3.5 text-[#46a395]" /> Resumen de Semana
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex-1 overflow-y-auto no-scrollbar space-y-6">
            <div className="space-y-3">
              <div className="p-4 bg-white rounded-sm border border-slate-100 shadow-sm text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Horas Totales</p>
                <p className="text-3xl font-black text-[#46a395]">{totalWeekHours.toFixed(1)}h</p>
              </div>
              <div className="p-3 rounded-sm border border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] font-bold uppercase text-slate-500">Promedio Diario</span>
                </div>
                <span className="text-xs font-bold">{(totalWeekHours / 7).toFixed(1)}h</span>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <LayoutDashboard className="h-3 w-3" /> Carga de Trabajo
                </h4>
              </div>
              <div className="space-y-3">
                {projectStats.length > 0 ? (
                  projectStats.map((ps, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-[9px] font-bold">
                        <span className="text-slate-500 truncate pr-2">{ps.name}</span>
                        <span className="text-slate-700">{ps.total.toFixed(1)}h</span>
                      </div>
                      <Progress value={ps.percentage} className="h-1 rounded-full" />
                    </div>
                  ))
                ) : (
                  <div className="py-2 text-center">
                    <p className="text-[9px] text-slate-400 italic">Sin actividad registrada</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-auto pt-4">
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-sm">
                <Info className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[9px] text-blue-700 leading-relaxed">
                  Los cambios se guardan automáticamente. Use el tabulador para navegar rápido.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex-1 flex flex-col gap-2 min-w-0 overflow-hidden">
          <Card className="flex-1 overflow-hidden flex flex-col rounded-sm border-slate-200 shadow-sm">
            <div className="flex-1 overflow-x-auto no-scrollbar">
              <Table className="border-collapse">
                <TableHeader className="bg-slate-50/80 sticky top-0 z-20">
                  <TableRow className="hover:bg-transparent border-b-slate-200">
                    <TableHead className="text-[10px] font-black uppercase h-12 w-64 min-w-[200px] border-r px-4">Proyecto / Referencia</TableHead>
                    {weekDays.map(day => (
                      <TableHead key={day.toString()} className="text-[10px] font-black uppercase h-12 text-center border-r min-w-[80px]">
                        <div className="flex flex-col"><span>{format(day, 'EEE')}</span><span className="text-slate-400">{format(day, 'dd')}</span></div>
                      </TableHead>
                    ))}
                    <TableHead className="text-[10px] font-black uppercase h-12 text-center w-24 bg-slate-100/50">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    [1, 2, 3, 4, 5].map(i => (
                      <TableRow key={i}>
                        <TableCell className="border-r px-4"><Skeleton className="h-8 w-full" /></TableCell>
                        {weekDays.map(d => <TableCell key={d.toString()} className="border-r p-2"><Skeleton className="h-10 w-full" /></TableCell>)}
                        <TableCell className="p-2"><Skeleton className="h-10 w-full" /></TableCell>
                      </TableRow>
                    ))
                  ) : projects?.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="h-32 text-center text-xs text-slate-400 italic">No hay proyectos activos asignados.</TableCell></TableRow>
                  ) : (
                    projects?.map(project => (
                      <TableRow key={project.id} className="hover:bg-slate-50/30 border-b-slate-100 group">
                        <TableCell className="py-3 px-4 border-r">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-700">{project.name}</span>
                            <span className="text-[9px] text-slate-400 truncate">{project.companyName}</span>
                          </div>
                        </TableCell>
                        {weekDays.map(day => {
                          const dateKey = format(day, 'yyyy-MM-dd');
                          const lookupKey = `${project.id}_${dateKey}`;
                          const currentVal = gridHours[lookupKey] || '';
                          const saving = isSaving === lookupKey;
                          return (
                            <TableCell key={day.toString()} className="p-0 border-r focus-within:ring-1 focus-within:ring-inset focus-within:ring-[#46a395] relative">
                              <input type="number" step="0.5" min="0" max="24" value={currentVal} onChange={(e) => handleInputChange(project.id, day, e.target.value)} onBlur={(e) => handleCellBlur(project.id, day, e.target.value)} className={cn("w-full h-12 bg-transparent text-center text-xs font-bold border-none outline-none focus:bg-white transition-colors", saving && "opacity-50")} placeholder="0" />
                              {saving && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><Loader2 className="h-3 w-3 animate-spin text-[#46a395] opacity-50" /></div>}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center font-black text-xs text-[#46a395] bg-slate-50/30">{calculateProjectTotal(project.id).toFixed(1)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                <tfoot className="bg-slate-50/50 font-bold border-t-2 border-slate-200">
                  <TableRow>
                    <TableCell className="text-[10px] font-black uppercase text-slate-500 border-r px-4">Totales Diarios</TableCell>
                    {weekDays.map(day => (
                      <TableCell key={day.toString()} className="text-center text-xs text-slate-600 border-r">
                        {loading ? <Skeleton className="h-6 w-12 mx-auto" /> : calculateDayTotal(day).toFixed(1)}
                      </TableCell>
                    ))}
                    <TableCell className="text-center text-sm font-black text-[#46a395] bg-slate-100/50">
                      {loading ? <Skeleton className="h-6 w-12 mx-auto" /> : totalWeekHours.toFixed(1)}
                    </TableCell>
                  </TableRow>
                </tfoot>
              </Table>
            </div>
          </Card>

          <Card className="rounded-sm border-slate-200 shadow-sm p-6 bg-slate-50/10">
            <div className="max-w-xl mx-auto">
              {renderMiniCalendar()}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
