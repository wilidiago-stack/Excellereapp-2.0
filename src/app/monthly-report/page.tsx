'use client';

import { useMemo, useState } from 'react';
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
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { useFirestore, useCollection, useAuth } from '@/firebase';
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

export default function MonthlyReportPage() {
  const { user, loading: userLoading } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);

  const projectsCollection = useMemo(
    () => (firestore && user ? collection(firestore, 'projects') : null),
    [firestore, user]
  );
  const { data: projects, loading: projectsLoading } =
    useCollection(projectsCollection);

  const monthlyReportsCollection = useMemo(
    () => (firestore && user ? collection(firestore, 'monthlyReports') : null),
    [firestore, user]
  );
  const { data: monthlyReports, loading: reportsLoading } =
    useCollection(monthlyReportsCollection);

  const loading = userLoading || projectsLoading || reportsLoading;

  const projectMap = useMemo(() => {
    if (!projects) return {};
    return projects.reduce((acc: any, p: any) => {
      acc[p.id] = p.name;
      return acc;
    }, {});
  }, [projects]);
  
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
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Monthly Reports</CardTitle>
            <CardDescription>Manage your monthly reports here.</CardDescription>
          </div>
          <Button asChild>
            <Link href="/monthly-report/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create new report
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Month</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              )}
              {!loading && monthlyReports?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No monthly reports found.
                  </TableCell>
                </TableRow>
              )}
              {monthlyReports?.map((report: any) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">
                    {projectMap[report.projectId] || report.projectId}
                  </TableCell>
                  <TableCell>{report.month}</TableCell>
                  <TableCell>{report.year}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem asChild>
                           <Link href={`/monthly-report/${report.id}`}>View Details</Link>
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
              This action cannot be undone. This will permanently delete the monthly report for project{' '}
              <strong>{projectMap[selectedReport?.projectId]}</strong> from{' '}
              <strong>{selectedReport?.month}/{selectedReport?.year}</strong>.
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
