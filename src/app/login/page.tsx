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
import { useAuth } from '@/firebase';
import {
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  type ConfirmationResult,
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

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [step, setStep] = useState<'enter-phone' | 'enter-otp'>('enter-phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null);

  // This ref will hold the RecaptchaVerifier instance
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  // Setup reCAPTCHA verifier
  useEffect(() => {
    if (auth && !recaptchaVerifierRef.current) {
      recaptchaVerifierRef.current = new RecaptchaVerifier(
        auth,
        'recaptcha-container',
        {
          size: 'invisible',
        }
      );
    }
  }, [auth]);

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

  const handleSendCode = async () => {
    if (!auth || !recaptchaVerifierRef.current || !phoneNumber) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter a valid phone number.',
      });
      return;
    }
    setLoading(true);
    try {
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
              Sign in with your email or phone number.
            </CardDescription>
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
                    {loading ? 'Signing In...' : 'Sign In'}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="phone">
            <CardContent className="space-y-4">
              {step === 'enter-phone' ? (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="+1 123 456 7890"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              ) : (
                <FormItem>
                  <FormLabel>Verification Code</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="123456"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
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
        <div id="recaptcha-container"></div>
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
