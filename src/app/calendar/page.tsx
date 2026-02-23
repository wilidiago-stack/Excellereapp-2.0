'use client';

import { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  isToday
} from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Plus, 
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useProjectContext } from '@/context/project-context';

export default function CalendarPage() {
  const firestore = useFirestore();
  const { selectedProjectId } = useProjectContext();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const projectsCollection = useMemoFirebase(
    () => {
      if (!firestore) return null;
      let ref = collection(firestore, 'projects');
      if (selectedProjectId) {
        return query(ref, where('__name__', '==', selectedProjectId));
      }
      return ref;
    },
    [firestore, selectedProjectId]
  );
  const { data: projects, isLoading } = useCollection(projectsCollection);

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Project Calendar</h1>
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span>Milestones & Delivery.</span>
            {selectedProjectId && <Badge variant="outline" className="text-[9px] h-4 rounded-sm border-primary/30 text-primary font-bold">Project Focus Active</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="h-8 w-8 rounded-sm">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[120px] text-center font-bold text-sm">{format(currentMonth, 'MMMM yyyy')}</div>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="h-8 w-8 rounded-sm">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button asChild size="sm" className="h-8 text-xs rounded-sm gap-2"><Link href="/projects/new"><Plus className="h-3.5 w-3.5" /> New</Link></Button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (
      <div className="grid grid-cols-7 border-b border-l border-slate-200">
        {days.map((day, i) => (
          <div key={i} className="py-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 border-r border-slate-200 bg-slate-50">{day}</div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const dateFormat = 'd';
    const rows = [];
    let days = [];
    let day = startDate;

    const getDayEvents = (date: Date) => {
      if (!projects) return [];
      const events: any[] = [];
      projects.forEach(p => {
        if (p.startDate?.toDate && isSameDay(p.startDate.toDate(), date)) {
          events.push({ id: `${p.id}-start`, title: `Start: ${p.name}`, type: 'start', project: p });
        }
        if (p.deliveryDate?.toDate && isSameDay(p.deliveryDate.toDate(), date)) {
          events.push({ id: `${p.id}-delivery`, title: `Due: ${p.name}`, type: 'delivery', project: p });
        }
      });
      return events;
    };

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const events = getDayEvents(cloneDay);
        const isCurrentMonth = isSameMonth(day, monthStart);
        const isSelected = isSameDay(day, selectedDate);
        const today = isToday(day);

        days.push(
          <div
            key={day.toString()}
            className={`min-h-[100px] border-r border-b border-slate-200 p-1 transition-colors relative cursor-pointer ${
              !isCurrentMonth ? 'bg-slate-50/50 text-slate-300' : 'bg-white'
            } ${isSelected ? 'ring-1 ring-inset ring-primary z-10' : ''}`}
            onClick={() => setSelectedDate(cloneDay)}
          >
            <span className={`inline-flex items-center justify-center h-6 w-6 text-[11px] font-medium rounded-full mb-1 ${
              today ? 'bg-primary text-white' : isSelected ? 'text-primary font-bold' : ''
            }`}>{format(day, dateFormat)}</span>
            <div className="space-y-1 overflow-hidden">
              {events.slice(0, 2).map((event) => (
                <div key={event.id} className={`text-[8px] px-1.5 py-0.5 rounded-sm truncate border flex items-center gap-1 ${
                  event.type === 'start' ? 'bg-[#46a395]/10 text-[#46a395] border-[#46a395]/20' : 'bg-orange-100 text-orange-700 border-orange-200'
                }`}><div className={`h-1 w-1 rounded-full shrink-0 ${event.type === 'start' ? 'bg-[#46a395]' : 'bg-orange-500'}`} /> {event.title}</div>
              ))}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(<div className="grid grid-cols-7" key={day.toString()}>{days}</div>);
      days = [];
    }
    return <div className="border-t border-slate-200">{rows}</div>;
  };

  const selectedDayEvents = projects ? projects.reduce((acc: any[], p) => {
    if (p.startDate?.toDate && isSameDay(p.startDate.toDate(), selectedDate)) acc.push({ ...p, eventType: 'Project Start' });
    if (p.deliveryDate?.toDate && isSameDay(p.deliveryDate.toDate(), selectedDate)) acc.push({ ...p, eventType: 'Project Delivery' });
    return acc;
  }, []) : [];

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] gap-2">
      {renderHeader()}
      <div className="flex flex-col md:flex-row gap-2 flex-1 min-h-0">
        <Card className="flex-1 overflow-hidden flex flex-col rounded-sm border-slate-200 shadow-sm">
          <div className="flex-1 overflow-y-auto no-scrollbar border-l">
            {isLoading ? <div className="p-4 space-y-4"><Skeleton className="h-8 w-full" /><Skeleton className="h-[400px] w-full" /></div> : <>{renderDays()}{renderCells()}</>}
          </div>
        </Card>
        <Card className="w-full md:w-72 shrink-0 rounded-sm border-slate-200 shadow-sm flex flex-col">
          <CardHeader className="p-4 border-b bg-slate-50/50">
            <CardTitle className="text-sm font-bold flex items-center gap-2"><CalendarIcon className="h-4 w-4 text-primary" /> {format(selectedDate, 'PPP')}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex-1 overflow-y-auto no-scrollbar">
            {selectedDayEvents.length === 0 ? <div className="flex flex-col items-center justify-center py-10 opacity-50"><Clock className="h-8 w-8 mb-2 text-slate-300" /><p className="text-xs font-medium">No events</p></div> : (
              <div className="space-y-3">
                {selectedDayEvents.map((event, i) => (
                  <div key={i} className="p-3 rounded-sm border border-slate-100 bg-slate-50 group hover:border-primary/30">
                    <Badge variant={event.eventType === 'Project Start' ? 'default' : 'secondary'} className="text-[8px] h-4 rounded-sm mb-1">{event.eventType}</Badge>
                    <h4 className="text-xs font-bold truncate">{event.name}</h4>
                    <p className="text-[10px] text-slate-500 mt-1">{event.status}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}