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
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  getAdditionalUserInfo,
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

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.05 1.05-2.58 2.64-5.23 2.64-4.38 0-7.95-3.6-7.95-7.95s3.57-7.95 7.95-7.95c2.43 0 4.02.96 4.95 1.86l2.6-2.6C18.15 2.1 15.6.8 12.48.8 6.09.8.96 5.91.96 12.3s5.13 11.5 11.52 11.5c6.2 0 11.04-4.14 11.04-11.28 0-.75-.06-1.5-.18-2.22h-11.8z" />
  </svg>
);

const MicrosoftIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M11.4 23.2h-11.4v-11.4h11.4v11.4zm0-12.6h-11.4v-10.6h11.4v10.6zm1.2-10.6v10.6h11.4v-10.6h-11.4zm0 23.2h11.4v-11.4h-11.4v11.4z" />
  </svg>
);

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
      position: '',
      company: '',
      phoneNumber: '',
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

  const handleProviderSignUp = async (
    provider: GoogleAuthProvider | OAuthProvider
  ) => {
    if (!auth) return;
    setLoading(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, provider);
      // On successful sign-in/sign-up, the onAuthStateChanged listener in FirebaseProvider
      // will handle the user state and redirection. The onAuthUserCreate cloud
      // function will handle creating the user document in Firestore for new users.
      toast({
        title: 'Sign-up/Login Successful',
        description: 'Welcome!',
      });
      router.push('/');
    } catch (error: any) {
      setAuthError({ code: error.code, message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = () => {
    const provider = new GoogleAuthProvider();
    handleProviderSignUp(provider);
  };

  const handleMicrosoftSignUp = () => {
    const provider = new OAuthProvider('microsoft.com');
    handleProviderSignUp(provider);
  };

  const renderAuthError = () => {
    if (!authError) return null;

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
            Choose your sign-up method below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {authError && renderAuthError()}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button
              variant="outline"
              onClick={handleGoogleSignUp}
              disabled={loading}
            >
              <GoogleIcon className="mr-2 h-4 w-4" />
              Sign up with Google
            </Button>
            <Button
              variant="outline"
              onClick={handleMicrosoftSignUp}
              disabled={loading}
            >
              <MicrosoftIcon className="mr-2 h-4 w-4" />
              Sign up with Microsoft
            </Button>
          </div>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>
        </CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onEmailSubmit)}>
            <CardContent className="space-y-4">
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
