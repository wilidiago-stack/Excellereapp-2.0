'use client';

import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { ContractorForm } from '@/components/contractor-form';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditContractorPage() {
    const params = useParams();
    const id = params.id as string;
    const firestore = useFirestore();

    const contractorDocRef = useMemo(
        () => (firestore && id ? doc(firestore, 'contractors', id) : null),
        [firestore, id]
    );
    const { data: contractorData, loading } = useDoc(contractorDocRef);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                <Link href="/contractors">
                    <ChevronLeft className="h-4 w-4" />
                    <span className="sr-only">Back</span>
                </Link>
                </Button>
                <h1 className="text-2xl font-semibold tracking-tight">
                Edit Contractor
                </h1>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Contractor Details</CardTitle>
                    <CardDescription>Update the contractor's details below.</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    {loading && (
                        <div className="space-y-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-20 w-full" />
                        </div>
                    )}
                    {!loading && contractorData && (
                        <ContractorForm initialData={{ ...contractorData, id }} />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
