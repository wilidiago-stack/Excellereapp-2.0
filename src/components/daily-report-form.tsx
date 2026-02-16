'use client';

import { useMemo, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import {
  CalendarIcon,
  PlusCircle,
  Trash2,
  Paperclip,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth, useCollection } from '@/firebase';
import { useFirestore } from '@/firebase/provider';
import { collection, addDoc } from 'firebase/firestore';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Separator } from './ui/separator';

const safetyEventSchema = z.object({
  eventType: z.string().min(1, 'Please select an event type'),
  category: z.string().min(1, 'Please select a category'),
  responsibleContractor: z.string().min(1, 'Please select a contractor'),
  eventDescription: z.string().min(1, 'Description is required'),
});

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
  safetyEvents: z.array(safetyEventSchema).optional(),
  manHours: z.array(manHourSchema).optional(),
  dailyActivities: z.array(dailyActivitySchema).optional(),
  notes: z.array(noteSchema).optional(),
});

type DailyReportFormValues = z.infer<typeof dailyReportSchema>;

const eventTypes = [
  { id: 'near-miss', label: 'Near Miss' },
  { id: 'incident', label: 'Incident' },
  { id: 'observation', label: 'Observation' },
];
const categories = [
  { id: 'safety', label: 'Safety' },
  { id: 'environmental', label: 'Environmental' },
  { id: 'quality', label: 'Quality' },
];

