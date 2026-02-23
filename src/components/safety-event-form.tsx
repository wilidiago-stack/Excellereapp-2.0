
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, startOfDay } from 'date-fns';
import { useRouter } from 'next/navigation';
import { CalendarIcon, ShieldAlert, History, ClipboardCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth, useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useProjectContext } from '@/context/project-context';

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

const safetyEventSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  date: z.date({ required_error: 'Date is required' }),
  type: z.enum(['Incident', 'Near Miss', 'Observation', 'Safety Meeting', 'Inspection']),
  severity: z.enum(['Low', 'Medium', 'High', 'Critical']),
  description: z.string().min(1, 'Description is required'),
  location: z.string().optional(),
  correctiveActions: z.string().optional(),
  status: z.enum(['Open', 'In Progress', 'Closed']),
});

type SafetyEventFormValues = z.infer<typeof safetyEventSchema>;

interface SafetyEventFormProps {
  initialData?: any;
}

export function SafetyEventForm({ initialData }: SafetyEventFormProps) {
  const { user } = useAuth();
  const firestore = useFirestore();
  const { selectedProjectId } = useProjectContext();
  const { toast } = useToast();
  const router = useRouter();
  const isEditMode = !!initialData?.id;

  const projectsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'projects') : null),
    [firestore]
  );
  const { data: projects } = useCollection(projectsCollection);

  const form = useForm<SafetyEventFormValues>({
    resolver: zodResolver(safetyEventSchema),
    defaultValues: {
      projectId: selectedProjectId || '',
      date: new Date(),
      type: 'Observation',
      severity: 'Low',
      description: '',
      location: '',
      correctiveActions: '',
      status: 'Open',
    },
  });

  useEffect(() => {
    if (initialData) {
      const formattedData = {
        ...initialData,
        date: initialData.date?.toDate ? initialData.date.toDate() : (initialData.date instanceof Date ? initialData.date : new Date()),
      };
      form.reset(formattedData);
    }
  }, [initialData, form]);

  const onSubmit = (data: SafetyEventFormValues) => {
    if (!firestore || !user) return;

    const payload = {
      ...data,
      date: startOfDay(data.date),
      updatedAt: serverTimestamp(),
      authorId: user.uid,
      authorName: user.displayName || 'Anonymous',
    };

    const targetCollection = collection(firestore, 'safetyEvents');

    if (isEditMode) {
      const docRef = doc(firestore, 'safetyEvents', initialData.id);
      updateDoc(docRef, payload)
        .then(() => {
          toast({ title: 'Safety Event Updated', description: 'Changes saved successfully.' });
          router.push('/safety-events');
        })
        .catch((error) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: payload,
          }));
        });
    } else {
      addDoc(targetCollection, payload)
        .then(() => {
          toast({ title: 'Safety Event Created', description: 'The record has been added to the system.' });
          router.push('/safety-events');
        })
        .catch((error) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: targetCollection.path,
            operation: 'create',
            requestResourceData: payload,
          }));
        });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="projectId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Project Context</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-10 rounded-sm border-slate-200">
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {projects?.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
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
                <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Event Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button variant="outline" className={cn("h-10 pl-3 text-left font-normal border-slate-200", !field.value && "text-muted-foreground")}>
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Event Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-10 rounded-sm border-slate-200">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Observation">Observation</SelectItem>
                    <SelectItem value="Near Miss">Near Miss</SelectItem>
                    <SelectItem value="Incident">Incident</SelectItem>
                    <SelectItem value="Safety Meeting">Safety Meeting</SelectItem>
                    <SelectItem value="Inspection">Inspection</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="severity"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Severity Level</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-10 rounded-sm border-slate-200">
                      <SelectValue placeholder="Select severity" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Specific Location</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Area 4, Floor 2" {...field} className="h-10 rounded-sm border-slate-200" />
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
              <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Detailed Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe the event in detail..." className="min-h-[100px] rounded-sm border-slate-200" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="correctiveActions"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Corrective Actions Taken</FormLabel>
              <FormControl>
                <Textarea placeholder="What steps were taken to resolve or prevent recurrence?" className="min-h-[100px] rounded-sm border-slate-200" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Current Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="h-10 rounded-sm border-slate-200">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-4 pt-6 border-t border-slate-100">
          <Button variant="outline" type="button" asChild className="h-10 px-8 rounded-sm text-xs font-bold uppercase">
            <Link href="/safety-events">Cancel</Link>
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting} className="h-10 px-10 rounded-sm text-xs font-bold uppercase shadow-md">
            {form.formState.isSubmitting ? 'Saving...' : isEditMode ? 'Update Event' : 'Register Event'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
