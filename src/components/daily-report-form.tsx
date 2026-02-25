'use client';

import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, startOfDay } from 'date-fns';
import { useRouter } from 'next/navigation';
import {
  CalendarIcon,
  PlusCircle,
  Trash2,
  CloudSun,
  Clock,
  MapPin,
  ClipboardList,
  Loader2,
  Mic,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useAuth,
  useCollection,
  useMemoFirebase,
  useFirestore,
} from '@/firebase';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useProjectContext } from '@/context/project-context';
import { getRealWeather } from '@/ai/flows/get-weather-flow';
import { processReportVoice } from '@/ai/flows/process-report-voice-flow';

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
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const manHourSchema = z.object({
  contractorId: z.string().min(1, 'Please select a contractor'),
  headcount: z.coerce.number().min(0).default(0),
  hours: z.coerce.number().min(0).default(0),
});

const dailyActivitySchema = z.object({
  contractorId: z.string().min(1, 'Please select a contractor'),
  activity: z.string().min(1, 'Activity is required'),
  location: z.string().min(1, 'Location is required'),
  permits: z.array(z.string()).default([]),
});

const noteSchema = z.object({
  note: z.string().min(1, 'Note is required'),
  status: z.string().min(1, 'Status is required'),
});

const dailyReportSchema = z.object({
  date: z.date({ required_error: 'A date is required.' }),
  username: z.string().min(1, 'Username is required'),
  projectId: z.string().min(1, 'Please select a project.'),
  shift: z.enum(['Day', 'Night']),
  weather: z.object({
    city: z.string().min(1, 'City is required'),
    conditions: z.string().min(1, 'Conditions are required'),
    highTemp: z.coerce.number(),
    lowTemp: z.coerce.number(),
    wind: z.coerce.number().min(0),
  }),
  safetyStats: z.object({
    recordableIncidents: z.coerce.number().int().min(0).default(0),
    lightFirstAids: z.coerce.number().int().min(0).default(0),
    safetyMeeting: z.coerce.number().int().min(0).default(0),
    toolBoxTalks: z.coerce.number().int().min(0).default(0),
    admSiteOrientation: z.coerce.number().int().min(0).default(0),
    bbsGemba: z.coerce.number().int().min(0).default(0),
    operationsStandDowns: z.coerce.number().int().min(0).default(0),
  }),
  manHours: z.array(manHourSchema).default([]),
  dailyActivities: z.array(dailyActivitySchema).default([]),
  notes: z.array(noteSchema).default([]),
});

type DailyReportFormValues = z.infer<typeof dailyReportSchema>;

