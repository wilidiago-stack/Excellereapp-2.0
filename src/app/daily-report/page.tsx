'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { PlusCircle, MoreHorizontal } from 'lucide-react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, doc, deleteDoc } from 'firebase/firestore';

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

export default function DailyReportPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);

  const dailyReportsCollection = useMemo(
    () => (firestore ? collection(firestore, 'dailyReports') : null),
    [firestore]
  );
  const { data: dailyReports, loading: reportsLoading } =
    useCollection(dailyReportsCollection);

  const projectsCollection = useMemo(
    () => (firestore ? collection(firestore, 'projects') : null),
    [firestore]
  );
  const { data: projectsData, loading: projectsLoading } =
    useCollection(projectsCollection);

  const projectMap = useMemo(() => {
    if (!projectsData) return {};
    return projectsData.reduce((acc: any, p: any) => {
      acc[p.id] = p.name;
      return acc;
    }, {});
  }, [projectsData]);

  const loading = reportsLoading || projectsLoading;
  
  const handleDelete = () => {
    if (!firestore || !selectedReport) return;
    const reportDocRef = doc(firestore, 'dailyReports', selectedReport.id);

    deleteDoc(reportDocRef)
      .then(() => {
        toast({
          title: 'Report Deleted',
          description: `The daily report has been deleted.`,
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
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Daily Reports</CardTitle>
            <CardDescription>Manage your daily reports here.</CardDescription>
          </div>
          <Button asChild>
            <Link href="/daily-report/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create new report
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead>Submitted By</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              )}
              {!loading && dailyReports?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No daily reports found.
                  </TableCell>
                </TableRow>
              )}
              {dailyReports?.map((report: any) => (
                <TableRow key={report.id}>
                  <TableCell>
                    {report.date ? format(report.date.toDate(), 'PPP') : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {projectMap[report.projectId] || report.projectId}
                  </TableCell>
                  <TableCell>{report.shift}</TableCell>
                  <TableCell>{report.username}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem asChild>
                           <Link href={`/daily-report/${report.id}`}>View Details</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedReport(report);
                            setShowDeleteDialog(true);
                          }}
                          className="text-destructive"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              daily report for{' '}
              <strong>
                {selectedReport?.date
                  ? format(selectedReport.date.toDate(), 'PPP')
                  : 'this report'}
              </strong>
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
