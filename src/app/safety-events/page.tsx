
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { 
  PlusCircle, 
  MoreHorizontal, 
  ShieldAlert, 
  Search, 
  Eye, 
  FileEdit, 
  AlertTriangle,
  ClipboardCheck,
  Calendar as CalendarIcon
} from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useAuth } from '@/firebase';
import { collection, doc, deleteDoc, query, where } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useProjectContext } from '@/context/project-context';
import { cn } from '@/lib/utils';

export default function SafetyEventsPage() {
  const { role } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { selectedProjectId } = useProjectContext();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const safetyEventsCollection = useMemoFirebase(
    () => {
      if (!firestore) return null;
      let ref = collection(firestore, 'safetyEvents');
      if (selectedProjectId) {
        return query(ref, where('projectId', '==', selectedProjectId));
      }
      return ref;
    },
    [firestore, selectedProjectId]
  );
  const { data: events, isLoading: eventsLoading } = useCollection(safetyEventsCollection);

  const projectsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'projects') : null),
    [firestore]
  );
  const { data: projectsData } = useCollection(projectsCollection);

  const projectMap = (projectsData || []).reduce((acc: any, p: any) => {
    acc[p.id] = p.name;
    return acc;
  }, {});

  const filteredEvents = events?.filter(e => 
    projectMap[e.projectId]?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.type?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleDelete = () => {
    if (!firestore || !selectedEvent) return;
    const docRef = doc(firestore, 'safetyEvents', selectedEvent.id);

    deleteDoc(docRef)
      .then(() => {
        toast({ title: 'Record Removed', description: 'The safety event has been deleted.' });
        setShowDeleteDialog(false);
        setSelectedEvent(null);
      })
      .catch((serverError) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'delete' }));
        setShowDeleteDialog(false);
      });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-red-500 hover:bg-red-600';
      case 'High': return 'bg-orange-500 hover:bg-orange-600';
      case 'Medium': return 'bg-yellow-500 hover:bg-yellow-600 text-black';
      case 'Low': return 'bg-blue-500 hover:bg-blue-600';
      default: return 'bg-slate-500';
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] gap-2">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold tracking-tight text-slate-800">Safety Events</h1>
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span>Operational risk tracking.</span>
            {selectedProjectId && (
              <Badge variant="secondary" className="h-4 rounded-sm text-[9px] bg-[#46a395]/10 text-[#46a395] font-bold">
                Project Filter Active
              </Badge>
            )}
          </div>
        </div>
        <Button asChild size="sm" className="h-8 rounded-sm gap-2">
          <Link href="/safety-events/new">
            <PlusCircle className="h-3.5 w-3.5" /> New Event
          </Link>
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-2 flex-1 min-h-0">
        <Card className="w-full md:w-72 shrink-0 rounded-sm border-slate-200 shadow-sm flex flex-col">
          <CardHeader className="p-4 border-b bg-slate-50/50">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input 
                placeholder="Search logs..." 
                className="pl-8 h-9 bg-white border-slate-200 text-xs" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-4 flex-1 overflow-y-auto no-scrollbar space-y-6">
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">System Activity</h4>
              <div className="p-3 rounded-sm border border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium">Recorded Events</span>
                </div>
                <span className="text-xs font-bold">{filteredEvents.length}</span>
              </div>
            </div>
            
            <div className="pt-4 border-t space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Risk Profile</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="text-red-500 uppercase">Critical / High</span>
                  <span>{filteredEvents.filter(e => e.severity === 'Critical' || e.severity === 'High').length}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="text-orange-500 uppercase">Medium</span>
                  <span>{filteredEvents.filter(e => e.severity === 'Medium').length}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="text-blue-500 uppercase">Observations</span>
                  <span>{filteredEvents.filter(e => e.type === 'Observation').length}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1 overflow-hidden flex flex-col rounded-sm border-slate-200 shadow-sm">
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <Table>
              <TableHeader className="bg-slate-50/50 sticky top-0 z-10">
                <TableRow className="hover:bg-transparent border-b-slate-200">
                  <TableHead className="text-[11px] font-bold h-10 w-32 px-6">Date</TableHead>
                  <TableHead className="text-[11px] font-bold h-10">Type</TableHead>
                  <TableHead className="text-[11px] font-bold h-10">Description</TableHead>
                  <TableHead className="text-[11px] font-bold h-10 text-center">Severity</TableHead>
                  <TableHead className="text-[11px] font-bold h-10 text-center">Status</TableHead>
                  <TableHead className="h-10 w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eventsLoading ? (
                  [1, 2, 3].map(i => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell></TableRow>)
                ) : filteredEvents.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="h-32 text-center text-xs text-slate-500">No safety events found.</TableCell></TableRow>
                ) : (
                  filteredEvents.map((event: any) => (
                    <TableRow key={event.id} className="hover:bg-slate-50/50 border-b-slate-100 group transition-colors">
                      <TableCell className="py-2.5 px-6">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-700">{event.date ? (event.date.toDate ? format(event.date.toDate(), 'MMM dd, yyyy') : format(new Date(event.date), 'MMM dd, yyyy')) : 'N/A'}</span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase">{projectMap[event.projectId] || 'Project'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <Badge variant="outline" className="text-[9px] h-5 rounded-sm font-black uppercase tracking-tighter">
                          {event.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <p className="text-xs text-slate-600 line-clamp-1 max-w-md">{event.description}</p>
                      </TableCell>
                      <TableCell className="py-2.5 text-center">
                        <Badge className={cn("text-[9px] h-5 rounded-sm font-bold uppercase border-none", getSeverityColor(event.severity))}>
                          {event.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2.5 text-center">
                        <Badge variant={event.status === 'Closed' ? 'secondary' : 'default'} className="text-[9px] h-5 rounded-sm font-black uppercase">
                          {event.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm opacity-0 group-hover:opacity-100"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-sm">
                            <DropdownMenuItem asChild className="text-xs cursor-pointer">
                              <Link href={`/safety-events/${event.id}`} className="flex items-center gap-2">
                                <Eye className="h-3.5 w-3.5" /> View Record
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild className="text-xs cursor-pointer">
                              <Link href={`/safety-events/${event.id}/edit`} className="flex items-center gap-2">
                                <FileEdit className="h-3.5 w-3.5" /> Modify
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSelectedEvent(event); setShowDeleteDialog(true); }} className="text-xs text-destructive cursor-pointer">Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Safety Record?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">This will permanently remove the record. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-sm text-xs h-8">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-sm text-xs h-8">Delete Permanently</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
