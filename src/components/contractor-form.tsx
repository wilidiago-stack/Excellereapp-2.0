'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { useFirestore, useCollection, useAuth, useMemoFirebase } from '@/firebase';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useEffect } from 'react';
import Link from 'next/link';

const contractorSchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  contactPerson: z.string().min(1, 'Contact name is required'),
  address: z.string().optional(),
  services: z.string().optional(),
  assignedProjects: z.array(z.string()).optional(),
  status: z.enum(['Active', 'Inactive']),
});

type ContractorFormValues = z.infer<typeof contractorSchema>;

interface ContractorFormProps {
    initialData?: ContractorFormValues & { id: string };
}

export function ContractorForm({ initialData }: ContractorFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const isEditMode = !!initialData;

  const contractorsCollection = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'contractors') : null),
    [firestore, user]
  );
  
  const projectsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'projects') : null),
    [firestore]
  );
  const { data: projectsData } = useCollection(projectsCollection);

  const projects = (projectsData || []).map((p: any) => ({ id: p.id, label: p.name }));

  const form = useForm<ContractorFormValues>({
    resolver: zodResolver(contractorSchema),
    defaultValues: {
      name: '',
      contactPerson: '',
      address: '',
      services: '',
      assignedProjects: [],
      status: 'Active',
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset(initialData);
    }
  }, [initialData, form]);

  const onSubmit = (data: ContractorFormValues) => {
    if (!firestore || !contractorsCollection) return;

    const operation = isEditMode
      ? updateDoc(doc(firestore, 'contractors', initialData.id), data)
      : addDoc(contractorsCollection, data);

    operation
      .then(() => {
        toast({
          title: 'Contractor Saved',
          description: `Contractor ${data.name} has been saved successfully.`,
        });
        router.push('/contractors');
      })
      .catch((error) => {
        const permissionError = new FirestorePermissionError({
            path: isEditMode ? `contractors/${initialData.id}` : contractorsCollection.path,
            operation: isEditMode ? 'update' : 'create',
            requestResourceData: data,
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Contractor's company name"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="contactPerson"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact Person</FormLabel>
              <FormControl>
                <Input placeholder="e.g. John Smith" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
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
        <FormField
          control={form.control}
          name="services"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Services</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the services offered by the contractor"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="assignedProjects"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assigned Projects</FormLabel>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start font-normal"
                  >
                    <span className="truncate">
                      {field.value && field.value.length > 0
                        ? projects
                            .filter((p) =>
                              field.value?.includes(p.id)
                            )
                            .map((p) => p.label)
                            .join(', ')
                        : 'Select projects...'}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width]"
                  align="start"
                >
                  {projects.map((project) => (
                    <DropdownMenuCheckboxItem
                      key={project.id}
                      checked={field.value?.includes(project.id)}
                      onSelect={(e) => e.preventDefault()}
                      onCheckedChange={(checked) => {
                        const currentProjects = field.value || [];
                        if (checked) {
                          field.onChange([
                            ...currentProjects,
                            project.id,
                          ]);
                        } else {
                          field.onChange(
                            currentProjects.filter(
                              (id) => id !== project.id
                            )
                          );
                        }
                      }}
                    >
                      {project.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
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
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-4 pt-4">
            <Button variant="outline" type="button" asChild>
                <Link href="/contractors">Cancel</Link>
            </Button>
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting
                ? 'Saving...'
                : isEditMode ? 'Save Changes' : 'Create contractor'}
            </Button>
        </div>
      </form>
    </Form>
  );
}
