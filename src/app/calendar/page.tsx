
'use client';

import { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useAuth } from '@/firebase';
import { collection, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
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
  isToday,
  startOfDay
} from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Plus, 
  Clock,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useProjectContext } from '@/context/project-context';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cn } from '@/lib/utils';

export default function CalendarPage() {
  const { user } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { selectedProjectId } = useProjectContext();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteDesc, setNoteDesc] = useState('');

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
  const { data: projects, isLoading: projectsLoading } = useCollection(projectsCollection);

  const notesCollection = useMemoFirebase(
    () => {
      if (!firestore) return null;
      let ref = collection(firestore, 'calendar_notes');
      if (selectedProjectId) {
        return query(ref, where('projectId', '==', selectedProjectId));
      }
      return ref;
    },
    [firestore, selectedProjectId]
  );
  const { data: notes, isLoading: notesLoading } = useCollection(notesCollection);

  const handleAddNote = async () => {
    if (!firestore || !user || !noteTitle) return;
    setIsSaving(true);

    const noteData = {
      title: noteTitle,
      description: noteDesc,
      date: startOfDay(selectedDate),
      projectId: selectedProjectId || 'global',
      authorId: user.uid,
      authorName: user.displayName || user.email,
      createdAt: serverTimestamp(),
    };

    addDoc(collection(firestore, 'calendar_notes'), noteData)
      .then(() => {
        toast({ title: "Note Added", description: "Event saved successfully." });
        setNoteTitle('');
        setNoteDesc('');
        setIsDialogOpen(false);
      })
      .catch((err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'calendar_notes',
          operation: 'create',
          requestResourceData: noteData,
        }));
      })
      .finally(() => setIsSaving(false));
  };

  const isLoading = projectsLoading || notesLoading;

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col">
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
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 text-xs rounded-sm gap-2">
                <Plus className="h-3.5 w-3.5" /> New
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-sm sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Calendar Note</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-slate-500">Event Date</Label>
                  <div className="p-2 bg-slate-50 rounded-sm border border-slate-100 text-xs font-bold text-slate-700">
                    {format(selectedDate, 'PPPP')}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-slate-500">Note Title</Label>
                  <Input 
                    placeholder="e.g. Concrete Pouring Level 2" 
                    value={noteTitle} 
                    onChange={(e) => setNoteTitle(e.target.value)} 
                    className="h-10 rounded-sm text-xs" 
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-slate-500">Description</Label>
                  <Textarea 
                    placeholder="Add details about this event..." 
                    value={noteDesc} 
                    onChange={(e) => setNoteDesc(e.target.value)} 
                    className="min-h-[80px] rounded-sm text-xs resize-none" 
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button size="sm" onClick={handleAddNote} disabled={!noteTitle || isSaving} className="gap-2">
                  {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Save Note
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
      const events: any[] = [];
      if (projects) {
        projects.forEach(p => {
          if (p.startDate?.toDate && isSameDay(p.startDate.toDate(), date)) {
            events.push({ id: `${p.id}-start`, title: `Start: ${p.name}`, type: 'start', project: p });
          }
          if (p.deliveryDate?.toDate && isSameDay(p.deliveryDate.toDate(), date)) {
            events.push({ id: `${p.id}-delivery`, title: `Due: ${p.name}`, type: 'delivery', project: p });
          }
        });
      }
      if (notes) {
        notes.forEach(n => {
          const nDate = n.date?.toDate ? n.date.toDate() : new Date(n.date);
          if (isSameDay(nDate, date)) {
            events.push({ id: n.id, title: n.title, type: 'note', note: n });
          }
        });
      }
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
              {events.slice(0, 3).map((event) => (
                <div key={event.id} className={cn(
                  "text-[8px] px-1.5 py-0.5 rounded-sm truncate border flex items-center gap-1",
                  event.type === 'start' ? "bg-[#46a395]/10 text-[#46a395] border-[#46a395]/20" : 
                  event.type === 'delivery' ? "bg-orange-100 text-orange-700 border-orange-200" :
                  "bg-blue-50 text-blue-700 border-blue-100"
                )}>
                  <div className={cn(
                    "h-1 w-1 rounded-full shrink-0",
                    event.type === 'start' ? "bg-[#46a395]" : 
                    event.type === 'delivery' ? "bg-orange-500" : 
                    "bg-blue-500"
                  )} /> 
                  {event.title}
                </div>
              ))}
              {events.length > 3 && <div className="text-[7px] text-slate-400 font-bold pl-1">+{events.length - 3} more</div>}
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

  const getCombinedEvents = () => {
    const events: any[] = [];
    if (projects) {
      projects.forEach(p => {
        if (p.startDate?.toDate && isSameDay(p.startDate.toDate(), selectedDate)) 
          events.push({ title: p.name, type: 'Project Start', badge: 'default' });
        if (p.deliveryDate?.toDate && isSameDay(p.deliveryDate.toDate(), selectedDate)) 
          events.push({ title: p.name, type: 'Project Delivery', badge: 'secondary' });
      });
    }
    if (notes) {
      notes.forEach(n => {
        const nDate = n.date?.toDate ? n.date.toDate() : new Date(n.date);
        if (isSameDay(nDate, selectedDate)) 
          events.push({ title: n.title, description: n.description, type: 'Note', badge: 'outline' });
      });
    }
    return events;
  };

  const selectedDayEvents = getCombinedEvents();

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
            {selectedDayEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 opacity-50">
                <Clock className="h-8 w-8 mb-2 text-slate-300" />
                <div className="text-xs font-medium">No events</div>
                <Button variant="link" size="sm" className="text-[10px] mt-2" onClick={() => setIsDialogOpen(true)}>Add note here</Button>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDayEvents.map((event, i) => (
                  <div key={i} className="p-3 rounded-sm border border-slate-100 bg-slate-50 group hover:border-primary/30">
                    <Badge variant={event.badge as any} className="text-[8px] h-4 rounded-sm mb-1 uppercase font-bold">{event.type}</Badge>
                    <h4 className="text-xs font-bold truncate">{event.title}</h4>
                    {event.description && <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 italic">{event.description}</p>}
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
