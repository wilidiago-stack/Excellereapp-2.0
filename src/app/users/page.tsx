'use client';

import { useState, useMemo } from 'react';
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
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { useFirestore, useCollection, useUser } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const userSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  position: z.string().min(1, 'Position is required'),
  company: z.string().min(1, 'Company is required'),
  role: z.enum(['admin', 'project_manager', 'viewer']),
  assignedProjects: z.array(z.string()).optional(),
});

type UserFormValues = z.infer<typeof userSchema>;

export default function UsersPage() {
  const [open, setOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user, loading: userLoading } = useUser();

  const usersCollection = useMemo(
    () => (user && firestore ? collection(firestore, 'users') : null),
    [user, firestore]
  );
  const { data: users, loading: usersLoading } = useCollection(usersCollection);

  const projectsCollection = useMemo(
    () => (user && firestore ? collection(firestore, 'projects') : null),
    [user, firestore]
  );
  const { data: projects, loading: projectsLoading } =
    useCollection(projectsCollection);

  const loading = userLoading || usersLoading || projectsLoading;

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: '',
      email: '',
      position: '',
      company: '',
      role: 'viewer',
      assignedProjects: [],
    },
  });

  const onSubmit = async (data: UserFormValues) => {
    if (!firestore || !usersCollection || !user) return;

    const userData = { ...data, status: 'pending' };

    addDoc(usersCollection, userData)
      .then(() => {
        toast({
          title: 'User Created',
          description: `User ${data.name} has been created.`,
        });
        setOpen(false);
        form.reset();
      })
      .catch((error) => {
        const permissionError = new FirestorePermissionError({
          path: usersCollection.path,
          operation: 'create',
          requestResourceData: userData,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const getStatusVariant = (status?: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'invited':
        return 'outline';
      case 'rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Users</CardTitle>
            <CardDescription>
              Manage account requests and user roles.
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Fill in the details below to create a new user.
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
                                {field.value &&
                                field.value.length > 0 &&
                                projects
                                  ? projects
                                      .filter((p: any) =>
                                        field.value?.includes(p.id)
                                      )
                                      .map((p: any) => p.name)
                                      .join(', ')
                                  : 'Select projects...'}
                              </span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            className="w-[--radix-dropdown-menu-trigger-width]"
                            align="start"
                          >
                            {projects?.map((project: any) => (
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
                                {project.name}
                              </DropdownMenuCheckboxItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
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
                        : 'Create User'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Loading users...
                  </TableCell>
                </TableRow>
              )}
              {!loading && users?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
              {users?.map((user: any) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.company}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(user.status)}>
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          aria-haspopup="true"
                          size="icon"
                          variant="ghost"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
