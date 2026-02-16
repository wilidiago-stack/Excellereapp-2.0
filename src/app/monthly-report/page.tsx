'use client';

import { useMemo } from 'react';
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
import { collection } from 'firebase/firestore';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import Link from 'next/link';

export default function MonthlyReportPage() {
  const { user, loading: userLoading } = useAuth();
  const firestore = useFirestore();

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


  return (
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
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                      <DropdownMenuItem>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