export function DailyReportForm() {
  const { user } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const dailyReportsCollection = useMemo(
    () => (firestore && user ? collection(firestore, 'dailyReports') : null),
    [firestore, user]
  );

  const projectsCollection = useMemo(
    () => (firestore ? collection(firestore, 'projects') : null),
    [firestore]
  );
  const { data: projectsData } = useCollection(projectsCollection);

  const contractorsCollection = useMemo(
    () => (firestore ? collection(firestore, 'contractors') : null),
    [firestore]
  );
  const { data: contractorsData } = useCollection(contractorsCollection);

  const projects = useMemo(
    () => projectsData?.map((p: any) => ({ id: p.id, label: p.name })) || [],
    [projectsData]
  );

  const contractors = useMemo(
    () => contractorsData?.map((c: any) => ({ id: c.id, label: c.name })) || [],
    [contractorsData]
  );

  const form = useForm<DailyReportFormValues>({
    resolver: zodResolver(dailyReportSchema),
    defaultValues: {
      date: new Date(),
      username: '',
      projectId: '',
      weather: { highTemp: 50, lowTemp: 22, wind: 10 },
      safetyStats: {
        recordableIncidents: 0,
        lightFirstAids: 0,
        safetyMeeting: 0,
        toolBoxTalks: 0,
        admSiteOrientation: 0,
        bbsGemba: 0,
        operationsStandDowns: 0,
      },
      safetyEvents: [],
      manHours: [],
      dailyActivities: [],
      notes: [],
    },
  });

  useEffect(() => {
    if (user && !form.getValues('username')) {
      form.setValue('username', user.displayName || '');
    }
  }, [user, form]);

  const {
    fields: safetyEventFields,
    append: appendSafetyEvent,
    remove: removeSafetyEvent,
  } = useFieldArray({ control: form.control, name: 'safetyEvents' });
  const {
    fields: manHourFields,
    append: appendManHour,
    remove: removeManHour,
  } = useFieldArray({ control: form.control, name: 'manHours' });
  const {
    fields: dailyActivityFields,
    append: appendDailyActivity,
    remove: removeDailyActivity,
  } = useFieldArray({ control: form.control, name: 'dailyActivities' });
  const {
    fields: noteFields,
    append: appendNote,
    remove: removeNote,
  } = useFieldArray({ control: form.control, name: 'notes' });

  const selectedProjectId = form.watch('projectId');
  const selectedProject = useMemo(() => {
    if (!selectedProjectId || !projectsData) return null;
    return projectsData.find((p: any) => p.id === selectedProjectId);
  }, [selectedProjectId, projectsData]);

  const locations = useMemo(() => {
    return (
      selectedProject?.workAreas?.map((wa: string) => ({ id: wa, label: wa })) || []
    );
  }, [selectedProject]);

  const permitTypes = useMemo(() => {
    return (
      selectedProject?.workPermits?.map((wp: { code: string; name: string }) => ({
        id: wp.code,
        label: `${wp.name} (${wp.code})`,
      })) || []
    );
  }, [selectedProject]);

  const manHoursWatch = form.watch('manHours');
  const totalGeneralManHours = manHoursWatch?.reduce(
    (acc, curr) => acc + (curr.headcount || 0) * (curr.hours || 0),
    0
  );

  const dailyActivitiesWatch = form.watch('dailyActivities');
  const totalPermits = dailyActivitiesWatch?.reduce(
    (acc, curr) => acc + (curr.permits?.length || 0),
    0
  );

  const onSubmit = (data: DailyReportFormValues) => {
    if (!firestore || !user || !dailyReportsCollection) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to create a report.',
      });
      return;
    }

    addDoc(dailyReportsCollection, {
      ...data,
      authorId: user.uid,
    })
      .then(() => {
        toast({
          title: 'Daily Report Created',
          description: `Report for ${format(
            data.date,
            'PPP'
          )} has been saved.`,
        });
        router.push('/daily-report');
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: 'dailyReports',
          operation: 'create',
          requestResourceData: { ...data, authorId: user.uid },
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">General Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={'outline'}
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP')
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
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
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input {...field} readOnly />
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
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.label}
                        </SelectItem>
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
                  <FormLabel>Shift</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a shift" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Day">Day</SelectItem>
                      <SelectItem value="Night">Night</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Weather</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <FormField
              control={form.control}
              name="weather.city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Cedar Rapids" {...field} />
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
                  <FormLabel>Conditions</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Overcast" {...field} />
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
                  <FormLabel>High Temp (°F)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
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
                  <FormLabel>Low Temp (°F)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
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
                  <FormLabel>Wind (mph)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Safety Stats</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <FormField
              control={form.control}
              name="safetyStats.recordableIncidents"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recordable Incidents</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="safetyStats.lightFirstAids"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Light First Aids</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="safetyStats.safetyMeeting"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Safety Meeting</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="safetyStats.toolBoxTalks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tool Box Talks</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="safetyStats.admSiteOrientation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adm Site Orientation</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="safetyStats.bbsGemba"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bbs Gemba</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="safetyStats.operationsStandDowns"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ops Stand Downs</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Safety Events</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Responsible Contractor</TableHead>
                <TableHead className="w-1/3">Event Description</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {safetyEventFields.map((field, index) => (
                <TableRow key={field.id}>
                  <TableCell>
                    <FormField
                      control={form.control}
                      name={`safetyEvents.${index}.eventType`}
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an event type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {eventTypes.map((e) => (
                              <SelectItem key={e.id} value={e.id}>
                                {e.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <FormField
                      control={form.control}
                      name={`safetyEvents.${index}.category`}
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <FormField
                      control={form.control}
                      name={`safetyEvents.${index}.responsibleContractor`}
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select contractor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {contractors.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <FormField
                      control={form.control}
                      name={`safetyEvents.${index}.eventDescription`}
                      render={({ field }) => (
                        <Textarea
                          {...field}
                          placeholder="Describe the event"
                        />
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSafetyEvent(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() =>
              appendSafetyEvent({
                eventType: '',
                category: '',
                responsibleContractor: '',
                eventDescription: '',
              })
            }
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Add Event
          </Button>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Man Hours</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-2/5">Contractor Name</TableHead>
                <TableHead>Headcount</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Total</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {manHourFields.map((field, index) => {
                const headcount =
                  form.watch(`manHours.${index}.headcount`) || 0;
                const hours = form.watch(`manHours.${index}.hours`) || 0;
                const total = headcount * hours;
                return (
                  <TableRow key={field.id}>
                    <TableCell>
                      <FormField
                        control={form.control}
                        name={`manHours.${index}.contractorId`}
                        render={({ field }) => (
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select contractor" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {contractors.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <FormField
                        control={form.control}
                        name={`manHours.${index}.headcount`}
                        render={({ field }) => (
                          <Input type="number" {...field} />
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <FormField
                        control={form.control}
                        name={`manHours.${index}.hours`}
                        render={({ field }) => (
                          <Input type="number" {...field} />
                        )}
                      />
                    </TableCell>
                    <TableCell>{total.toFixed(1)}</TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeManHour(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() =>
              appendManHour({
                contractorId: '',
                headcount: 0,
                hours: 0,
              })
            }
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Add Row
          </Button>
          <div className="flex justify-end mt-4 font-bold">
            Total General: {totalGeneralManHours?.toFixed(1) || '0.0'}
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Daily Activities</h3>
          <p className="text-sm text-muted-foreground">
            Fill in the daily work activities and required permits.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/4">Name</TableHead>
                <TableHead className="w-1/4">Activity</TableHead>
                <TableHead className="w-1/4">Location</TableHead>
                <TableHead>Permits</TableHead>
                <TableHead>Total</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dailyActivityFields.map((field, index) => (
                <TableRow key={field.id}>
                  <TableCell>
                    <FormField
                      control={form.control}
                      name={`dailyActivities.${index}.contractorId`}
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select contractor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {contractors.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <FormField
                      control={form.control}
                      name={`dailyActivities.${index}.activity`}
                      render={({ field }) => <Input {...field} />}
                    />
                  </TableCell>
                  <TableCell>
                    <FormField
                      control={form.control}
                      name={`dailyActivities.${index}.location`}
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select location" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {locations.length > 0 ? (
                              locations.map((l) => (
                                <SelectItem key={l.id} value={l.id}>
                                  {l.label}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="loading" disabled>
                                Select project first
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <FormField
                      control={form.control}
                      name={`dailyActivities.${index}.permits`}
                      render={() => (
                        <div className="flex flex-wrap gap-2">
                          {permitTypes.length > 0 ? (
                            permitTypes.map((permit) => (
                              <FormField
                                key={permit.id}
                                control={form.control}
                                name={`dailyActivities.${index}.permits`}
                                render={({ field }) => (
                                  <FormItem
                                    key={permit.id}
                                    className="flex flex-row items-start space-x-2 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(
                                          permit.id
                                        )}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([
                                                ...(field.value || []),
                                                permit.id,
                                              ])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) =>
                                                    value !== permit.id
                                                )
                                              );
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="text-sm font-normal">
                                      {permit.label}
                                    </FormLabel>
                                  </FormItem>
                                )}
                              />
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              Select a project to see permits.
                            </p>
                          )}
                        </div>
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    {form.watch(`dailyActivities.${index}.permits`)?.length ||
                      0}
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDailyActivity(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() =>
              appendDailyActivity({
                contractorId: '',
                activity: '',
                location: '',
                permits: [],
              })
            }
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Add Row
          </Button>
          <div className="flex justify-end mt-4 font-bold">
            Total Permits: {totalPermits || 0}
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Notes</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/2">Note</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Image</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {noteFields.map((field, index) => (
                <TableRow key={field.id}>
                  <TableCell>
                    <FormField
                      control={form.control}
                      name={`notes.${index}.note`}
                      render={({ field }) => <Textarea {...field} />}
                    />
                  </TableCell>
                  <TableCell>
                    <FormField
                      control={form.control}
                      name={`notes.${index}.status`}
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <Button type="button" variant="outline" size="sm">
                      <Paperclip className="mr-2 h-4 w-4" /> Upload
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeNote(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => appendNote({ note: '', status: '' })}
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Add Note
          </Button>
        </div>

        <div className="flex justify-end gap-4 pt-4">
          <Button
            variant="outline"
            type="button"
            onClick={() => router.push('/daily-report')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Creating...' : 'Create report'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
