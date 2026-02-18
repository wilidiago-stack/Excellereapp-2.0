'use client';

import { 
  Plus, 
  PlusCircle, 
  UserPlus, 
  FileText, 
  Sparkles, 
  HelpCircle,
  FolderKanban,
  Users,
  HardHat,
  CalendarDays
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Link from 'next/link';
import { useState } from 'react';

export function ShortcutSidebar() {
  const [isOpen, setIsOpen] = useState(false);

  const shortcuts = [
    { icon: PlusCircle, label: 'New Project', href: '/projects/new' },
    { icon: UserPlus, label: 'New User', href: '/users/new' },
    { icon: FileText, label: 'New Daily Report', href: '/daily-report/new' },
    { icon: Sparkles, label: 'AI Assistant', href: '#' },
  ];

  const quickActions = [
    { module: 'Projects', label: 'Create New Project', href: '/projects/new', icon: FolderKanban },
    { module: 'Users', label: 'Create New User', href: '/users/new', icon: Users },
    { module: 'Contractors', label: 'Create New Contractor', href: '/contractors/new', icon: HardHat },
    { module: 'Daily Reports', label: 'Create New Daily Report', href: '/daily-report/new', icon: FileText },
    { module: 'Monthly Reports', label: 'Create New Monthly Report', href: '/monthly-report/new', icon: CalendarDays },
  ];

  return (
    <aside className="w-14 border-r bg-white flex flex-col items-center py-6 gap-6 hidden sm:flex shrink-0">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <TooltipProvider delayDuration={0}>
          {/* Botón "+" para agregar atajos/acciones rápidas */}
          <Tooltip>
            <TooltipTrigger asChild>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full border-dashed border-slate-300 text-slate-400 hover:text-[#46a395] hover:border-[#46a395] transition-all hover:scale-110"
                >
                  <Plus className="h-5 w-5" />
                  <span className="sr-only">Quick Actions</span>
                </Button>
              </DialogTrigger>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-slate-900 text-white border-none text-xs">
              <p>Quick Actions</p>
            </TooltipContent>
          </Tooltip>

          <div className="w-8 border-t border-slate-100 my-1" />

          {/* Atajos principales */}
          <div className="flex flex-col items-center gap-6 w-full">
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
                <TooltipContent side="right" className="bg-slate-900 text-white border-none text-xs">
                  <p>{shortcut.label}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>

          {/* Ayuda al final */}
          <div className="mt-auto flex flex-col items-center">
             <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-xl text-slate-400 hover:text-[#46a395]"
                    asChild
                  >
                    <Link href="#">
                      <HelpCircle className="h-5 w-5" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-slate-900 text-white border-none text-xs">
                  <p>Help & Support</p>
                </TooltipContent>
             </Tooltip>
          </div>
        </TooltipProvider>

        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Quick Actions</DialogTitle>
            <DialogDescription>
              Select a task to jump directly to the creation form of any module.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-6">
            {quickActions.map((action) => (
              <Button
                key={action.href}
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-3 justify-center border-slate-100 hover:border-[#46a395] hover:text-[#46a395] hover:bg-[#46a395]/5 group transition-all"
                asChild
                onClick={() => setIsOpen(false)}
              >
                <Link href={action.href}>
                  <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-[#46a395]/10 transition-colors">
                    <action.icon className="h-6 w-6" />
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-[#46a395]/70">{action.module}</p>
                    <p className="text-sm font-medium">{action.label}</p>
                  </div>
                </Link>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
