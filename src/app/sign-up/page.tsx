'use client';

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
  CardFooter,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
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
import { useFirestore } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Link from 'next/link';

const userSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  position: z.string().min(1, 'Position is required'),
  company: z.string().min(1, 'Company is required'),
  phoneNumber: z.string().optional(),
  assignedProjects: z
    .array(z.string())
    .min(1, 'Please select at least one project.'),
  role: z.enum(['admin', 'project_manager', 'viewer']),
});

type UserFormValues = z.infer<typeof userSchema>;

// This should eventually come from your projects data
const projects = [
  { id: 'adm-dsm-pfas-replacement', label: 'ADM DSM - PFAS Replacement' },
  { id: 'project-alpha', label: 'Project Alpha' },
  { id: 'project-beta', label: 'Project Beta' },
];

export default function SignUpPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: '',
      email: '',
      position: '',
      company: '',
      phoneNumber: '',
      assignedProjects: [],
      role: 'viewer',
    },
  });

  const onSubmit = (data: UserFormValues) => {
    if (!firestore) return;

    const usersCollection = collection(firestore, 'users');
    const userData = { ...data, status: 'pending' };

    addDoc(usersCollection, userData)
      .then((docRef) => {
        toast({
          title: 'Request Sent',
          description:
            'Your account request has been sent and is pending approval.',
        });
        form.reset();
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: usersCollection.path,
          operation: 'create',
          requestResourceData: userData,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create an Account</CardTitle>
        <CardDescription>
          Fill in the details below to request an account.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="john.doe@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Position</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Project Manager" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Acme Inc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="(123) 456-7890" {...field} />
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
                          {field.value?.length
                            ? projects
                                .filter((p) => field.value.includes(p.id))
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
                              field.onChange([...currentProjects, project.id]);
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
                  <FormDescription>
                    This selection determines which project information you can
                    view.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="project_manager">
                        Project Manager
                      </SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting
                ? 'Submitting...'
                : 'Submit Request'}
            </Button>
            <Button variant="link" asChild>
              <Link href="/">Back to Home</Link>
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
