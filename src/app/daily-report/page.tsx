'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { 
  PlusCircle, 
  MoreHorizontal, 
  FileText, 
  Search, 
  FileEdit, 
  Eye, 
  Calendar as CalendarIcon,
  Download,
  Upload
} from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useAuth } from '@/firebase';
import { collection, doc, deleteDoc, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import * as XLSX from 'xlsx';

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
  const { user, role } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { selectedProjectId } = useProjectContext();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const isAdmin = role === 'admin';

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

  const handleExport = () => {
    if (!filteredReports.length) {
      toast({ variant: 'destructive', title: "No data", description: "There is no data to export." });
      return;
    }

    // Prepare data for Excel (Flattening complex objects)
    const exportData = filteredReports.map(r => ({
      ID: r.id,
      Date: r.date ? format(r.date.toDate ? r.date.toDate() : new Date(r.date), 'yyyy-MM-dd') : 'N/A',
      Project: projectMap[r.projectId] || 'Unknown',
      Author: r.username,
      Shift: r.shift,
      Weather_City: r.weather?.city || '',
      Weather_Conditions: r.weather?.conditions || '',
      Weather_High: r.weather?.highTemp || 0,
      Weather_Low: r.weather?.lowTemp || 0,
      Weather_Wind: r.weather?.wind || 0,
      Safety_Incidents: r.safetyStats?.recordableIncidents || 0,
      Safety_FirstAid: r.safetyStats?.lightFirstAids || 0,
      // Metadata fields as JSON strings to preserve complex structure if needed
      Activities_JSON: JSON.stringify(r.dailyActivities || []),
      ManHours_JSON: JSON.stringify(r.manHours || []),
      Notes_JSON: JSON.stringify(r.notes || [])
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Daily Reports");
    
    // Auto-size columns
    const columnWidths = Object.keys(exportData[0]).map(key => ({
      wch: Math.max(key.length, 15)
    }));
    worksheet['!cols'] = columnWidths;

    XLSX.writeFile(workbook, `daily-reports-export-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast({ title: "Export Complete", description: "Excel file has been downloaded." });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !firestore || !user) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (Array.isArray(jsonData)) {
          jsonData.forEach((row) => {
            // Reconstruct the report object from flat Excel structure
            const reportToImport: any = {
              username: row.Author,
              shift: row.Shift,
              projectId: Object.keys(projectMap).find(id => projectMap[id] === row.Project) || '',
              date: row.Date ? new Date(row.Date) : new Date(),
              weather: {
                city: row.Weather_City || '',
                conditions: row.Weather_Conditions || '',
                highTemp: row.Weather_High || 0,
                lowTemp: row.Weather_Low || 0,
                wind: row.Weather_Wind || 0,
              },
              safetyStats: {
                recordableIncidents: row.Safety_Incidents || 0,
                lightFirstAids: row.Safety_FirstAid || 0,
              },
              dailyActivities: row.Activities_JSON ? JSON.parse(row.Activities_JSON) : [],
              manHours: row.ManHours_JSON ? JSON.parse(row.ManHours_JSON) : [],
              notes: row.Notes_JSON ? JSON.parse(row.Notes_JSON) : [],
              importedAt: serverTimestamp(),
            };
            
            addDoc(collection(firestore, 'dailyReports'), reportToImport)
              .catch(err => {
                 errorEmitter.emit('permission-error', new FirestorePermissionError({
                   path: 'dailyReports',
                   operation: 'create',
                   requestResourceData: reportToImport
                 }));
              });
          });
          toast({ title: "Import Started", description: `Importing ${jsonData.length} records from Excel...` });
        } else {
          toast({ variant: 'destructive', title: "Import Failed", description: "Excel file is empty or invalid." });
        }
      } catch (err) {
        console.error("Import Error:", err);
        toast({ variant: 'destructive', title: "Import Failed", description: "Could not process Excel file. Ensure data format is correct." });
      }
      e.target.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] gap-2">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold tracking-tight text-slate-800">Daily Reports</h1>
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span>Track site conditions.</span>
            {selectedProjectId && (
              <Badge variant="secondary" className="h-4 rounded-sm text-[9px] bg-[#46a395]/10 text-[#46a395] border-[#46a395]/20 font-bold">
                Project Filter Active
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <Button variant="outline" size="sm" onClick={handleExport} className="h-8 rounded-sm gap-2">
                <Download className="h-3.5 w-3.5" /> Export Excel
              </Button>
              <div className="relative">
                <Button variant="outline" size="sm" onClick={() => document.getElementById('import-input')?.click()} className="h-8 rounded-sm gap-2">
                  <Upload className="h-3.5 w-3.5" /> Import Excel
                </Button>
                <input id="import-input" type="file" accept=".xlsx, .xls" onChange={handleImport} className="hidden" />
              </div>
            </>
          )}
          <Button asChild size="sm" className="h-8 rounded-sm gap-2">
            <Link href="/daily-report/new">
              <PlusCircle className="h-3.5 w-3.5" /> New Report
            </Link>
          </Button>
        </div>
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
                      <TableCell className="py-2.5 text-xs font-semibold">{report.date ? format(report.date.toDate ? report.date.toDate() : new Date(report.date), 'PPP') : 'N/A'}</TableCell>
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
