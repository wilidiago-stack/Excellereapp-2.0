'use client';

import { UserForm } from '@/components/user-form';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ShieldCheck, Info, Users as UsersIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function NewUserPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-100px)] gap-2">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-8 w-8 rounded-sm" asChild>
          <Link href="/users">
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">Create New User</h1>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Administration / Directory</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-2 flex-1 min-h-0">
        <Card className="w-full md:w-72 shrink-0 rounded-sm border-slate-200 shadow-sm flex flex-col bg-slate-50/30">
          <CardHeader className="p-4 border-b bg-white">
            <CardTitle className="text-xs font-bold uppercase flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-[#46a395]" /> Setup Guide
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-3">
              <div className="p-3 bg-white rounded-sm border border-slate-100 shadow-sm">
                <h4 className="text-[10px] font-bold text-slate-700 uppercase mb-1">Role Definitions</h4>
                <ul className="text-[10px] text-slate-500 space-y-2">
                  <li><strong className="text-slate-700">Admin:</strong> Full system control.</li>
                  <li><strong className="text-slate-700">Project Manager:</strong> Manage specific projects.</li>
                  <li><strong className="text-slate-700">Viewer:</strong> Read-only access to assigned modules.</li>
                </ul>
              </div>
              <div className="flex items-start gap-2 p-2">
                <Info className="h-3.5 w-3.5 text-orange-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  The user will receive an automated invitation once the account is activated.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1 overflow-hidden flex flex-col rounded-sm border-slate-200 shadow-sm">
          <div className="flex-1 overflow-y-auto no-scrollbar p-6">
            <div className="max-w-2xl mx-auto">
              <UserForm />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
