'use client';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

export default function SignUpPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <ShieldAlert className="w-12 h-12 text-destructive" />
        </div>
        <CardTitle>Authentication Disabled</CardTitle>
        <CardDescription>
          The sign-up and login features are temporarily disabled due to a
          persistent environment configuration issue.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground text-center">
          You can proceed to other sections of the application to continue
          development. This block will be removed once the underlying
          authentication issue is resolved.
        </p>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <Button variant="link" asChild>
          <Link href="/">Back to Home</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
