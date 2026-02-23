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
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth, useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useProjectContext } from '@/context/project-context';
import { getRealWeather } from '@/ai/flows/get-weather-flow';

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
  shift: z.enum(['Day', 'Night'], { required_error: 'Please select a shift.' }),
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

  const projects = (projectsData || []).map((p: any) => ({ id: p.id, label: p.name, city: p.city }));
  const contractors = (contractorsData || []).map((c: any) => ({ id: c.id, label: c.name }));

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

  const watchedProjectId = form.watch('projectId');

  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 1) {
      const formattedData = {
        date: initialData.date?.toDate ? initialData.date.toDate() : (initialData.date instanceof Date ? initialData.date : new Date()),
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
    }
  }, [user, initialData, form, selectedProjectId]);

  // AUTO-WEATHER FETCHING LOGIC
  useEffect(() => {
    if (!watchedProjectId || isEditMode) return;

    const project = (projectsData || []).find((p: any) => p.id === watchedProjectId);
    if (project?.city) {
      setIsWeatherLoading(true);
      getRealWeather(project.city)
        .then((data) => {
          form.setValue('weather.city', data.city);
          form.setValue('weather.conditions', data.conditions);
          form.setValue('weather.highTemp', data.high);
          form.setValue('weather.lowTemp', data.low);
          form.setValue('weather.wind', data.wind);
          toast({ title: 'Weather Updated', description: `Meteorology synced for ${data.city}.` });
        })
        .catch(() => {
          console.error('Auto weather fetch failed');
        })
        .finally(() => {
          setIsWeatherLoading(false);
        });
    }
  }, [watchedProjectId, projectsData, isEditMode, form, toast]);

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

  const selectedProject = (projectsData || []).find((p: any) => p.id === watchedProjectId);

  const locations = selectedProject?.workAreas?.sort() || [];
  const permitTypes = selectedProject?.workPermits?.sort().map((wp: string) => ({
    id: wp,
    label: wp,
  })) || [];

  const manHoursWatch = form.watch('manHours') || [];
  const totalGeneralManHours = manHoursWatch.reduce(
    (acc, curr) => acc + (curr.headcount || 0) * (curr.hours || 0),
    0
  );

  const dailyActivitiesWatch = form.watch('dailyActivities') || [];
  const totalPermits = dailyActivitiesWatch.reduce(
    (acc, curr) => acc + (curr.permits?.length || 0),
    0
  );

  const onSubmit = (data: DailyReportFormValues) => {
    if (!firestore || !user || !dailyReportsCollection) return;

    const payload = {
      ...data,
      date: startOfDay(data.date),
      updatedAt: serverTimestamp(),
    };

    if (isEditMode) {
      const docRef = doc(firestore, 'dailyReports', initialData.id);
      updateDoc(docRef, payload)
        .then(() => {
          toast({ title: 'Report Updated', description: `Changes for ${format(data.date, 'PPP')} saved.` });
          router.push('/daily-report');
        })
        .catch((error) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: payload,
          }));
        });
    } else {
      addDoc(dailyReportsCollection, {
        ...payload,
        authorId: user.uid,
        createdAt: serverTimestamp(),
      })
        .then(() => {
          toast({ title: 'Report Created', description: `Report for ${format(data.date, 'PPP')} submitted.` });
          router.push('/daily-report');
        })
        .catch((error) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: dailyReportsCollection.path,
            operation: 'create',
            requestResourceData: payload,
          }));
        });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2 text-[#46a395]">
            <ClipboardList className="h-5 w-5" />
            <h3 className="text-sm font-bold uppercase tracking-tight">General Information</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-sm border bg-slate-50/30 shadow-inner">
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
                            'h-9 rounded-sm pl-3 text-left font-normal border-slate-200 text-xs',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-3.5 w-3.5 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-sm" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Report Author</FormLabel>
                  <FormControl>
                    <Input {...field} readOnly className="h-9 rounded-sm bg-slate-100 text-xs font-medium" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Project Reference</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-9 rounded-sm border-slate-200 text-xs">
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-sm">
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="shift"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Shift Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-9 rounded-sm border-slate-200 text-xs">
                        <SelectValue placeholder="Select shift" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-sm">
                      <SelectItem value="Day" className="text-xs">Day Shift</SelectItem>
                      <SelectItem value="Night" className="text-xs">Night Shift</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-orange-500">
              <CloudSun className="h-5 w-5" />
              <h3 className="text-sm font-bold uppercase tracking-tight">Weather Conditions</h3>
            </div>
            {isWeatherLoading && (
              <div className="flex items-center gap-2 text-[10px] font-black uppercase text-orange-400 animate-pulse">
                <RefreshCw className="h-3 w-3 animate-spin" /> Syncing meteorology...
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-4 rounded-sm border bg-slate-50/30">
            <FormField
              control={form.control}
              name="weather.city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Site Location</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Cedar Rapids" {...field} className="h-9 rounded-sm text-xs" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="weather.conditions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Sky State</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Overcast" {...field} className="h-9 rounded-sm text-xs" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="weather.highTemp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-bold uppercase text-slate-500">High Temp (°F)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} className="h-9 rounded-sm text-xs" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="weather.lowTemp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Low Temp (°F)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} className="h-9 rounded-sm text-xs" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="weather.wind"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Wind (mph)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} className="h-9 rounded-sm text-xs" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2 text-primary">
            <ShieldCheck className="h-5 w-5" />
            <h3 className="text-sm font-bold uppercase tracking-tight">HSE Safety Metrics</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 p-4 rounded-sm border bg-slate-50/10 shadow-sm">
            {[
              { name: 'recordableIncidents', label: 'Incidents' },
              { name: 'lightFirstAids', label: 'First Aid' },
              { name: 'safetyMeeting', label: 'Meetings' },
              { name: 'toolBoxTalks', label: 'TBT Talks' },
              { name: 'admSiteOrientation', label: 'Orientations' },
              { name: 'bbsGemba', label: 'Gemba BBS' },
              { name: 'operationsStandDowns', label: 'Stand Downs' },
            ].map((stat) => (
              <FormField
                key={stat.name}
                control={form.control}
                name={`safetyStats.${stat.name}` as any}
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[9px] font-bold uppercase text-slate-400 line-clamp-1">{stat.label}</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} className="h-8 rounded-sm text-center font-bold text-xs" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>
        </div>

        <Separator className="opacity-50" />

        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-[#46a395]">
              <MapPin className="h-5 w-5" />
              <h3 className="text-sm font-bold uppercase tracking-tight">Site Activities & Permits</h3>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs rounded-sm gap-2"
              onClick={() => appendDailyActivity({ contractorId: '', activity: '', location: '', permits: [] })}
            >
              <PlusCircle className="h-3.5 w-3.5" /> Add Activity
            </Button>
          </div>
          <Card className="rounded-sm border-slate-200 overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent border-b-slate-200">
                  <TableHead className="text-[10px] font-bold uppercase h-10 w-48">Contractor</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase h-10">Activity Description</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase h-10 w-40">Location</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase h-10 min-w-[250px]">Required Permits</TableHead>
                  <TableHead className="h-10 w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyActivityFields.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-xs text-slate-400 italic">No activities added yet.</TableCell>
                  </TableRow>
                ) : (
                  dailyActivityFields.map((field, index) => (
                    <TableRow key={field.id} className="border-b-slate-100 hover:bg-slate-50/30">
                      <TableCell className="py-3">
                        <FormField
                          control={form.control}
                          name={`dailyActivities.${index}.contractorId`}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-8 rounded-sm text-xs border-slate-200">
                                  <SelectValue placeholder="Contractor" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="rounded-sm">
                                {contractors.map((c) => (
                                  <SelectItem key={c.id} value={c.id} className="text-xs">{c.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </TableCell>
                      <TableCell className="py-3">
                        <FormField
                          control={form.control}
                          name={`dailyActivities.${index}.activity`}
                          render={({ field }) => <Input {...field} placeholder="Main task today..." className="h-8 rounded-sm text-xs border-slate-200" />}
                        />
                      </TableCell>
                      <TableCell className="py-3">
                        <FormField
                          control={form.control}
                          name={`dailyActivities.${index}.location`}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-8 rounded-sm text-xs border-slate-200">
                                  <SelectValue placeholder="Location" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="rounded-sm">
                                {locations.length > 0 ? (
                                  locations.map((l: string) => (
                                    <SelectItem key={l} value={l} className="text-xs">{l}</SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="none" disabled className="text-xs italic">Select project first</SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </TableCell>
                      <TableCell className="py-3">
                        <FormField
                          control={form.control}
                          name={`dailyActivities.${index}.permits`}
                          render={({ field }) => {
                            const selectedPermits = field.value || [];
                            return (
                              <div className="flex flex-wrap gap-1.5 py-1">
                                {permitTypes.length > 0 ? (
                                  permitTypes.map((permit) => {
                                    const isSelected = selectedPermits.includes(permit.id);
                                    return (
                                      <button
                                        key={permit.id}
                                        type="button"
                                        onClick={() => {
                                          const nextValue = isSelected
                                            ? selectedPermits.filter((id: string) => id !== permit.id)
                                            : [...selectedPermits, permit.id];
                                          field.onChange(nextValue);
                                        }}
                                        className={cn(
                                          "px-2 py-0.5 rounded-sm text-[10px] font-bold border transition-all select-none",
                                          isSelected 
                                            ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                                            : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                        )}
                                      >
                                        {permit.label}
                                      </button>
                                    );
                                  })
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">No permits defined</span>
                                )}
                              </div>
                            );
                          }}
                        />
                      </TableCell>
                      <TableCell className="py-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-300 hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removeDailyActivity(index)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
          <div className="flex justify-end pr-14">
            <Badge variant="outline" className="text-[10px] font-bold text-slate-500 rounded-sm">Total Permits: {totalPermits}</Badge>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-primary">
              <Clock className="h-5 w-5" />
              <h3 className="text-sm font-bold uppercase tracking-tight">Headcount & Man Hours</h3>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs rounded-sm gap-2"
              onClick={() => appendManHour({ contractorId: '', headcount: 0, hours: 0 })}
            >
              <PlusCircle className="h-3.5 w-3.5" /> Add Record
            </Button>
          </div>
          <Card className="rounded-sm border-slate-200 overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent border-b-slate-200">
                  <TableHead className="text-[10px] font-bold uppercase h-10">Contractor Name</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase h-10 w-32 text-center">Headcount</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase h-10 w-32 text-center">Hours/Man</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase h-10 w-32 text-center">Total</TableHead>
                  <TableHead className="h-10 w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {manHourFields.map((field, index) => {
                  const headcount = form.watch(`manHours.${index}.headcount`) || 0;
                  const hours = form.watch(`manHours.${index}.hours`) || 0;
                  const total = headcount * hours;
                  return (
                    <TableRow key={field.id} className="border-b-slate-100 hover:bg-slate-50/30">
                      <TableCell className="py-3">
                        <FormField
                          control={form.control}
                          name={`manHours.${index}.contractorId`}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-8 rounded-sm text-xs border-slate-200">
                                  <SelectValue placeholder="Contractor" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="rounded-sm">
                                {contractors.map((c) => (
                                  <SelectItem key={c.id} value={c.id} className="text-xs">{c.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </TableCell>
                      <TableCell className="py-3">
                        <FormField
                          control={form.control}
                          name={`manHours.${index}.headcount`}
                          render={({ field }) => <Input type="number" {...field} className="h-8 rounded-sm text-xs text-center border-slate-200" />}
                        />
                      </TableCell>
                      <TableCell className="py-3">
                        <FormField
                          control={form.control}
                          name={`manHours.${index}.hours`}
                          render={({ field }) => <Input type="number" {...field} className="h-8 rounded-sm text-xs text-center border-slate-200" />}
                        />
                      </TableCell>
                      <TableCell className="py-3 text-center text-xs font-bold text-slate-700">{total.toFixed(1)}</TableCell>
                      <TableCell className="py-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-300 hover:text-destructive"
                          onClick={() => removeManHour(index)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
          <div className="flex justify-end pr-14">
            <div className="text-xs font-black text-slate-800 uppercase tracking-tighter">
              Total General Hours: <span className="text-[#46a395] ml-2 text-sm">{totalGeneralManHours.toFixed(1)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-orange-400">
              <Paperclip className="h-5 w-5" />
              <h3 className="text-sm font-bold uppercase tracking-tight">Site Notes & Field Photos</h3>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs rounded-sm gap-2"
              onClick={() => appendNote({ note: '', status: 'open' })}
            >
              <PlusCircle className="h-3.5 w-3.5" /> Add Observation
            </Button>
          </div>
          <div className="space-y-2">
            {noteFields.map((field, index) => (
              <Card key={field.id} className="rounded-sm border-slate-200 bg-slate-50/20 shadow-sm p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <FormField
                    control={form.control}
                    name={`notes.${index}.note`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Textarea {...field} placeholder="Detail your observation or site status..." className="min-h-[80px] rounded-sm text-xs resize-none" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex flex-row md:flex-col gap-2 shrink-0 md:w-40">
                    <FormField
                      control={form.control}
                      name={`notes.${index}.status`}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-8 rounded-sm text-xs">
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-sm">
                            <SelectItem value="open" className="text-xs">Open Issue</SelectItem>
                            <SelectItem value="closed" className="text-xs">Resolved</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <Button type="button" variant="outline" size="sm" className="h-8 rounded-sm gap-2 text-[10px] uppercase font-bold">
                      <Paperclip className="h-3.5 w-3.5" /> Upload Photo
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-sm text-destructive hover:bg-destructive/10 gap-2 text-[10px] uppercase font-bold mt-auto"
                      onClick={() => removeNote(index)}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove Note
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-6 border-t border-slate-100">
          <Button
            variant="outline"
            type="button"
            className="h-10 px-8 rounded-sm text-xs font-bold uppercase tracking-wider"
            onClick={() => router.push('/daily-report')}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={form.formState.isSubmitting}
            className="h-10 px-10 rounded-sm text-xs font-bold uppercase tracking-wider shadow-md"
          >
            {form.formState.isSubmitting ? 'Finalizing...' : isEditMode ? 'Update Report' : 'Submit Daily Report'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
