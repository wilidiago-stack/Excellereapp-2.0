'use client';

import { UserForm } from '@/components/user-form';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function NewUserPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/users">
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">
          Create New User
        </h1>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>User Details</CardTitle>
            <CardDescription>Fill in the details below to create a new user account.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <UserForm />
        </CardContent>
      </Card>
    </div>
  );
}
