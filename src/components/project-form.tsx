
'use client';

import React, { useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { PlusCircle, Trash2, CalendarIcon } from 'lucide-react';
import { useFirestore, useCollection, useAuth, useMemoFirebase } from '@/firebase';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { COUNTRIES, LOCATION_DATA } from '@/lib/location-data';

const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  companyName: z.string().min(1, 'Company name is required'),
  country: z.string().min(1, 'Country is required'),
  state: z.string().min(1, 'State is required'),
  city: z.string().min(1, 'City is required'),
  startDate: z.date({ required_error: 'Start date is required.' }),
  deliveryDate: z.date().optional().nullable(),
  address: z.string().optional(),
  phone: z.string().optional(),
  cell: z.string().optional(),
  projectManagerId: z.string().optional(),
  generalContractorId: z.string().optional(),
  workAreas: z.array(z.object({ value: z.string() })).default([]),
  workPermits: z.array(z.object({ value: z.string() })).default([]),
  status: z.enum(["Not Started", "In Progress", "Completed", "On Hold"]),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

interface ProjectFormProps {
    initialData?: any; 
}

export function ProjectForm({ initialData }: ProjectFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const isEditMode = !!initialData?.id;

  const projectsCollection = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'projects') : null),
    [firestore, user]
  );
  
  const usersCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'users') : null),
    [firestore]
  );
  const { data: users } = useCollection(usersCollection);

  const contractorsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'contractors') : null),
    [firestore]
  );
  const { data: contractors } = useCollection(contractorsCollection);

  const projectManagers = (users || []).filter((u: any) => u.role === 'project_manager' || u.role === 'admin');
  const generalContractors = contractors || [];

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      companyName: '',
      country: '',
      state: '',
      city: '',
      startDate: new Date(),
      deliveryDate: null,
      address: '',
      phone: '',
      cell: '',
      projectManagerId: '',
      generalContractorId: '',
      workAreas: [],
      workPermits: [],
      status: 'Not Started',
    },
  });

  const {
    fields: workAreaFields,
    append: appendWorkArea,
    remove: removeWorkArea,
  } = useFieldArray({
    control: form.control,
    name: 'workAreas',
  });

  const {
    fields: workPermitFields,
    append: appendWorkPermit,
    remove: removeWorkPermit,
  } = useFieldArray({
    control: form.control,
    name: 'workPermits',
  });

  const selectedCountry = form.watch('country');
  const selectedState = form.watch('state');

  // Memoized states and cities to prevent calculation on every render
  const statesList = useMemo(() => {
    if (!selectedCountry || !LOCATION_DATA[selectedCountry]) return [];
    return Object.keys(LOCATION_DATA[selectedCountry].states).sort();
  }, [selectedCountry]);

  const citiesList = useMemo(() => {
    if (!selectedCountry || !selectedState || !LOCATION_DATA[selectedCountry]?.states[selectedState]) return [];
    return LOCATION_DATA[selectedCountry].states[selectedState].sort();
  }, [selectedCountry, selectedState]);

  useEffect(() => {
    if (initialData) {
      const formattedData = {
        name: initialData.name || '',
        companyName: initialData.companyName || '',
        status: initialData.status || 'Not Started',
        country: initialData.country || '',
        state: initialData.state || '',
        city: initialData.city || '',
        startDate: initialData.startDate?.toDate ? initialData.startDate.toDate() : (initialData.startDate instanceof Date ? initialData.startDate : new Date()),
        deliveryDate: initialData.deliveryDate?.toDate ? initialData.deliveryDate.toDate() : (initialData.deliveryDate instanceof Date ? initialData.deliveryDate : null),
        address: initialData.address || '',
        phone: initialData.phone || '',
        cell: initialData.cell || '',
        projectManagerId: initialData.projectManagerId || '',
        generalContractorId: initialData.generalContractorId || '',
        workAreas: (initialData.workAreas || []).map((wa: string) => ({ value: wa })),
        workPermits: (initialData.workPermits || []).map((wp: string) => ({ value: wp })),
      };
      form.reset(formattedData);
    }
  }, [initialData, form]);

  const onSubmit = (data: ProjectFormValues) => {
    if (!firestore) return;

    // Explicitly construct the data object ensuring ALL fields are captured
    const dataToSave = {
      name: data.name,
      companyName: data.companyName,
      status: data.status,
      country: data.country,
      state: data.state,
      city: data.city,
      startDate: data.startDate,
      deliveryDate: data.deliveryDate || null,
      address: data.address || "",
      phone: data.phone || "",
      cell: data.cell || "",
      projectManagerId: data.projectManagerId || "",
      generalContractorId: data.generalContractorId || "",
      workAreas: data.workAreas?.map((wa) => wa.value).filter(v => v && v.trim() !== '') || [],
      workPermits: data.workPermits?.map((wp) => wp.value).filter(v => v && v.trim() !== '') || [],
    };

    if (isEditMode) {
      const docRef = doc(firestore, 'projects', initialData.id);
      setDoc(docRef, dataToSave, { merge: true })
        .then(() => {
          toast({
            title: 'Project Updated',
            description: `Project ${data.name} has been updated successfully.`,
          });
          router.push('/projects');
        })
        .catch((error) => {
          const permissionError = new FirestorePermissionError({
            path: `projects/${initialData.id}`,
            operation: 'update',
            requestResourceData: dataToSave,
          });
          errorEmitter.emit('permission-error', permissionError);
        });
    } else {
      if (!projectsCollection) {
        toast({ variant: 'destructive', title: 'Error', description: 'Projects collection not available.' });
        return;
      }
      addDoc(projectsCollection, dataToSave)
        .then(() => {
          toast({
            title: 'Project Created',
            description: `Project ${data.name} has been created successfully.`,
          });
          router.push('/projects');
        })
        .catch((error) => {
          const permissionError = new FirestorePermissionError({
            path: projectsCollection.path,
            operation: 'create',
            requestResourceData: dataToSave,
          });
          errorEmitter.emit('permission-error', permissionError);
        });
    }
  };

  return (
    <Form {...form}>
        <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                    <Input
                        placeholder="Name of your project"
                        {...field}
                    />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                    <Input
                        placeholder="Project's company name"
                        {...field}
                    />
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
                    <FormLabel>Status</FormLabel>
                    <Select
                    onValueChange={field.onChange}
                    value={field.value || ""}
                    >
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Select a status" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="Not Started">Not Started</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="On Hold">On Hold</SelectItem>
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Country</FormLabel>
                    <Select
                    onValueChange={(val) => {
                        field.onChange(val);
                        form.setValue('state', '');
                        form.setValue('city', '');
                    }}
                    value={field.value || ""}
                    >
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Select a country" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {COUNTRIES.map((country) => (
                          <SelectItem key={country} value={country}>
                            <div className="flex items-center gap-2">
                              {country === "United States" && <span>📌</span>}
                              {country}
                            </div>
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
                name="state"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>State / Province</FormLabel>
                    <Select
                    onValueChange={(val) => {
                        field.onChange(val);
                        form.setValue('city', '');
                    }}
                    value={field.value || ""}
                    disabled={!selectedCountry}
                    >
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder={selectedCountry ? "Select a state" : "Select country first"} />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {statesList.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
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
                name="city"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>City</FormLabel>
                    <Select
                    onValueChange={field.onChange}
                    value={field.value || ""}
                    disabled={!selectedState}
                    >
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder={selectedState ? "Select a city" : "Select state first"} />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {citiesList.map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
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
                name="startDate"
                render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
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
                    <PopoverContent
                        className="w-auto p-0"
                        align="start"
                    >
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
                name="deliveryDate"
                render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>Delivery Date</FormLabel>
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
                    <PopoverContent
                        className="w-auto p-0"
                        align="start"
                    >
                        <Calendar
                        mode="single"
                        selected={field.value || undefined}
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
                name="address"
                render={({ field }) => (
                <FormItem className="md:col-span-2">
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                    <Input
                        placeholder="123 Main St, Anytown, USA"
                        {...field}
                    />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2">
              <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                  <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                      <Input
                          type="tel"
                          placeholder="+1 234 567 890"
                          {...field}
                      />
                      </FormControl>
                      <FormMessage />
                  </FormItem>
                  )}
              />
              <FormField
                  control={form.control}
                  name="cell"
                  render={({ field }) => (
                  <FormItem>
                      <FormLabel>Cell</FormLabel>
                      <FormControl>
                      <Input
                          type="tel"
                          placeholder="+1 234 567 891"
                          {...field}
                      />
                      </FormControl>
                      <FormMessage />
                  </FormItem>
                  )}
              />
            </div>
            <FormField
                control={form.control}
                name="projectManagerId"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Project Manager</FormLabel>
                    <Select
                    onValueChange={field.onChange}
                    value={field.value || ""}
                    >
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Select a project manager" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {projectManagers.map((pm: any) => (
                        <SelectItem key={pm.id} value={pm.id}>
                            {pm.firstName} {pm.lastName}
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
                name="generalContractorId"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>General Contractor</FormLabel>
                    <Select
                    onValueChange={field.onChange}
                    value={field.value || ""}
                    >
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Select a general contractor" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {generalContractors.map((gc: any) => (
                        <SelectItem key={gc.id} value={gc.id}>
                            {gc.name}
                        </SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />
            </div>

            <div className="space-y-4">
            <h3 className="text-lg font-medium">Work Areas</h3>
            {workAreaFields.map((field, index) => (
                <div
                key={field.id}
                className="flex items-center gap-2"
                >
                <FormField
                    control={form.control}
                    name={`workAreas.${index}.value`}
                    render={({ field }) => (
                    <FormItem className="flex-grow">
                        <FormControl>
                        <Input
                            placeholder="e.g., Level 1, Sector A"
                            {...field}
                        />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeWorkArea(index)}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
                </div>
            ))}
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendWorkArea({ value: '' })}
            >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Work Area
            </Button>
            </div>

            <div className="space-y-4">
            <h3 className="text-lg font-medium">Work Permits</h3>
            {workPermitFields.map((field, index) => (
                <div
                key={field.id}
                className="flex items-center gap-2"
                >
                <FormField
                    control={form.control}
                    name={`workPermits.${index}.value`}
                    render={({ field }) => (
                    <FormItem className="flex-grow">
                        <FormControl>
                        <Input placeholder="Permit Name" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeWorkPermit(index)}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
                </div>
            ))}
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendWorkPermit({ value: '' })}
            >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Permit
            </Button>
            </div>
            <div className="flex justify-end gap-4 mt-8 pb-10">
                <Button variant="outline" type="button" asChild>
                    <Link href="/projects">Cancel</Link>
                </Button>
                <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                >
                {form.formState.isSubmitting
                    ? 'Saving...'
                    : isEditMode ? 'Save Changes' : 'Create Project'}
                </Button>
            </div>
        </form>
    </Form>
  );
}
