'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useFirestore, useCollection, useAuth, useMemoFirebase } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const monthlyReportSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  month: z.coerce.number().min(1, 'Month is required').max(12),
  year: z.coerce.number().min(2000, 'Year is required').max(2100),
  summary: z.string().min(1, 'Summary is required'),
});

type MonthlyReportFormValues = z.infer<typeof monthlyReportSchema>;

export function MonthlyReportForm() {
  const { user } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const projectsCollection = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'projects') : null),
    [firestore, user]
  );
  const { data: projects } = useCollection(projectsCollection);

  const monthlyReportsCollection = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'monthlyReports') : null),
    [firestore, user]
  );

  const form = useForm<MonthlyReportFormValues>({
    resolver: zodResolver(monthlyReportSchema),
    defaultValues: {
      projectId: '',
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      summary: '',
    },
  });

  const onSubmit = (data: MonthlyReportFormValues) => {
    if (!firestore || !user || !monthlyReportsCollection) return;

    const reportData = { ...data, authorId: user.uid };

    addDoc(monthlyReportsCollection, reportData)
      .then(() => {
        toast({
          title: 'Monthly Report Created',
          description: 'Your monthly report has been saved.',
        });
        router.push('/monthly-report');
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: 'monthlyReports',
          operation: 'create',
          requestResourceData: reportData,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
      >
        <FormField
          control={form.control}
          name="projectId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {projects?.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="month"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Month</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="MM" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="year"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Year</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="YYYY" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="summary"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Summary</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Provide a summary of the month's activities"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-4 pt-4">
            <Button variant="outline" type="button" asChild>
                <Link href="/monthly-report">Cancel</Link>
            </Button>
            <Button
                type="submit"
                disabled={form.formState.isSubmitting}
            >
                {form.formState.isSubmitting
                ? 'Creating...'
                : 'Create report'}
            </Button>
        </div>
      </form>
    </Form>
  );
}
