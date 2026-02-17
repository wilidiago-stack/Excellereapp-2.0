'use client';

import { useState, useEffect, useRef } from 'react';
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
import { useAuthInstance } from '@/firebase';
import {
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  type ConfirmationResult,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

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

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const auth = useAuthInstance();
  const { toast } = useToast();
  const router = useRouter();
  const [step, setStep] = useState<'enter-phone' | 'enter-otp'>('enter-phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null);

  // This ref will hold the RecaptchaVerifier instance
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  const emailForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onEmailSubmit = async (data: LoginFormValues) => {
    if (!auth) return;

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      toast({
        title: 'Login Successful',
        description: 'Welcome back!',
      });
      router.push('/');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProviderSignIn = async (provider: GoogleAuthProvider | OAuthProvider) => {
    if (!auth) return;
    setLoading(true);
    try {
      await signInWithPopup(auth, provider);
      // On successful sign-in, the onAuthStateChanged listener in FirebaseProvider
      // will handle the user state and redirection. The onAuthUserCreate cloud
      // function will handle creating the user document in Firestore for new users.
      toast({
        title: 'Login Successful',
        description: 'Welcome!',
      });
      router.push('/');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    const provider = new GoogleAuthProvider();
    handleProviderSignIn(provider);
  };

  const handleMicrosoftSignIn = () => {
    const provider = new OAuthProvider('microsoft.com');
    handleProviderSignIn(provider);
  };

  const handleSendCode = async () => {
    if (!auth || !phoneNumber) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter a valid phone number.',
      });
      return;
    }
    setLoading(true);
    try {
      // Lazily initialize the verifier if it doesn't exist.
      if (!recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current = new RecaptchaVerifier(
          auth,
          'recaptcha-container',
          {
            size: 'invisible',
          }
        );
      }

      const result = await signInWithPhoneNumber(
        auth,
        phoneNumber,
        recaptchaVerifierRef.current
      );
      setConfirmationResult(result);
      setStep('enter-otp');
      toast({
        title: 'Verification Code Sent',
        description: 'A code has been sent to your phone.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to Send Code',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!confirmationResult || !otp) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter the verification code.',
      });
      return;
    }
    setLoading(true);
    try {
      await confirmationResult.confirm(otp);
      toast({
        title: 'Login Successful',
        description: 'Welcome!',
      });
      router.push('/');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: 'The verification code is incorrect.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <Tabs defaultValue="email" className="w-full">
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Choose your preferred sign-in method below.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button variant="outline" onClick={handleGoogleSignIn} disabled={loading}>
                  <GoogleIcon className="mr-2 h-4 w-4" />
                  Google
                </Button>
                <Button variant="outline" onClick={handleMicrosoftSignIn} disabled={loading}>
                  <MicrosoftIcon className="mr-2 h-4 w-4" />
                  Microsoft
                </Button>
            </div>
             <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                    Or
                    </span>
                </div>
            </div>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="phone">Phone</TabsTrigger>
            </TabsList>
          </CardHeader>

          <TabsContent value="email">
            <Form {...emailForm}>
              <form onSubmit={emailForm.handleSubmit(onEmailSubmit)}>
                <CardContent className="space-y-4">
                  <FormField
                    control={emailForm.control}
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
                    control={emailForm.control}
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
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Signing In...' : 'Sign In with Email'}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="phone">
            <CardContent className="space-y-4">
              {step === 'enter-phone' ? (
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 123 456 7890"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="otp">Verification Code</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                </div>
              )}
               <div id="recaptcha-container"></div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              {step === 'enter-phone' ? (
                <Button
                  onClick={handleSendCode}
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? 'Sending...' : 'Send Verification Code'}
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleVerifyOtp}
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? 'Verifying...' : 'Verify & Sign In'}
                  </Button>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setStep('enter-phone')}
                  >
                    Back to phone number
                  </Button>
                </>
              )}
            </CardFooter>
          </TabsContent>
        </Tabs>
        <CardFooter className="flex-col gap-4 border-t pt-6">
          <div className="text-sm text-center text-muted-foreground">
            Don't have an account?{' '}
            <Link href="/sign-up" className="text-primary hover:underline">
              Sign up now
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

    