export function DailyReportForm({ initialData }: { initialData?: any }) {
  const { user } = useAuth();
  const firestore = useFirestore();
  const { selectedProjectId } = useProjectContext();
  const { toast } = useToast();
  const router = useRouter();
  const isEditMode = !!initialData?.id;
  const [isListening, setIsListening] = useState(false);

  const projectsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'projects') : null),
    [firestore]
  );
  const { data: projectsData } = useCollection(projectsCollection);

  const contractorsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'contractors') : null),
    [firestore]
  );
  const { data: contractorsData } = useCollection(contractorsCollection);

  const projects = (projectsData || []).map((p: any) => ({
    id: p.id,
    label: p.name,
    city: p.city,
  }));
  const contractors = (contractorsData || []).map((c: any) => ({
    id: c.id,
    label: c.name,
  }));

  const form = useForm<DailyReportFormValues>({
    resolver: zodResolver(dailyReportSchema),
    defaultValues: {
      date: new Date(),
      username: user?.displayName || '',
      projectId: selectedProjectId || '',
      shift: 'Day',
      weather: { city: '', conditions: '', highTemp: 0, lowTemp: 0, wind: 0 },
      safetyStats: {
        recordableIncidents: 0,
        lightFirstAids: 0,
        safetyMeeting: 0,
        toolBoxTalks: 0,
        admSiteOrientation: 0,
        bbsGemba: 0,
        operationsStandDowns: 0,
      },
      manHours: [],
      dailyActivities: [],
      notes: [],
    },
  });

  const { fields: manHourFields, append: appendManHour, remove: removeManHour } = useFieldArray({
    control: form.control,
    name: 'manHours',
  });
  const { fields: dailyActivityFields, append: appendDailyActivity, remove: removeDailyActivity } = useFieldArray({
    control: form.control,
    name: 'dailyActivities',
  });
  const { fields: noteFields, append: appendNote, remove: removeNote } = useFieldArray({
    control: form.control,
    name: 'notes',
  });

  useEffect(() => {
    if (initialData && initialData.id) {
      const data = {
        date: initialData.date?.toDate ? initialData.date.toDate() : new Date(initialData.date),
        username: initialData.username || user?.displayName || '',
        projectId: initialData.projectId || '',
        shift: initialData.shift || 'Day',
        weather: {
          city: initialData.weather?.city || '',
          conditions: initialData.weather?.conditions || '',
          highTemp: Number(initialData.weather?.highTemp) || 0,
          lowTemp: Number(initialData.weather?.lowTemp) || 0,
          wind: Number(initialData.weather?.wind) || 0,
        },
        safetyStats: {
          recordableIncidents: Number(initialData.safetyStats?.recordableIncidents) || 0,
          lightFirstAids: Number(initialData.safetyStats?.lightFirstAids) || 0,
          safetyMeeting: Number(initialData.safetyStats?.safetyMeeting) || 0,
          toolBoxTalks: Number(initialData.safetyStats?.toolBoxTalks) || 0,
          admSiteOrientation: Number(initialData.safetyStats?.admSiteOrientation) || 0,
          bbsGemba: Number(initialData.safetyStats?.bbsGemba) || 0,
          operationsStandDowns: Number(initialData.safetyStats?.operationsStandDowns) || 0,
        },
        manHours: (initialData.manHours || []).map((mh: any) => ({
          contractorId: mh.contractorId || '',
          headcount: Number(mh.headcount) || 0,
          hours: Number(mh.hours) || 0,
        })),
        dailyActivities: (initialData.dailyActivities || []).map((act: any) => ({
          contractorId: act.contractorId || '',
          activity: act.activity || '',
          location: act.location || '',
          permits: act.permits || [],
        })),
        notes: (initialData.notes || []).map((n: any) => ({
          note: n.note || '',
          status: n.status || 'Open',
        })),
      };
      form.reset(data);
    }
  }, [initialData, form, user?.displayName]);

  const onSubmit = async (data: DailyReportFormValues) => {
    if (!firestore || !user) return;
    const payload = { ...data, date: startOfDay(data.date), updatedAt: serverTimestamp() };
    const ref = isEditMode ? doc(firestore, 'dailyReports', initialData.id) : collection(firestore, 'dailyReports');
    
    const op = isEditMode 
      ? updateDoc(ref as any, payload) 
      : addDoc(ref as any, { ...payload, authorId: user.uid, createdAt: serverTimestamp() });

    op.then(() => {
      toast({ title: 'Report Saved', description: 'Log processed successfully.' });
      router.push('/daily-report');
    }).catch(err => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: isEditMode ? `dailyReports/${initialData.id}` : 'dailyReports',
        operation: 'write',
        requestResourceData: payload,
      }));
    });
  };

  const totalGeneralManHours = (form.watch('manHours') || []).reduce(
    (acc, curr) => acc + (Number(curr.headcount) || 0) * (Number(curr.hours) || 0),
    0
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10 relative">
        <div className="fixed bottom-6 right-6 z-50">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  onClick={() => {
                    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                    if (!SR) return toast({ variant: 'destructive', title: 'Not Supported' });
                    const r = new SR();
                    r.onstart = () => setIsListening(true);
                    r.onresult = (e: any) => processReportVoice(e.results[0][0].transcript).then(ext => {
                      if (ext.manHours) ext.manHours.forEach(m => appendManHour({ 
                        contractorId: '', 
                        headcount: m.headcount, 
                        hours: m.hours 
                      }));
                      toast({ title: 'AI Sync Complete' });
                    });
                    r.onend = () => setIsListening(false);
                    r.start();
                  }}
                  className={cn('h-12 w-12 rounded-full shadow-xl bg-primary')}
                >
                  <Mic className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Voice Assistant</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2 text-[#46a395]">
            <ClipboardList className="h-5 w-5" />
            <h3 className="text-sm font-bold uppercase">General Information</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-sm border bg-slate-50/30">
            <FormField control={form.control} name="date" render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="text-[10px] font-bold uppercase">Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl><Button variant="outline" className="h-9 rounded-sm text-xs justify-between">{field.value ? format(field.value, 'PPP') : 'Pick date'}<CalendarIcon className="h-3.5 w-3.5 opacity-50" /></Button></FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
                </Popover>
              </FormItem>
            )} />
            <FormField control={form.control} name="username" render={({ field }) => (
              <FormItem><FormLabel className="text-[10px] font-bold uppercase">Author</FormLabel><FormControl><Input {...field} readOnly className="h-9 bg-slate-100 text-xs" /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="projectId" render={({ field }) => (
              <FormItem><FormLabel className="text-[10px] font-bold uppercase">Project</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Project" /></SelectTrigger></FormControl>
                  <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </FormItem>
            )} />
            <FormField control={form.control} name="shift" render={({ field }) => (
              <FormItem><FormLabel className="text-[10px] font-bold uppercase">Shift</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Shift" /></SelectTrigger></FormControl>
                  <SelectContent><SelectItem value="Day">Day</SelectItem><SelectItem value="Night">Night</SelectItem></SelectContent>
                </Select>
              </FormItem>
            )} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2 text-primary">
            <div className="flex items-center gap-2"><Clock className="h-5 w-5" /><h3 className="text-sm font-bold uppercase">Headcount & Man Hours</h3></div>
            <Button type="button" variant="outline" size="sm" onClick={() => appendManHour({ contractorId: '', headcount: 0, hours: 0 })} className="h-8 text-xs gap-2"><PlusCircle className="h-3.5" /> Add Record</Button>
          </div>
          <Card className="rounded-sm border-slate-200 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/50"><TableRow><TableHead className="text-[10px] font-bold uppercase h-10">Contractor Name</TableHead><TableHead className="text-[10px] font-bold uppercase h-10 text-center w-32">Headcount</TableHead><TableHead className="text-[10px] font-bold uppercase h-10 text-center w-32">Hours/Man</TableHead><TableHead className="text-[10px] font-bold uppercase h-10 text-center w-32">Total</TableHead><TableHead className="h-10 w-10"></TableHead></TableRow></TableHeader>
              <TableBody>
                {manHourFields.map((field, index) => (
                  <TableRow key={field.id}>
                    <TableCell className="py-3"><FormField control={form.control} name={`manHours.${index}.contractorId`} render={({ field }) => <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Contractor" /></SelectTrigger></FormControl><SelectContent>{contractors.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent></Select>} /></TableCell>
                    <TableCell className="py-3"><FormField control={form.control} name={`manHours.${index}.headcount`} render={({ field }) => <Input type="number" {...field} className="h-8 text-center" />} /></TableCell>
                    <TableCell className="py-3"><FormField control={form.control} name={`manHours.${index}.hours`} render={({ field }) => <Input type="number" {...field} className="h-8 text-center" />} /></TableCell>
                    <TableCell className="py-3 text-center text-xs font-bold">{(Number(form.watch(`manHours.${index}.headcount`)) * Number(form.watch(`manHours.${index}.hours`))).toFixed(1)}</TableCell>
                    <TableCell className="py-3"><Button type="button" variant="ghost" size="icon" onClick={() => removeManHour(index)}><Trash2 className="h-3.5" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          <div className="text-right text-xs font-black">Total General Hours: <span className="text-[#46a395]">{totalGeneralManHours.toFixed(1)}</span></div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2 text-[#46a395]">
            <div className="flex items-center gap-2"><MapPin className="h-5 w-5" /><h3 className="text-sm font-bold uppercase">Site Activities & Permits</h3></div>
            <Button type="button" variant="outline" size="sm" onClick={() => appendDailyActivity({ contractorId: '', activity: '', location: '', permits: [] })} className="h-8 text-xs gap-2"><PlusCircle className="h-3.5" /> Add Activity</Button>
          </div>
          <Card className="rounded-sm border-slate-200 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/50"><TableRow><TableHead className="text-[10px] font-bold uppercase h-10 w-48">Contractor</TableHead><TableHead className="text-[10px] font-bold uppercase h-10">Activity Description</TableHead><TableHead className="text-[10px] font-bold uppercase h-10 w-40">Location</TableHead><TableHead className="h-10 w-10"></TableHead></TableRow></TableHeader>
              <TableBody>
                {dailyActivityFields.map((field, index) => (
                  <TableRow key={field.id}>
                    <TableCell className="py-3"><FormField control={form.control} name={`dailyActivities.${index}.contractorId`} render={({ field }) => <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Contractor" /></SelectTrigger></FormControl><SelectContent>{contractors.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent></Select>} /></TableCell>
                    <TableCell className="py-3"><FormField control={form.control} name={`dailyActivities.${index}.activity`} render={({ field }) => <Input {...field} className="h-8 text-xs" />} /></TableCell>
                    <TableCell className="py-3"><FormField control={form.control} name={`dailyActivities.${index}.location`} render={({ field }) => <Input {...field} className="h-8 text-xs" />} /></TableCell>
                    <TableCell className="py-3"><Button type="button" variant="ghost" size="icon" onClick={() => removeDailyActivity(index)}><Trash2 className="h-3.5" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>

        <div className="flex justify-end gap-4 pt-6 border-t">
          <Button variant="outline" type="button" onClick={() => router.push('/daily-report')} className="h-10 rounded-sm text-xs font-bold uppercase">Cancel</Button>
          <Button type="submit" disabled={form.formState.isSubmitting} className="h-10 px-10 rounded-sm text-xs font-bold uppercase">{form.formState.isSubmitting ? 'Saving...' : isEditMode ? 'Update Report' : 'Submit Log'}</Button>
        </div>
      </form>
    </Form>
  );
}
