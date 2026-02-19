'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { CalendarIcon, Timer, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirestore, useAuth, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

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
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import Link from 'next/link';

const timeEntrySchema = z.object({
  projectId: z.string().min(1, 'Please select a project'),
  date: z.date({ required_error: 'A date is required' }),
  hours: z.coerce.number().min(0.5, 'Minimum 0.5 hours').max(24, 'Maximum 24 hours'),
  description: z.string().min(1, 'Please provide a description of your work'),
});

type TimeEntryFormValues = z.infer<typeof timeEntrySchema>;

export function TimeEntryForm() {
  const { user } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const projectsCollection = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'projects') : null),
    [firestore, user?.uid]
  );
  const { data: projects, isLoading: projectsLoading } = useCollection(projectsCollection);

  const form = useForm<TimeEntryFormValues>({
    resolver: zodResolver(timeEntrySchema),
    defaultValues: {
      date: new Date(),
      hours: 8,
      description: '',
      projectId: '',
    },
  });

  const onSubmit = (data: TimeEntryFormValues) => {
    if (!firestore || !user) {
      toast({ variant: 'destructive', title: 'Error', description: 'Session not available.' });
      return;
    }

    // Use deterministic ID: userId_projectId_date
    const dateKey = format(data.date, 'yyyy-MM-dd');
    const entryId = `${user.uid}_${data.projectId}_${dateKey}`;
    const entryRef = doc(firestore, 'time_entries', entryId);

    const entryData = {
      ...data,
      userId: user.uid,
      updatedAt: serverTimestamp(),
      status: 'draft'
    };

    setDoc(entryRef, entryData, { merge: true })
      .then(() => {
        toast({
          title: 'Hours Registered',
          description: `You've successfully added ${data.hours} hours.`,
        });
        router.push('/time-sheet');
      })
      .catch((error) => {
        const permissionError = new FirestorePermissionError({
          path: `time_entries/${entryId}`,
          operation: 'write',
          requestResourceData: entryData,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  if (!user) return <div className="p-8 text-center text-slate-500">Please sign in to log hours.</div>;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="projectId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Project Reference</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-10 rounded-sm border-slate-200">
                      <SelectValue placeholder={projectsLoading ? "Loading projects..." : "Select project"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="rounded-sm">
                    {projectsLoading ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                      </div>
                    ) : (projects || []).length === 0 ? (
                      <div className="p-2 text-xs text-center text-slate-500 italic">No projects available</div>
                    ) : (
                      projects?.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={'outline'}
                        className={cn(
                          'h-10 rounded-sm pl-3 text-left font-normal border-slate-200',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-sm" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date > new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="hours"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Hours Worked</FormLabel>
              <FormControl>
                <div className="relative">
                  <Timer className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input 
                    type="number" 
                    step="0.5" 
                    min="0.5" 
                    max="24"
                    className="pl-10 h-10 rounded-sm border-slate-200" 
                    {...field} 
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Description of Work</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Summarize your activities for the day..." 
                  className="min-h-[120px] rounded-sm border-slate-200 resize-none text-sm" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-4 pt-4 border-t border-slate-100">
          <Button variant="outline" type="button" asChild className="h-10 px-8 rounded-sm text-xs font-bold uppercase">
            <Link href="/time-sheet">Cancel</Link>
          </Button>
          <Button 
            type="submit" 
            disabled={form.formState.isSubmitting} 
            className="h-10 px-10 rounded-sm text-xs font-bold uppercase shadow-sm"
          >
            {form.formState.isSubmitting ? 'Registering...' : 'Register Hours'}
          </Button>
        </div>
      </form>
    </Form>
  );
}