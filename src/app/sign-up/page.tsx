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
import { useAuthInstance } from '@/firebase';
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
  const auth = useAuthInstance();
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
      password: '',
      confirmPassword: '',
    },
  });

  const onEmailSubmit = async (data: SignUpFormValues) => {
    if (!auth) {
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

      // 3. The onAuthUserCreate Cloud Function will now handle creating the Firestore document.
      // We no longer write to Firestore from the client on sign-up.

      // 4. Sign out the user immediately. This forces a clean login, ensuring
      // that the custom claims set by the Cloud Function are present in the user's token.
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

     if (authError.message.includes('AADSTS90023')) {
      return (
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Action Required: Incorrect Microsoft App Type</AlertTitle>
          <AlertDescription>
            <div className="flex flex-col gap-4 mt-2">
              <p>
                The error from Microsoft (AADSTS90023) means your app registration in Azure is set as a "Public client" (like a desktop or mobile app), but it needs to be a "Web" application to work with Firebase web sign-in.
              </p>
              <ol className="list-decimal list-inside space-y-2">
                <li>
                  Go to your App Registration in the <strong>Azure Portal</strong> and navigate to the <strong>Authentication</strong> tab on the left.
                </li>
                <li>
                  If you don't have a "Web" platform, click <strong>+ Add a platform</strong> and select <strong>Web</strong>.
                </li>
                <li>
                   In the "Redirect URIs" field, paste your Firebase auth handler URL:
                   <pre className="text-xs bg-slate-800 p-2 rounded-md mt-1">
                    {`https://${firebaseConfig.projectId}.firebaseapp.com/__/auth/handler`}
                   </pre>
                </li>
                 <li>
                  At the bottom of the page, under "Advanced settings", find the toggle for <strong>"Allow public client flows"</strong>. Make sure this is set to <strong>No</strong>.
                </li>
                <li>
                  Click <strong>Save</strong>.
                </li>
              </ol>
              <p className="font-semibold">
                After saving the changes in Azure, please try signing in again.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    if (authError.message.includes('AADSTS7000215')) {
      return (
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Action Required: Invalid Microsoft Client Secret</AlertTitle>
          <AlertDescription>
            <div className="flex flex-col gap-4 mt-2">
              <p>
                The error from Microsoft (AADSTS7000215) means the <strong>Client Secret</strong> you've configured in Firebase is incorrect.
              </p>
              <p>
                This often happens if you accidentally use the secret's <strong>ID</strong> instead of its <strong>Value</strong>. The value is only visible right after you create it in the Azure portal.
              </p>
              <ol className="list-decimal list-inside space-y-2">
                <li>
                  Go to your App Registration in the <strong>Azure Portal</strong> and navigate to <strong>Certificates & secrets</strong>.
                </li>
                <li>
                  Click <strong>+ New client secret</strong>. Copy the new secret's <strong>Value</strong> immediately (it will be hidden later).
                </li>
                <li>
                  Go to the Authentication providers tab in your Firebase Console:
                  <Button variant="link" asChild className="p-1 h-auto -translate-x-1">
                    <a
                      href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open Firebase Auth Settings
                    </a>
                  </Button>
                </li>
                <li>
                  Edit the <strong>Microsoft</strong> provider and paste the new secret <strong>Value</strong> into the "Client secret" field.
                </li>
              </ol>
              <p className="font-semibold">
                After saving the new secret in Firebase, please try signing in again.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    if (authError.message.includes('AADSTS700016')) {
      return (
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Action Required: Microsoft Sign-In Configuration Error</AlertTitle>
          <AlertDescription>
            <div className="flex flex-col gap-4 mt-2">
              <p>
                It looks like there's a configuration problem with Microsoft Sign-In. The error from Microsoft (AADSTS700016) means it doesn't recognize your app.
              </p>
              <p>
                This usually happens when the <strong>Client ID</strong> and <strong>Client Secret</strong> for the Microsoft provider are incorrect in your Firebase project settings.
              </p>
              <ol className="list-decimal list-inside space-y-2">
                <li>
                  Go to the Authentication providers tab in your Firebase Console:
                  <Button variant="link" asChild className="p-1 h-auto -translate-x-1">
                    <a
                      href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open Firebase Auth Settings
                    </a>
                  </Button>
                </li>
                <li>
                  Find the <strong>Microsoft</strong> provider and click the pencil icon to edit it.
                </li>
                <li>
                  Verify that the Client ID and Client secret match the values from your app registration in <strong>Azure Active Directory</strong>.
                </li>
              </ol>
              <p className="font-semibold">
                After correcting the configuration, please try signing in again.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      );
    }

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
            Enter your details below to create an account.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onEmailSubmit)}>
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
