
'use client';

import React, { useEffect } from 'react';
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
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { COUNTRIES, LOCATION_DATA } from '@/lib/location-data';

const workPermitSchema = z.object({
  name: z.string().min(1, 'Permit name is required'),
  code: z.string().min(1, 'Permit code is required'),
});

const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  companyName: z.string().min(1, 'Company name is required'),
  country: z.string().min(1, 'Country is required'),
  state: z.string().min(1, 'State is required'),
  city: z.string().min(1, 'City is required'),
  startDate: z.date({ required_error: 'Start date is required.' }),
  deliveryDate: z.date().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  cell: z.string().optional(),
  projectManagerId: z.string().optional(),
  generalContractorId: z.string().optional(),
  workAreas: z
    .array(z.object({ value: z.string().min(1, 'Work area cannot be empty') }))
    .default([]),
  workPermits: z.array(workPermitSchema).default([]),
  status: z.enum(["Not Started", "In Progress", "Completed", "On Hold"]),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

interface ProjectFormProps {
    initialData?: ProjectFormValues & { id: string };
}

export function ProjectForm({ initialData }: ProjectFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const isEditMode = !!initialData;

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

  const projectManagers = (users || []).filter((u: any) => u.role === 'project_manager');
  const generalContractors = contractors || [];

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      companyName: '',
      country: '',
      state: '',
      city: '',
      startDate: undefined,
      deliveryDate: undefined,
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

  const selectedCountry = form.watch('country');
  const selectedState = form.watch('state');

  const states = selectedCountry ? Object.keys(LOCATION_DATA[selectedCountry]?.states || {}).sort((a, b) => a.localeCompare(b)) : [];
  const cities = (selectedCountry && selectedState) ? (LOCATION_DATA[selectedCountry]?.states[selectedState] || []).sort((a, b) => a.localeCompare(b)) : [];

  useEffect(() => {
    if (!isEditMode && selectedCountry) {
      form.setValue('state', '');
      form.setValue('city', '');
    }
  }, [selectedCountry, form, isEditMode]);

  useEffect(() => {
    if (!isEditMode && selectedState) {
      form.setValue('city', '');
    }
  }, [selectedState, form, isEditMode]);

  useEffect(() => {
    if (initialData) {
      form.reset({
        ...initialData,
        // @ts-ignore
        startDate: initialData.startDate?.toDate ? initialData.startDate.toDate() : initialData.startDate,
        // @ts-ignore
        deliveryDate: initialData.deliveryDate?.toDate ? initialData.deliveryDate.toDate() : initialData.deliveryDate,
        // @ts-ignore
        workAreas: initialData.workAreas?.map(wa => typeof wa === 'string' ? { value: wa } : wa) || [],
      });
    }
  }, [initialData, form]);

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

  const onSubmit = (data: ProjectFormValues) => {
    if (!firestore || !projectsCollection) return;

    const dataToSave = {
      ...data,
      workAreas: data.workAreas?.map((wa) => wa.value),
    };

    const operation = isEditMode
      ? updateDoc(doc(firestore, 'projects', initialData.id), dataToSave)
      : addDoc(projectsCollection, dataToSave);

    operation
      .then(() => {
        toast({
          title: 'Project Saved',
          description: `Project ${data.name} has been saved successfully.`,
        });
        router.push('/projects');
      })
      .catch((error) => {
        const permissionError = new FirestorePermissionError({
          path: isEditMode ? `projects/${initialData.id}` : projectsCollection.path,
          operation: isEditMode ? 'update' : 'create',
          requestResourceData: dataToSave,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
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
                    value={field.value}
                    >
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Select a status" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="Not Started">
                        Not Started
                        </SelectItem>
                        <SelectItem value="In Progress">
                        In Progress
                        </SelectItem>
                        <SelectItem value="Completed">
                        Completed
                        </SelectItem>
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
                    onValueChange={field.onChange}
                    value={field.value}
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
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!selectedCountry}
                    >
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder={selectedCountry ? "Select a state" : "Select country first"} />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {states.map((state) => (
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
                    value={field.value}
                    disabled={!selectedState}
                    >
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder={selectedState ? "Select a city" : "Select state first"} />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {cities.map((city) => (
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
                    value={field.value}
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
                    value={field.value}
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

            <div>
            <h3 className="text-lg font-medium mb-2">Work Areas</h3>
            {workAreaFields.map((field, index) => (
                <div
                key={field.id}
                className="flex items-center gap-2 mb-2"
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

            <div>
            <h3 className="text-lg font-medium mb-2">Work Permits</h3>
            {workPermitFields.map((field, index) => (
                <div
                key={field.id}
                className="flex items-center gap-2 mb-2"
                >
                <FormField
                    control={form.control}
                    name={`workPermits.${index}.name`}
                    render={({ field }) => (
                    <FormItem className="flex-grow">
                        <FormControl>
                        <Input placeholder="Permit Name" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name={`workPermits.${index}.code`}
                    render={({ field }) => (
                    <FormItem className="flex-grow">
                        <FormControl>
                        <Input placeholder="Permit Code" {...field} />
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
                onClick={() => appendWorkPermit({ name: '', code: '' })}
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
