import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';

export default function UsersPage() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Users</CardTitle>
          <CardDescription>Manage your users here.</CardDescription>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create new user
        </Button>
      </CardHeader>
      <CardContent>
        <p>Users page under construction.</p>
      </CardContent>
    </Card>
  );
}
