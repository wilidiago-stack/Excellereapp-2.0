'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, CalendarDays, Search, BarChart3, TrendingUp, Filter } from 'lucide-react';
import { useFirestore, useCollection, useAuth, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc } from 'firebase/firestore';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import Link from 'next/link';
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

export default function MonthlyReportPage() {
  const { user, loading: userLoading } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const projectsCollection = useMemoFirebase(
    () => (firestore && user?.uid ? collection(firestore, 'projects') : null),
    [firestore, user?.uid]
  );
  const { data: projects, isLoading: projectsLoading } =
    useCollection(projectsCollection);

  const monthlyReportsCollection = useMemoFirebase(
    () => (firestore && user?.uid ? collection(firestore, 'monthlyReports') : null),
    [firestore, user?.uid]
  );
  const { data: monthlyReports, isLoading: reportsLoading } =
    useCollection(monthlyReportsCollection);

  const loading = userLoading || projectsLoading || reportsLoading;

  const projectMap = (projects || []).reduce((acc: any, p: any) => {
    acc[p.id] = p.name;
    return acc;
  }, {});

  const filteredReports = monthlyReports?.filter(r => 
    projectMap[r.projectId]?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `${r.month}/${r.year}`.includes(searchQuery)
  ) || [];
  
  const handleDelete = () => {
    if (!firestore || !selectedReport) return;
    const reportDocRef = doc(firestore, 'monthlyReports', selectedReport.id);

    deleteDoc(reportDocRef)
      .then(() => {
        toast({
          title: 'Report Deleted',
          description: `The monthly report has been deleted.`,
        });
        setShowDeleteDialog(false);
        setSelectedReport(null);
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: reportDocRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
        setShowDeleteDialog(false);
        setSelectedReport(null);
      });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] gap-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Monthly Reports</h1>
          <p className="text-xs text-muted-foreground">Strategic monthly summaries and project KPIs.</p>
        </div>
        <Button asChild size="sm" className="h-8 rounded-sm gap-2">
          <Link href="/monthly-report/new">
            <PlusCircle className="h-3.5 w-3.5" />
            Create Report
          </Link>
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-2 flex-1 min-h-0">
        {/* Sidebar: Analytics Sidebar */}
        <Card className="w-full md:w-72 shrink-0 rounded-sm border-slate-200 shadow-sm flex flex-col">
          <CardHeader className="p-4 border-b bg-slate-50/50">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input 
                placeholder="Search monthly records..." 
                className="pl-8 h-9 bg-white border-slate-200 text-xs" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-4 flex-1 overflow-y-auto no-scrollbar space-y-4">
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reporting Status</h4>
              <div className="grid grid-cols-1 gap-2">
                <div className="p-3 rounded-sm border border-slate-100 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium">Total Summaries</span>
                  </div>
                  <span className="text-xs font-bold">{monthlyReports?.length || 0}</span>
                </div>
                <div className="p-3 rounded-sm border border-slate-100 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-3.5 w-3.5 text-[#46a395]" />
                    <span className="text-xs font-medium">Reports Pending</span>
                  </div>
                  <span className="text-xs font-bold text-orange-500">2</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Report Calendar</h4>
              <div className="grid grid-cols-3 gap-1">
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map(m => (
                  <Badge key={m} variant="outline" className="text-[8px] justify-center py-1 rounded-sm cursor-pointer hover:bg-slate-100">{m}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content: Reports Table */}
        <Card className="flex-1 overflow-hidden flex flex-col rounded-sm border-slate-200 shadow-sm">
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <Table>
              <TableHeader className="bg-slate-50/50 sticky top-0 z-10">
                <TableRow className="hover:bg-transparent border-b-slate-200">
                  <TableHead className="text-[11px] font-bold h-10">Project Reference</TableHead>
                  <TableHead className="text-[11px] font-bold h-10 text-center">Period</TableHead>
                  <TableHead className="text-[11px] font-bold h-10">Summary Excerpt</TableHead>
                  <TableHead className="h-10 w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [1, 2, 3, 4, 5].map(i => (
                    <TableRow key={i}>
                      <TableCell colSpan={4}><Skeleton className="h-10 w-full rounded-sm" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredReports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-xs text-slate-500">
                      No monthly records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReports.map((report: any) => (
                    <TableRow key={report.id} className="hover:bg-slate-50/50 border-b-slate-100 group">
                      <TableCell className="py-2.5">
                        <span className="text-xs font-bold">{projectMap[report.projectId] || report.projectId}</span>
                      </TableCell>
                      <TableCell className="py-2.5 text-center">
                        <Badge variant="secondary" className="text-[10px] rounded-sm bg-slate-100">
                          {report.month}/{report.year}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <p className="text-[10px] text-slate-500 line-clamp-1 max-w-[300px]">
                          {report.summary}
                        </p>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm opacity-0 group-hover:opacity-100">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-sm">
                            <DropdownMenuItem asChild className="text-xs cursor-pointer">
                               <Link href={`/monthly-report/${report.id}`}>View Analysis</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                               onClick={() => { setSelectedReport(report); setShowDeleteDialog(true); }}
                              className="text-xs text-destructive cursor-pointer"
                            >
                              Archive Record
                            </DropdownMenuItem>
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
            <AlertDialogTitle>Archive Monthly Record?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to remove the analysis for <strong>{projectMap[selectedReport?.projectId]}</strong> ({selectedReport?.month}/{selectedReport?.year})?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-sm text-xs h-8">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-sm text-xs h-8">
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
