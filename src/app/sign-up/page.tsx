'use client';

import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useAuth, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 48"
    width="24px"
    height="24px"
  >
    <path
      fill="#FFC107"
      d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
    />
    <path
      fill="#FF3D00"
      d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
    />
    <path
      fill="#4CAF50"
      d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.519-3.487-11.02-8.224l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
    />
    <path
      fill="#1976D2"
      d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C39.99,34.551,44,28.717,44,24C44,22.659,43.862,21.35,43.611,20.083z"
    />
  </svg>
);

const MicrosoftIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 48"
    width="24px"
    height="24px"
  >
    <path fill="#f35325" d="M22,22H6V6h16V22z" />
    <path fill="#81bc06" d="M42,22H26V6h16V22z" />
    <path fill="#05a6f0" d="M22,42H6V26h16V42z" />
    <path fill="#ffba08" d="M42,42H26V26h16V42z" />
  </svg>
);

const AppleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 48"
    width="24px"
    height="24px"
  >
    <path
      fill="#000000"
      d="M37.12,31.2c-2.26-1.57-3.95-3.8-3.95-6.62c0-2.47,1.34-4.55,3.31-5.91c-2.18-2.62-5.18-3.6-7.53-3.6c-2.83,0-5.41,1.34-7.1,3.34c-1.73-2.07-4.39-3.34-7.06-3.34c-3.44,0-6.6,2.15-8.39,5.35c-3.25,5.8-0.94,14.4,2.78,19.34c1.8,2.37,3.89,5.23,6.6,5.23c2.61,0,3.52-1.69,6.58-1.69s3.94,1.69,6.58,1.69c2.71,0,4.8-2.86,6.56-5.23C41.69,38.75,42.54,34.42,37.12,31.2z M30.88,10.39c1.17-1.46,1.86-3.13,1.86-4.89c0-0.1,0-0.19-0.01-0.29c-1.92,0.14-3.79,1.13-4.99,2.62c-1.12,1.39-1.92,3.13-1.78,4.92C26.08,12.83,28.01,13.01,30.88,10.39z"
    />
  </svg>
);

const signUpSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
type SignUpFormValues = z.infer<typeof signUpSchema>;

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});
type SignInFormValues = z.infer<typeof signInSchema>;

export default function SignUpPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const signUpForm = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const signInForm = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const processUser = useCallback(
    async (user: FirebaseUser, name?: string) => {
      if (!firestore) return;

      if (!user.email) {
        toast({
          variant: 'destructive',
          title: 'Email not provided',
          description:
            'Your social account did not provide an email. Please try another provider.',
        });
        setIsLoading(false);
        return;
      }

      const userDocRef = doc(firestore, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        await setDoc(userDocRef, {
          name: name || user.displayName || user.email,
          email: user.email,
          role: 'viewer',
          status: 'active',
          position: '',
          company: '',
          phoneNumber: user.phoneNumber || '',
          assignedProjects: [],
        });
        toast({
          title: 'Account Created',
          description: 'Welcome! Your account has been successfully created.',
        });
      }

      router.push('/');
    },
    [firestore, router, toast]
  );

  useEffect(() => {
    if (!auth) {
      setIsLoading(false);
      return;
    }

    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          processUser(result.user);
        } else {
          setIsLoading(false);
        }
      })
      .catch((error) => {
        console.error(error);
        toast({
          variant: 'destructive',
          title: 'Uh oh! Something went wrong.',
          description:
            error.code === 'auth/account-exists-with-different-credential'
              ? 'An account already exists with the same email address but different sign-in credentials. Please sign in using the original method.'
              : error.message || 'Could not complete sign in.',
        });
        setIsLoading(false);
      });
  }, [auth, processUser, toast]);

  const handleSocialLogin = async (
    providerName: 'google' | 'microsoft' | 'apple'
  ) => {
    if (!auth) {
      toast({
        variant: 'destructive',
        title: 'Firebase not initialized',
        description: 'Please wait a moment and try again.',
      });
      return;
    }

    setIsLoading(true);

    let provider;
    if (providerName === 'google') {
      provider = new GoogleAuthProvider();
    } else if (providerName === 'microsoft') {
      provider = new OAuthProvider('microsoft.com');
    } else {
      provider = new OAuthProvider('apple.com');
    }

    await signInWithRedirect(auth, provider);
  };

  const handleEmailSignUp = async (data: SignUpFormValues) => {
    if (!auth) return;
    setIsLoading(true);
    setAuthError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      await processUser(userCredential.user, data.name);
    } catch (error: any) {
      setAuthError(error.message);
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = async (data: SignInFormValues) => {
    if (!auth) return;
    setIsLoading(true);
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      router.push('/');
    } catch (error: any) {
      setAuthError(error.message);
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Just a moment...</CardTitle>
          <CardDescription>
            Please wait while we prepare the sign-in process.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center p-8">
            <Loader2 className="h-12 w-12 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <Tabs defaultValue="sign-in" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sign-in">Sign In</TabsTrigger>
          <TabsTrigger value="sign-up">Sign Up</TabsTrigger>
        </TabsList>
        <TabsContent value="sign-in">
          <CardHeader className="text-center">
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your email and password to access your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Form {...signInForm}>
              <form
                onSubmit={signInForm.handleSubmit(handleEmailSignIn)}
                className="space-y-4"
              >
                <FormField
                  control={signInForm.control}
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
                  control={signInForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={signInForm.formState.isSubmitting}
                >
                  {signInForm.formState.isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Sign In
                </Button>
              </form>
            </Form>
          </CardContent>
        </TabsContent>
        <TabsContent value="sign-up">
          <CardHeader className="text-center">
            <CardTitle>Create an Account</CardTitle>
            <CardDescription>
              Enter your details below to create a new account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Form {...signUpForm}>
              <form
                onSubmit={signUpForm.handleSubmit(handleEmailSignUp)}
                className="space-y-4"
              >
                <FormField
                  control={signUpForm.control}
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
                  control={signUpForm.control}
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
                  control={signUpForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={signUpForm.formState.isSubmitting}
                >
                  {signUpForm.formState.isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Create Account
                </Button>
              </form>
            </Form>
          </CardContent>
        </TabsContent>
      </Tabs>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <CardContent className="space-y-4">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => handleSocialLogin('google')}
        >
          <GoogleIcon className="mr-2" />
          Continue with Google
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => handleSocialLogin('microsoft')}
        >
          <MicrosoftIcon className="mr-2" />
          Continue with Microsoft
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => handleSocialLogin('apple')}
        >
          <AppleIcon className="mr-2" />
          Continue with Apple
        </Button>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        {authError && (
          <p className="text-sm font-medium text-destructive">{authError}</p>
        )}
        <Button variant="link" asChild>
          <Link href="/">Back to Home</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
