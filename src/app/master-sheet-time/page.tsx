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
  isSameDay,
  isWithinInterval,
  startOfMonth,
  endOfMonth,
  isSameMonth
} from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Sheet as SheetIcon, 
  Clock, 
  Calendar as CalendarIcon,
  TrendingUp,
  Users,
  LayoutDashboard,
  Info,
  UserCheck
} from 'lucide-react';
import { useFirestore, useCollection, useAuth, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export default function MasterSheetTimePage() {
  const { user: currentUser, role, loading: authLoading } = useAuth();
  const firestore = useFirestore();
  
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [isNavigating, setIsNavigating] = useState(false);

  const weekDays = useMemo(() => {
    const end = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: currentWeekStart, end });
  }, [currentWeekStart]);

  // Fetch ALL users to map IDs to names
  const usersCollection = useMemoFirebase(() => (firestore ? collection(firestore, 'users') : null), [firestore]);
  const { data: allUsers, isLoading: usersLoading } = useCollection(usersCollection);

  // Fetch ALL time entries for the selected week
  const entriesQuery = useMemoFirebase(() => {
    if (!firestore || !currentUser) return null;
    return query(
      collection(firestore, 'time_entries'),
      where('date', '>=', currentWeekStart),
      where('date', '<=', endOfWeek(currentWeekStart, { weekStartsOn: 1 })),
      orderBy('date', 'asc')
    );
  }, [firestore, currentUser, currentWeekStart]);

  const { data: entries, isLoading: entriesLoading } = useCollection(entriesQuery);

  const normalizeDate = (dateVal: any): Date => {
    if (!dateVal) return new Date();
    if (dateVal.toDate && typeof dateVal.toDate === 'function') return dateVal.toDate();
    if (dateVal instanceof Date) return dateVal;
    return new Date(dateVal);
  };

  const processedData = useMemo(() => {
    if (!entries) return { userHours: {}, activeUserIds: [] };

    const userHours: Record<string, Record<string, number>> = {};
    const userSet = new Set<string>();

    entries.forEach(e => {
      const uId = e.userId;
      const dateVal = normalizeDate(e.date);
      const dateKey = format(dateVal, 'yyyy-MM-dd');
      
      if (!userHours[uId]) userHours[uId] = {};
      userHours[uId][dateKey] = (userHours[uId][dateKey] || 0) + (e.hours || 0);
      userSet.add(uId);
    });

    return { 
      userHours, 
      activeUserIds: Array.from(userSet) 
    };
  }, [entries]);

  const activeUsers = useMemo(() => {
    if (!allUsers) return [];
    return allUsers.filter(u => processedData.activeUserIds.includes(u.id));
  }, [allUsers, processedData.activeUserIds]);

  const calculateDayTotal = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    return processedData.activeUserIds.reduce((acc, uId) => {
      return acc + (processedData.userHours[uId]?.[dateKey] || 0);
    }, 0);
  };

  const calculateUserWeekTotal = (uId: string) => {
    return weekDays.reduce((acc, day) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      return acc + (processedData.userHours[uId]?.[dateKey] || 0);
    }, 0);
  };

  const totalTeamHours = weekDays.reduce((acc, day) => acc + calculateDayTotal(day), 0);

  const teamStats = activeUsers.map(u => {
    const total = calculateUserWeekTotal(u.id);
    return { name: `${u.firstName} ${u.lastName}`, total, percentage: totalTeamHours > 0 ? (total / totalTeamHours) * 100 : 0 };
  }).sort((a, b) => b.total - a.total);

  const loading = authLoading || usersLoading || entriesLoading || isNavigating;

  const handleWeekChange = (newDate: Date) => {
    setIsNavigating(true);
    setCurrentWeekStart(newDate);
  };

  useEffect(() => {
    if (!entriesLoading) setIsNavigating(false);
  }, [entriesLoading]);

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
          <p className="text-xs text-muted-foreground">Consolidado semanal de horas por usuario activo.</p>
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
              <SheetIcon className="h-3.5 w-3.5 text-[#46a395]" /> Resumen de Equipo
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex-1 overflow-y-auto no-scrollbar space-y-6">
            <div className="space-y-3">
              <div className="p-4 bg-white rounded-sm border border-slate-100 shadow-sm text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Horas Totales Equipo</p>
                <p className="text-3xl font-black text-[#46a395]">{totalTeamHours.toFixed(1)}h</p>
              </div>
              <div className="p-3 rounded-sm border border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] font-bold uppercase text-slate-500">Usuarios Activos</span>
                </div>
                <span className="text-xs font-bold">{activeUsers.length}</span>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <LayoutDashboard className="h-3 w-3" /> Distribución de Carga
                </h4>
              </div>
              <div className="space-y-3">
                {teamStats.length > 0 ? (
                  teamStats.map((ts, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-[9px] font-bold">
                        <span className="text-slate-500 truncate pr-2">{ts.name}</span>
                        <span className="text-slate-700">{ts.total.toFixed(1)}h</span>
                      </div>
                      <Progress value={ts.percentage} className="h-1 rounded-full" />
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
                  Solo se muestran usuarios que han ingresado horas en este periodo.
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
                    <TableHead className="text-[10px] font-black uppercase h-12 w-64 min-w-[200px] border-r px-4">Usuario / Colaborador</TableHead>
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
                  ) : activeUsers.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="h-48 text-center text-xs text-slate-400 italic">No hay actividad registrada para ningún usuario en esta semana.</TableCell></TableRow>
                  ) : (
                    activeUsers.map(u => (
                      <TableRow key={u.id} className="hover:bg-slate-50/30 border-b-slate-100 group">
                        <TableCell className="py-3 px-4 border-r">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0">
                              <span className="text-[10px] font-bold text-slate-500">{u.firstName?.charAt(0)}{u.lastName?.charAt(0)}</span>
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold text-slate-700 truncate">{u.firstName} {u.lastName}</span>
                              <span className="text-[9px] text-slate-400 uppercase font-medium">{u.role}</span>
                            </div>
                          </div>
                        </TableCell>
                        {weekDays.map(day => {
                          const dateKey = format(day, 'yyyy-MM-dd');
                          const hours = processedData.userHours[u.id]?.[dateKey] || 0;
                          return (
                            <TableCell key={day.toString()} className={cn("text-center text-xs font-bold border-r", hours > 8 ? "text-orange-600 bg-orange-50/30" : hours > 0 ? "text-slate-600" : "text-slate-200")}>
                              {hours > 0 ? hours.toFixed(1) : '-'}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center font-black text-xs text-[#46a395] bg-slate-50/30">{calculateUserWeekTotal(u.id).toFixed(1)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                <tfoot className="bg-slate-50/50 font-bold border-t-2 border-slate-200">
                  <TableRow>
                    <TableCell className="text-[10px] font-black uppercase text-slate-500 border-r px-4">Totales Diarios Equipo</TableCell>
                    {weekDays.map(day => (
                      <TableCell key={day.toString()} className="text-center text-xs text-slate-600 border-r">
                        {loading ? <Skeleton className="h-6 w-12 mx-auto" /> : calculateDayTotal(day).toFixed(1)}
                      </TableCell>
                    ))}
                    <TableCell className="text-center text-sm font-black text-[#46a395] bg-slate-100/50">
                      {loading ? <Skeleton className="h-6 w-12 mx-auto" /> : totalTeamHours.toFixed(1)}
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
