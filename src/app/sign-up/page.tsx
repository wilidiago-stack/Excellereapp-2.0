'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
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
import { useToast } from '@/hooks/use-toast';
import { useAuth, useFirestore } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { firebaseConfig } from '@/firebase/config';

const signUpSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    position: z.string().min(1, 'Position is required'),
    company: z.string().min(1, 'Company is required'),
    phoneNumber: z.string().optional(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type SignUpFormValues = z.infer<typeof signUpSchema>;

export default function SignUpPage() {
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<{
    code: string;
    message: string;
  } | null>(null);

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      position: '',
      company: '',
      phoneNumber: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: SignUpFormValues) => {
    if (!auth || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Firebase is not available.',
      });
      return;
    }
    setLoading(true);
    setAuthError(null);

    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      const user = userCredential.user;

      // 2. Set user's display name in Auth. This will be available to the Cloud Function.
      await updateProfile(user, {
        displayName: `${data.firstName} ${data.lastName}`,
      });

      // 3. Create/merge user document in Firestore.
      // The client creates the doc with profile info. A Cloud Function will then
      // add the role and status, preventing race conditions.
      const userDocRef = doc(firestore, 'users', user.uid);
      await setDoc(
        userDocRef,
        {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          position: data.position,
          company: data.company,
          phoneNumber: data.phoneNumber || '',
          // The `role` and `status` fields are now exclusively set by the Cloud Function.
        },
        { merge: true }
      );

      // 4. Sign out the user immediately. This forces a clean login, ensuring
      // that the custom claims (like the 'admin' role) set by the Cloud Function
      // are present in the user's token when they log in.
      await signOut(auth);

      toast({
        title: 'Account Created',
        description:
          'Your account has been created successfully. Please log in.',
      });
      router.push('/login');
    } catch (error: any) {
      console.error('Sign-up error:', error);
      let code = error.code || 'unknown-error';
      let description = error.message;

      if (error.code === 'auth/email-already-in-use') {
        description =
          'This email address is already in use by another account.';
      }

      setAuthError({ code, message: description });
    } finally {
      setLoading(false);
    }
  };

  const renderAuthError = () => {
    if (!authError) return null;

    if (authError.code === 'auth/operation-not-allowed') {
      return (
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>
            Action Required: Enable Email/Password Provider
          </AlertTitle>
          <AlertDescription>
            <div className="flex flex-col gap-4 mt-2">
              <p>
                This error means that you haven't enabled the "Email/Password"
                sign-in provider in your Firebase project.
              </p>
              <ol className="list-decimal list-inside space-y-2">
                <li>
                  Go to the Authentication providers tab in your Firebase
                  Console:
                  <Button
                    variant="link"
                    asChild
                    className="p-1 h-auto -translate-x-1"
                  >
                    <a
                      href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open Firebase Auth Settings
                    </a>
                  </Button>
                </li>
                <li>Click on **Email/Password** and enable it.</li>
              </ol>
              <p className="font-semibold">
                After enabling it, please try signing up again.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    if (authError.code === 'auth/app-check-token-is-invalid') {
      return (
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Action Required: Configure App Check</AlertTitle>
          <AlertDescription>
            <div className="flex flex-col gap-4 mt-2">
              <p>
                Your app is enforcing App Check, but it's not configured
                correctly for local development. To fix this:
              </p>
              <ol className="list-decimal list-inside space-y-2">
                <li>
                  Go to the App Check section in your Firebase Console:
                  <Button
                    variant="link"
                    asChild
                    className="p-1 h-auto -translate-x-1"
                  >
                    <a
                      href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/appcheck/apps`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open Firebase App Check Settings
                    </a>
                  </Button>
                </li>
                <li>
                  Find **Authentication** in the list of services and click the
                  menu to select **Manage enforcement**.
                </li>
                <li>
                  In the dialog that appears, set the toggle to **Unenforced** and
                  click **Save**.
                </li>
              </ol>
              <p className="font-semibold">
                After saving, refresh this page and try signing up again.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <Alert variant="destructive">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Sign Up Failed</AlertTitle>
        <AlertDescription>{authError.message}</AlertDescription>
      </Alert>
    );
  };

  return (
    <div className="flex items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create an Account</CardTitle>
          <CardDescription>
            Fill out the form below to create your account.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              {authError && renderAuthError()}
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
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position / Title</FormLabel>
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
                    <FormLabel>Phone Number (Optional)</FormLabel>
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
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
              <div className="text-sm text-center text-muted-foreground">
                Already have an account?{' '}
                <Link href="/login" className="text-primary hover:underline">
                  Sign In
                </Link>
              </div>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
