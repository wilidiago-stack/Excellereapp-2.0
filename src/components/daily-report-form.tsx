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
  Paperclip,
  CloudSun,
  ShieldCheck,
  Clock,
  MapPin,
  ClipboardList,
  Loader2,
  Mic,
  MicOff,
  Sparkles,
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
import { Separator } from './ui/separator';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  imageUrl: z.string().optional(),
});

const dailyReportSchema = z.object({
  date: z.date({ required_error: 'A date is required.' }),
  username: z.string().min(1, 'Username is required'),
  projectId: z.string().min(1, 'Please select a project.'),
  shift: z.enum(['Day', 'Night'], {
    required_error: 'Please select a shift.',
  }),
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

interface DailyReportFormProps {
  initialData?: any;
}

export function DailyReportForm({ initialData }: DailyReportFormProps) {
  const { user } = useAuth();
  const firestore = useFirestore();
  const { selectedProjectId } = useProjectContext();
  const { toast } = useToast();
  const router = useRouter();
  const isEditMode = !!initialData?.id;
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isAIProcessing, setIsAIProcessing] = useState(false);

  const dailyReportsCollection = useMemoFirebase(
    () => (firestore && user?.uid ? collection(firestore, 'dailyReports') : null),
    [firestore, user?.uid]
  );

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

  const {
    fields: dailyActivityFields,
    append: appendDailyActivity,
    remove: removeDailyActivity,
  } = useFieldArray({ control: form.control, name: 'dailyActivities' });
  const {
    fields: manHourFields,
    append: appendManHour,
    remove: removeManHour,
  } = useFieldArray({ control: form.control, name: 'manHours' });
  const {
    fields: noteFields,
    append: appendNote,
    remove: removeNote,
  } = useFieldArray({ control: form.control, name: 'notes' });

  const watchedProjectId = form.watch('projectId');

  useEffect(() => {
    if (!watchedProjectId || isEditMode) return;
    const selectedProject = projectsData?.find((p: any) => p.id === watchedProjectId);
    if (selectedProject?.city) {
      const fetchAutoWeather = async () => {
        setIsWeatherLoading(true);
        try {
          const data = await getRealWeather(selectedProject.city);
          form.setValue('weather.city', data.city);
          form.setValue('weather.conditions', data.conditions);
          form.setValue('weather.highTemp', data.high);
          form.setValue('weather.lowTemp', data.low);
          form.setValue('weather.wind', data.wind);
        } catch (err) {
          console.warn('Weather auto-sync failed');
        } finally {
          setIsWeatherLoading(false);
        }
      };
      fetchAutoWeather();
    }
  }, [watchedProjectId, projectsData, isEditMode, form]);

  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 1) {
      const formattedData = {
        date: initialData.date?.toDate
          ? initialData.date.toDate()
          : initialData.date instanceof Date
          ? initialData.date
          : new Date(),
        username: initialData.username || '',
        projectId: initialData.projectId || '',
        shift: initialData.shift || 'Day',
        weather: {
          city: initialData.weather?.city || '',
          conditions: initialData.weather?.conditions || '',
          highTemp: initialData.weather?.highTemp || 0,
          lowTemp: initialData.weather?.lowTemp || 0,
          wind: initialData.weather?.wind || 0,
        },
        safetyStats: {
          recordableIncidents: initialData.safetyStats?.recordableIncidents || 0,
          lightFirstAids: initialData.safetyStats?.lightFirstAids || 0,
          safetyMeeting: initialData.safetyStats?.safetyMeeting || 0,
          toolBoxTalks: initialData.safetyStats?.toolBoxTalks || 0,
          admSiteOrientation: initialData.safetyStats?.admSiteOrientation || 0,
          bbsGemba: initialData.safetyStats?.bbsGemba || 0,
          operationsStandDowns: initialData.safetyStats?.operationsStandDowns || 0,
        },
        dailyActivities: initialData.dailyActivities || [],
        manHours: initialData.manHours || [],
        notes: initialData.notes || [],
      };
      form.reset(formattedData);
    } else {
      if (user && !form.getValues('username')) {
        form.setValue('username', user.displayName || '');
      }
      if (selectedProjectId && !form.getValues('projectId')) {
        form.setValue('projectId', selectedProjectId);
      }
      // Provide initial empty row only if not in edit mode
      if (manHourFields.length === 0 && !isEditMode)
        appendManHour({ contractorId: '', headcount: 0, hours: 0 });
      if (dailyActivityFields.length === 0 && !isEditMode)
        appendDailyActivity({ contractorId: '', activity: '', location: '', permits: [] });
      if (noteFields.length === 0 && !isEditMode)
        appendNote({ note: '', status: 'open' });
    }
  }, [initialData, user, selectedProjectId, isEditMode]);

  const startVoiceCapture = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ variant: 'destructive', title: 'Not Supported', description: 'Voice is not supported.' });
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => processTranscript(event.results[0][0].transcript);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const processTranscript = async (text: string) => {
    setIsAIProcessing(true);
    try {
      const extraction = await processReportVoice(text);
      if (extraction.weather) {
        if (extraction.weather.conditions) form.setValue('weather.conditions', extraction.weather.conditions);
        if (extraction.weather.highTemp) form.setValue('weather.highTemp', extraction.weather.highTemp);
        if (extraction.weather.lowTemp) form.setValue('weather.lowTemp', extraction.weather.lowTemp);
        if (extraction.weather.wind) form.setValue('weather.wind', extraction.weather.wind);
      }
      if (extraction.safetyStats) {
        Object.entries(extraction.safetyStats).forEach(([key, val]) => {
          form.setValue(`safetyStats.${key}` as any, val);
        });
      }
      if (extraction.manHours) {
        extraction.manHours.forEach((mh) => {
          const contractor = contractors.find((c) => c.label.toLowerCase().includes(mh.contractorName.toLowerCase()));
          if (contractor) appendManHour({ contractorId: contractor.id, headcount: mh.headcount, hours: mh.hours });
        });
      }
      if (extraction.activities) {
        extraction.activities.forEach((act) => {
          const contractor = contractors.find((c) => c.label.toLowerCase().includes(act.contractorName.toLowerCase()));
          if (contractor) appendDailyActivity({ contractorId: contractor.id, activity: act.activity, location: act.location, permits: [] });
        });
      }
      if (extraction.notes) {
        extraction.notes.forEach((note) => appendNote({ note, status: 'open' }));
      }
      toast({ title: 'AI Processed', description: 'Form updated from voice.' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'AI Error', description: 'Failed to extract data.' });
    } finally {
      setIsAIProcessing(false);
    }
  };

  const onSubmit = (data: DailyReportFormValues) => {
    if (!firestore || !user || !dailyReportsCollection) return;
    const payload = { ...data, date: startOfDay(data.date), updatedAt: serverTimestamp() };
    const op = isEditMode
      ? updateDoc(doc(firestore, 'dailyReports', initialData.id), payload)
      : addDoc(dailyReportsCollection, { ...payload, authorId: user.uid, createdAt: serverTimestamp() });
    op.then(() => {
      toast({ title: 'Report Saved', description: 'Report processed successfully.' });
      router.push('/daily-report');
    }).catch((error) =>
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: isEditMode ? `dailyReports/${initialData.id}` : dailyReportsCollection.path,
        operation: 'write',
        requestResourceData: payload,
      }))
    );
  };

  const totalGeneralManHours = (form.watch('manHours') || []).reduce(
    (acc, curr) => acc + (curr.headcount || 0) * (curr.hours || 0),
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
                  variant={isListening ? 'destructive' : 'default'}
                  size="icon"
                  onClick={startVoiceCapture}
                  disabled={isAIProcessing}
                  className={cn(
                    'h-12 w-12 rounded-full shadow-xl transition-all duration-300 hover:scale-110',
                    !isListening && !isAIProcessing && 'bg-gradient-to-br from-[#1BA1E3] via-[#9168C0] to-[#D05CA4]'
                  )}
                >
                  {isAIProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mic className="h-5 w-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="bg-slate-900 text-white text-[10px] font-bold uppercase">
                {isListening ? 'Stop' : 'Voice Assistant'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2 text-[#46a395]">
            <ClipboardList className="h-5 w-5" />
            <h3 className="text-sm font-bold uppercase tracking-tight">General Information</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-sm border bg-slate-50/30">
            <FormField control={form.control} name="date" render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button variant="outline" className={cn('h-9 rounded-sm pl-3 text-left border-slate-200 text-xs', !field.value && 'text-muted-foreground')}>
                        {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-3.5 w-3.5 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="username" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Author</FormLabel>
                <FormControl><Input {...field} readOnly className="h-9 rounded-sm bg-slate-100 text-xs" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="projectId" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Project</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger className="h-9 rounded-sm border-slate-200 text-xs"><SelectValue placeholder="Project" /></SelectTrigger></FormControl>
                  <SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="shift" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Shift</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger className="h-9 rounded-sm border-slate-200 text-xs"><SelectValue placeholder="Shift" /></SelectTrigger></FormControl>
                  <SelectContent><SelectItem value="Day">Day</SelectItem><SelectItem value="Night">Night</SelectItem></SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2 text-primary">
            <div className="flex items-center gap-2"><Clock className="h-5 w-5" /><h3 className="text-sm font-bold uppercase">Personal & Man Hours</h3></div>
            <Button type="button" variant="outline" size="sm" onClick={() => appendManHour({ contractorId: '', headcount: 0, hours: 0 })} className="h-8 text-xs gap-2"><PlusCircle className="h-3.5" /> Add</Button>
          </div>
          <Card className="rounded-sm border-slate-200 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/50"><TableRow><TableHead className="text-[10px] font-bold uppercase h-10">Contractor</TableHead><TableHead className="text-[10px] font-bold uppercase h-10 text-center w-32">Headcount</TableHead><TableHead className="text-[10px] font-bold uppercase h-10 text-center w-32">Hours</TableHead><TableHead className="text-[10px] font-bold uppercase h-10 text-center w-32">Total</TableHead><TableHead className="h-10 w-10"></TableHead></TableRow></TableHeader>
              <TableBody>
                {manHourFields.map((field, index) => (
                  <TableRow key={field.id} className="border-b-slate-100">
                    <TableCell className="py-3"><FormField control={form.control} name={`manHours.${index}.contractorId`} render={({ field }) => <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger></FormControl><SelectContent>{contractors.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent></Select>} /></TableCell>
                    <TableCell className="py-3"><FormField control={form.control} name={`manHours.${index}.headcount`} render={({ field }) => <Input type="number" {...field} className="h-8 text-center" />} /></TableCell>
                    <TableCell className="py-3"><FormField control={form.control} name={`manHours.${index}.hours`} render={({ field }) => <Input type="number" {...field} className="h-8 text-center" />} /></TableCell>
                    <TableCell className="py-3 text-center text-xs font-bold">{(form.watch(`manHours.${index}.headcount`) * form.watch(`manHours.${index}.hours`)).toFixed(1)}</TableCell>
                    <TableCell className="py-3"><Button type="button" variant="ghost" size="icon" onClick={() => removeManHour(index)}><Trash2 className="h-3.5" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          <div className="text-right pr-14 text-xs font-black">TOTAL MAN HOURS: <span className="text-[#46a395]">{totalGeneralManHours.toFixed(1)}</span></div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2 text-[#46a395]">
            <div className="flex items-center gap-2"><MapPin className="h-5 w-5" /><h3 className="text-sm font-bold uppercase">Activities & Permits</h3></div>
            <Button type="button" variant="outline" size="sm" onClick={() => appendDailyActivity({ contractorId: '', activity: '', location: '', permits: [] })} className="h-8 text-xs gap-2"><PlusCircle className="h-3.5" /> Add</Button>
          </div>
          <Card className="rounded-sm border-slate-200 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/50"><TableRow><TableHead className="text-[10px] font-bold uppercase h-10 w-48">Contractor</TableHead><TableHead className="text-[10px] font-bold uppercase h-10">Activity</TableHead><TableHead className="text-[10px] font-bold uppercase h-10 w-40">Location</TableHead><TableHead className="h-10 w-10"></TableHead></TableRow></TableHeader>
              <TableBody>
                {dailyActivityFields.map((field, index) => (
                  <TableRow key={field.id} className="border-b-slate-100">
                    <TableCell className="py-3"><FormField control={form.control} name={`dailyActivities.${index}.contractorId`} render={({ field }) => <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger></FormControl><SelectContent>{contractors.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent></Select>} /></TableCell>
                    <TableCell className="py-3"><FormField control={form.control} name={`dailyActivities.${index}.activity`} render={({ field }) => <Input {...field} className="h-8 text-xs" />} /></TableCell>
                    <TableCell className="py-3"><FormField control={form.control} name={`dailyActivities.${index}.location`} render={({ field }) => <Input {...field} className="h-8 text-xs" />} /></TableCell>
                    <TableCell className="py-3"><Button type="button" variant="ghost" size="icon" onClick={() => removeDailyActivity(index)}><Trash2 className="h-3.5" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>

        <div className="flex justify-end gap-4 pt-6 border-t border-slate-100">
          <Button variant="outline" type="button" className="h-10 px-8 rounded-sm text-xs font-bold uppercase" onClick={() => router.push('/daily-report')}>Cancel</Button>
          <Button type="submit" disabled={form.formState.isSubmitting} className="h-10 px-10 rounded-sm text-xs font-bold uppercase">{form.formState.isSubmitting ? 'Saving...' : isEditMode ? 'Update' : 'Submit'}</Button>
        </div>
      </form>
    </Form>
  );
}
