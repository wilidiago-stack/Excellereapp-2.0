'use client';

import { 
  PlusCircle, 
  UserPlus, 
  FileText, 
  Sparkles, 
  HelpCircle,
  Calculator,
  LayoutGrid
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import Link from 'next/link';

export function ShortcutSidebar() {
  const shortcuts = [
    { icon: PlusCircle, label: 'New Project', href: '/projects/new' },
    { icon: UserPlus, label: 'New User', href: '/users/new' },
    { icon: FileText, label: 'New Daily Report', href: '/daily-report/new' },
    { icon: LayoutGrid, label: 'All Modules', href: '#' },
    { icon: Calculator, label: 'CapEx Calc', href: '#' },
    { icon: Sparkles, label: 'AI Assistant', href: '#' },
    { icon: HelpCircle, label: 'Help & Support', href: '#' },
  ];

  return (
    <aside className="w-14 border-l bg-white flex flex-col items-center py-6 gap-6 hidden sm:flex shrink-0">
      <TooltipProvider delayDuration={0}>
        {shortcuts.map((shortcut, index) => (
          <Tooltip key={index}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-xl hover:bg-slate-50 text-slate-500 hover:text-[#46a395] transition-all hover:scale-110 active:scale-95"
                asChild
              >
                <Link href={shortcut.href}>
                  <shortcut.icon className="h-5 w-5" />
                  <span className="sr-only">{shortcut.label}</span>
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="bg-slate-900 text-white border-none text-xs">
              <p>{shortcut.label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
    </aside>
  );
}
