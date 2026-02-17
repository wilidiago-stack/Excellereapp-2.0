'use client';

import { useForm } from 'react-hook-form';
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
import { useFirestore } from '@/firebase';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Separator } from '@/components/ui/separator';
import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const userSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  position: z.string().min(1, 'Position is required'),
  company: z.string().min(1, 'Company is required'),
  phoneNumber: z.string().optional(),
  role: z.enum(['admin', 'project_manager', 'viewer']),
  status: z.enum(['pending', 'active', 'invited', 'rejected']).optional(),
});

type UserFormValues = z.infer<typeof userSchema>;

interface UserFormProps {
    initialData?: UserFormValues & { id: string };
}

export function UserForm({ initialData }: UserFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const isEditMode = !!initialData;

  const usersCollection = useMemo(
    () => (firestore ? collection(firestore, 'users') : null),
    [firestore]
  );
  
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      position: '',
      company: '',
      phoneNumber: '',
      role: 'viewer',
      status: 'pending',
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset(initialData);
    }
  }, [initialData, form]);

  const onSubmit = (data: UserFormValues) => {
    if (!firestore || !usersCollection) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Firestore is not available.',
      });
      return;
    }

    const userData = { ...data, status: data.status || 'pending' };

    const operation = isEditMode
      ? updateDoc(doc(firestore, 'users', initialData.id), userData)
      : addDoc(usersCollection, userData);

    operation
      .then(() => {
        toast({
          title: isEditMode ? 'User Updated' : 'User Created',
          description: `User ${data.firstName} ${data.lastName} has been ${isEditMode ? 'updated' : 'created'}.`,
        });
        router.push('/users');
        router.refresh();
      })
      .catch((error) => {
        const permissionError = new FirestorePermissionError({
          path: isEditMode ? `users/${initialData.id}` : usersCollection.path,
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
        className="space-y-6"
        >
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                        <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                        <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
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
            <div className="grid grid-cols-2 gap-4">
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
                name="position"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Position</FormLabel>
                    <FormControl>
                    <Input
                        placeholder="e.g. Project Manager"
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
                name="phoneNumber"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                    <Input
                        type="tel"
                        placeholder="(123) 456-7890"
                        {...field}
                    />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
        </div>

        <Separator />

        <div className="space-y-4">
            <h3 className="text-sm font-medium">Permissions & Status</h3>
            <div className="grid grid-cols-2 gap-4">

            <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Role</FormLabel>
                <Select
                    onValueChange={field.onChange}
                    value={field.value}
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
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="invited">Invited</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
            </div>
        </div>
        <div className="flex justify-end gap-4">
            <Button variant="outline" type="button" asChild>
                <Link href="/users">Cancel</Link>
            </Button>
            <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            >
            {form.formState.isSubmitting
                ? isEditMode ? 'Saving...' : 'Creating...'
                : isEditMode ? 'Save Changes' : 'Create User'}
            </Button>
        </div>
        </form>
    </Form>
  );
}
