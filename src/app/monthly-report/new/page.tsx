'use client';

import { MonthlyReportForm } from '@/components/monthly-report-form';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft, BarChart3, TrendingUp, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function NewMonthlyReportPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-100px)] gap-2">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-8 w-8 rounded-sm" asChild>
          <Link href="/monthly-report">
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">Create Monthly Analysis</h1>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Strategic Reporting / KPIs</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-2 flex-1 min-h-0">
        <Card className="w-full md:w-72 shrink-0 rounded-sm border-slate-200 shadow-sm flex flex-col bg-slate-50/30">
          <CardHeader className="p-4 border-b bg-white">
            <CardTitle className="text-xs font-bold uppercase flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5 text-[#46a395]" /> Monthly Goals
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-3">
              <div className="p-3 bg-white rounded-sm border border-slate-100 shadow-sm">
                <h4 className="text-[10px] font-bold text-slate-700 uppercase mb-1 flex items-center gap-1.5">
                  <TrendingUp className="h-3 w-3 text-primary" /> Progress Review
                </h4>
                <p className="text-[9px] text-slate-500 leading-relaxed">
                  Summarize key milestones achieved this month and compare against the master schedule.
                </p>
              </div>
              <div className="p-3 bg-white rounded-sm border border-slate-100 shadow-sm">
                <h4 className="text-[10px] font-bold text-slate-700 uppercase mb-1 flex items-center gap-1.5">
                  <Target className="h-3 w-3 text-orange-500" /> Variance Analysis
                </h4>
                <p className="text-[9px] text-slate-500 leading-relaxed">
                  Identify any delays or budget discrepancies and explain the mitigation strategy.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1 overflow-hidden flex flex-col rounded-sm border-slate-200 shadow-sm">
          <div className="flex-1 overflow-y-auto no-scrollbar p-6">
            <div className="max-w-2xl mx-auto">
              <MonthlyReportForm />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
