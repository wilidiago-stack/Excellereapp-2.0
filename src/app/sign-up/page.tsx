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
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Copy, Check } from 'lucide-react';

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
  const [copied, setCopied] = useState(false);

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

      // 2. Set user's display name in Auth
      await updateProfile(user, { displayName: data.name });

      // 3. Create user document in Firestore.
      // A Cloud Function will listen for this user's creation and securely assign the role.
      const userDocRef = doc(firestore, 'users', user.uid);
      await setDoc(userDocRef, {
        name: data.name,
        email: data.email,
        position: data.position,
        company: data.company,
        phoneNumber: data.phoneNumber || '',
        role: 'pending_role', // Backend function will update this
        status: 'pending', // Backend function will update this to 'active'
      });

      toast({
        title: 'Account Created',
        description: 'Your account has been created successfully. Please log in.',
      });
      router.push('/login');
    } catch (error: any) {
      console.error('Sign-up error:', error);
      let code = error.code || 'unknown-error';
      let description = error.message;

      setAuthError({ code, message: description });
    } finally {
      setLoading(false);
    }
  };

  const renderAuthError = () => {
    if (!authError) return null;

    const handleCopy = (text: string) => {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    };
    
    const firebaseProjectId = 'studio-2845988015-3b127';

    if (authError.code === 'auth/firebase-app-check-token-is-invalid') {
        const consoleLink = `https://console.firebase.google.com/project/${firebaseProjectId}/appcheck/apps`;
  
        return (
          <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Action Required: Use App Check Debug Token</AlertTitle>
            <AlertDescription>
              <p className="mb-3">
                To bypass reCAPTCHA issues during development, we'll use a special debug token.
              </p>
              <p className="font-semibold mb-1">1. Open your browser's developer console.</p>
              <p className="text-xs text-muted-foreground mb-3">
                (Usually by pressing F12 or Ctrl+Shift+I)
              </p>
              
              <p className="font-semibold mt-4 mb-1">2. Find and copy the debug token.</p>
              <p className="text-xs text-muted-foreground mb-3">
                Look for a message like: `Firebase App Check debug token: [some-long-string-of-characters]`. Copy the token.
              </p>
    
               <p className="font-semibold mt-4 mb-1">3. Add the token to Firebase:</p>
               <Button asChild variant="link" className="p-0 h-auto">
                   <a
                      href={consoleLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                     Go to Firebase App Check Settings
                    </a>
               </Button>
               <p className="text-xs text-muted-foreground mt-2">
                In the Firebase console for your app, click the overflow menu (⋮) and select "Manage debug tokens". Click "Add debug token" and paste the token you copied.
               </p>
               <p className="font-semibold mt-4 mb-1">4. Reload the page and try again.</p>
            </AlertDescription>
          </Alert>
        );
    }
    
    if (authError.code === 'auth/requests-from-referer-are-blocked') {
      const domain =
        typeof window !== 'undefined' ? window.location.hostname : 'your-domain.com';
      
      console.log('--- DIAGNOSTIC INFORMATION ---');
      console.log('Domain to authorize in Firebase:', domain);
      console.log('------------------------------');
      
      const consoleLink = `https://console.firebase.google.com/project/${firebaseProjectId}/authentication/settings`;

      return (
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Action Required: Authorize Your Cloud Domain</AlertTitle>
          <AlertDescription>
            <p className="mb-3">
             This is a final security step. You must tell Firebase it&apos;s okay to
              accept logins from this cloud address.
            </p>
            <p className="font-semibold mb-1">1. Copy this exact domain:</p>
            <div className="relative font-mono text-xs bg-slate-800 text-white rounded-md p-2 my-2 pr-10 break-all">
              {domain}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-1/2 right-1 -translate-y-1/2 h-8 w-8 text-white hover:bg-slate-700"
                onClick={() => handleCopy(domain)}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
             <p className="font-semibold mt-4 mb-1">2. Click this link and paste the domain:</p>
             <Button asChild variant="link" className="p-0 h-auto">
                 <a
                    href={consoleLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                   Go to Firebase Authentication Settings
                  </a>
             </Button>
             <p className="text-xs text-muted-foreground mt-2">On the Firebase page that opens, click the "Add domain" button and paste what you just copied.</p>
          </AlertDescription>
        </Alert>
      );
    }

    if (authError.code === 'auth/operation-not-allowed') {
      const consoleLink = `https://console.firebase.google.com/project/${firebaseProjectId}/authentication/sign-in-method`;
         return (
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Action Required: Enable Sign-in Provider</AlertTitle>
          <AlertDescription>
             <p className="mb-2">The Email/Password sign-in method is currently disabled for this project.</p>
            <p>
              Please go to the{' '}
              <a
                href={consoleLink}
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold"
              >
                Firebase Authentication Console
              </a>
              , select the "Sign-in method" tab, and enable the **Email/Password** provider.
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
