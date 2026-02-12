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
import { runTransaction, doc, increment } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

const signUpSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
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
      name: '',
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
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      const user = userCredential.user;

      // Use a transaction to atomically create the user profile and check for the first user
      const metadataRef = doc(firestore, 'system', 'metadata');
      const userDocRef = doc(firestore, 'users', user.uid);

      await runTransaction(firestore, async (transaction) => {
        const metadataDoc = await transaction.get(metadataRef);
        let role = 'viewer';

        if (!metadataDoc.exists() || metadataDoc.data().userCount === 0) {
          // This is the first user
          role = 'admin';
          toast({
            title: 'Admin Account Created!',
            description: "You're the first user, so you've been made an admin.",
          });
          // Set or update the user count
          transaction.set(metadataRef, { userCount: increment(1) }, { merge: true });
        } else {
          // Not the first user, just increment the count
          transaction.update(metadataRef, { userCount: increment(1) });
        }

        // Create the user profile document
        transaction.set(userDocRef, {
          name: data.name,
          email: data.email,
          position: data.position,
          company: data.company,
          phoneNumber: data.phoneNumber,
          role: role,
          status: 'active',
        });
      });


      toast({
        title: 'Account Created',
        description:
          'Your account has been created successfully. Please log in.',
      });
      router.push('/login');
    } catch (error: any) {
      console.error('Sign-up error:', error);
      let description = 'An unexpected error occurred. Please try again.';
      let code = error.code || 'unknown-error';

      if (code === 'auth/operation-not-allowed') {
        description =
          'Email/Password sign-in is not enabled in your Firebase Console.';
      } else if (code === 'auth/requests-from-referer-are-blocked') {
        const domain =
          typeof window !== 'undefined' ? window.location.hostname : 'your-domain.com';
        description = `The current domain (${domain}) is not authorized for authentication. Please add it to the list of authorized domains in your Firebase Console.`;
      } else if (code === 'permission-denied') {
        description =
          "You don't have permission to perform this action. This could be due to Firestore Security Rules. Please check the console for more details.";
      }
      setAuthError({ code, message: description });
      toast({
        variant: 'destructive',
        title: 'Sign Up Failed',
        description: description,
      });
    } finally {
      setLoading(false);
    }
  };

  const renderAuthError = () => {
    if (!authError) return null;

    if (authError.code === 'auth/requests-from-referer-are-blocked') {
      const domain =
        typeof window !== 'undefined' ? window.location.hostname : 'your-domain.com';
      return (
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Action Required: Authorize Domain</AlertTitle>
          <AlertDescription>
            <p>
              Your current domain is not authorized to perform authentication
              requests.
            </p>
            <p className="font-mono bg-slate-800 text-white rounded-md p-2 my-2 break-all">
              {domain}
            </p>
            <p>
              Please go to the{' '}
              <a
                href="https://console.firebase.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Firebase Console
              </a>
              , navigate to **Authentication → Settings → Authorized domains**, and add
              the domain shown above.
            </p>
          </AlertDescription>
        </Alert>
      );
    }

    if (authError.code === 'auth/operation-not-allowed') {
         return (
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Action Required: Enable Sign-in Provider</AlertTitle>
          <AlertDescription>
             <p>Email/Password sign-in is not enabled.</p>
            <p>
              Please go to the{' '}
              <a
                href="https://console.firebase.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Firebase Console
              </a>
              , navigate to **Authentication → Sign-in method**, and enable the **Email/Password** provider.
            </p>
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
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
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
