'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { PlusCircle, MoreHorizontal, FileText, Search, FileEdit, Eye, Calendar as CalendarIcon } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, query, where } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
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

export default function DailyReportPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { selectedProjectId } = useProjectContext();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const dailyReportsCollection = useMemoFirebase(
    () => {
      if (!firestore) return null;
      let ref = collection(firestore, 'dailyReports');
      if (selectedProjectId) {
        return query(ref, where('projectId', '==', selectedProjectId));
      }
      return ref;
    },
    [firestore, selectedProjectId]
  );
  const { data: dailyReports, isLoading: reportsLoading } = useCollection(dailyReportsCollection);

  const projectsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'projects') : null),
    [firestore]
  );
  const { data: projectsData, isLoading: projectsLoading } = useCollection(projectsCollection);

  const projectMap = (projectsData || []).reduce((acc: any, p: any) => {
    acc[p.id] = p.name;
    return acc;
  }, {});

  const filteredReports = dailyReports?.filter(r => 
    projectMap[r.projectId]?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.username?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const loading = reportsLoading || projectsLoading;
  
  const handleDelete = () => {
    if (!firestore || !selectedReport) return;
    const reportDocRef = doc(firestore, 'dailyReports', selectedReport.id);

    deleteDoc(reportDocRef)
      .then(() => {
        toast({ title: 'Report Deleted', description: 'The daily report has been deleted.' });
        setShowDeleteDialog(false);
        setSelectedReport(null);
      })
      .catch((serverError) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: reportDocRef.path, operation: 'delete' }));
        setShowDeleteDialog(false);
        setSelectedReport(null);
      });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] gap-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Daily Reports</h1>
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span>Track site conditions.</span>
            {selectedProjectId && (
              <Badge variant="secondary" className="h-4 rounded-sm text-[9px] bg-[#46a395]/10 text-[#46a395] border-[#46a395]/20 font-bold">
                Project Filter Active
              </Badge>
            )}
          </div>
        </div>
        <Button asChild size="sm" className="h-8 rounded-sm gap-2">
          <Link href="/daily-report/new">
            <PlusCircle className="h-3.5 w-3.5" /> New Report
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
          <CardContent className="p-4 flex-1 overflow-y-auto no-scrollbar space-y-4">
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Project Logs</h4>
              <div className="p-3 rounded-sm border border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium">Visible Records</span>
                </div>
                <span className="text-xs font-bold">{filteredReports.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1 overflow-hidden flex flex-col rounded-sm border-slate-200 shadow-sm">
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <Table>
              <TableHeader className="bg-slate-50/50 sticky top-0 z-10">
                <TableRow className="hover:bg-transparent border-b-slate-200">
                  <TableHead className="text-[11px] font-bold h-10"><div className="flex items-center gap-1"><CalendarIcon className="h-3 w-3"/> Date</div></TableHead>
                  <TableHead className="text-[11px] font-bold h-10">Project</TableHead>
                  <TableHead className="text-[11px] font-bold h-10">Author</TableHead>
                  <TableHead className="h-10 w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [1, 2, 3].map(i => <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-10 w-full" /></TableCell></TableRow>)
                ) : filteredReports.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="h-32 text-center text-xs text-slate-500">No reports found for this view.</TableCell></TableRow>
                ) : (
                  filteredReports.map((report: any) => (
                    <TableRow key={report.id} className="hover:bg-slate-50/50 border-b-slate-100 group">
                      <TableCell className="py-2.5 text-xs font-semibold">{report.date ? format(report.date.toDate(), 'PPP') : 'N/A'}</TableCell>
                      <TableCell className="py-2.5 text-xs font-bold">{projectMap[report.projectId] || 'Unknown'}</TableCell>
                      <TableCell className="py-2.5 text-xs text-slate-500">{report.username}</TableCell>
                      <TableCell className="py-2.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm opacity-0 group-hover:opacity-100"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-sm">
                            <DropdownMenuItem asChild className="text-xs cursor-pointer">
                              <Link href={`/daily-report/${report.id}`} className="flex items-center gap-2">
                                <Eye className="h-3.5 w-3.5" /> View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild className="text-xs cursor-pointer">
                              <Link href={`/daily-report/${report.id}/edit`} className="flex items-center gap-2">
                                <FileEdit className="h-3.5 w-3.5" /> Edit Report
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSelectedReport(report); setShowDeleteDialog(true); }} className="text-xs text-destructive cursor-pointer">Discard</DropdownMenuItem>
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
            <AlertDialogTitle>Discard Report?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">Permanently remove this daily record? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-sm text-xs h-8">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-sm text-xs h-8">Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}