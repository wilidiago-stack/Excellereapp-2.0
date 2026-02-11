'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
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
import { PlusCircle } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const contractorSchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  contactPerson: z.string().min(1, 'Contact name is required'),
  address: z.string().optional(),
  services: z.string().optional(),
  assignedProjects: z.array(z.string()).optional(),
  status: z.enum(['Active', 'Inactive']),
});

type ContractorFormValues = z.infer<typeof contractorSchema>;

// This should eventually come from your projects data
const projects = [
  { id: 'adm-dsm-pfas-replacement', label: 'ADM DSM - PFAS Replacement' },
  { id: 'project-alpha', label: 'Project Alpha' },
  { id: 'project-beta', label: 'Project Beta' },
];

export default function ContractorsPage() {
  const [open, setOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

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

  const onSubmit = (data: ContractorFormValues) => {
    if (!firestore) return;

    const contractorsCollection = collection(firestore, 'contractors');
    addDoc(contractorsCollection, data)
      .then((docRef) => {
        toast({
          title: 'Contractor created',
          description: `Contractor ${data.name} has been created successfully.`,
        });
        setOpen(false);
        form.reset();
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: contractorsCollection.path,
          operation: 'create',
          requestResourceData: data,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Contractors</CardTitle>
            <CardDescription>Manage your contractors here.</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create new contractor
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create new contractor</DialogTitle>
                <DialogDescription>
                  Fill in the details below to create a new contractor.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4 py-4"
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
                          defaultValue={field.value}
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
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button
                      type="submit"
                      disabled={form.formState.isSubmitting}
                    >
                      {form.formState.isSubmitting
                        ? 'Creating...'
                        : 'Create contractor'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <p>Contractors page under construction.</p>
        </CardContent>
      </Card>
    </>
  );
}
