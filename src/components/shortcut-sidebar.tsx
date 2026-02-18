
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
  CalendarDays,
  Home,
  Pin,
  PinOff
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
import { useAuth, useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * Registry of all possible actions that can be pinned as shortcuts.
 */
const ACTION_REGISTRY = [
  { id: 'dashboard', label: 'Dashboard', href: '/', icon: Home, moduleId: 'dashboard', moduleName: 'System' },
  { id: 'project-new', label: 'New Project', href: '/projects/new', icon: PlusCircle, moduleId: 'projects', moduleName: 'Projects' },
  { id: 'projects-list', label: 'Project List', href: '/projects', icon: FolderKanban, moduleId: 'projects', moduleName: 'Projects' },
  { id: 'user-new', label: 'New User', href: '/users/new', icon: UserPlus, moduleId: 'users', moduleName: 'Users' },
  { id: 'users-list', label: 'User List', href: '/users', icon: Users, moduleId: 'users', moduleName: 'Users' },
  { id: 'contractor-new', label: 'New Contractor', href: '/contractors/new', icon: HardHat, moduleId: 'contractors', moduleName: 'Contractors' },
  { id: 'contractors-list', label: 'Contractor List', href: '/contractors', icon: HardHat, moduleId: 'contractors', moduleName: 'Contractors' },
  { id: 'daily-report-new', label: 'New Daily Report', href: '/daily-report/new', icon: FileText, moduleId: 'daily-report', moduleName: 'Reports' },
  { id: 'daily-report-list', label: 'Daily Reports', href: '/daily-report', icon: FileText, moduleId: 'daily-report', moduleName: 'Reports' },
  { id: 'monthly-report-new', label: 'New Monthly Report', href: '/monthly-report/new', icon: CalendarDays, moduleId: 'monthly-report', moduleName: 'Reports' },
  { id: 'monthly-report-list', label: 'Monthly Reports', href: '/monthly-report', icon: CalendarDays, moduleId: 'monthly-report', moduleName: 'Reports' },
  { id: 'ai-assistant', label: 'AI Assistant', href: '#', icon: Sparkles, moduleId: 'dashboard', moduleName: 'Tools' },
];

export function ShortcutSidebar() {
  const { user, userData, role, assignedModules } = useAuth();
  const firestore = useFirestore();
  const [isOpen, setIsOpen] = useState(false);

  // Get pinned shortcut IDs from user profile or provide defaults
  const pinnedIds = (userData?.pinnedShortcuts as string[]) || ['dashboard', 'project-new', 'user-new', 'daily-report-new'];
  const isAdmin = role === 'admin';

  // Filter available actions by user's assigned modules
  const availableActions = ACTION_REGISTRY.filter(action => {
    if (isAdmin) return true;
    return assignedModules?.includes(action.moduleId) || action.moduleId === 'dashboard';
  });

  // Limit to max 7 shortcuts
  const shortcuts = ACTION_REGISTRY.filter(a => pinnedIds.includes(a.id)).slice(0, 7);

  const handleTogglePin = async (actionId: string) => {
    if (!user || !firestore) return;
    
    let newPinned = [...pinnedIds];
    if (newPinned.includes(actionId)) {
      newPinned = newPinned.filter(id => id !== actionId);
    } else {
      if (newPinned.length >= 7) return; // Enforce max 7 limit
      newPinned.push(actionId);
    }

    const userRef = doc(firestore, 'users', user.uid);
    updateDoc(userRef, { pinnedShortcuts: newPinned });
  };

  // Group actions by module for better organization in the Dialog
  const groupedActions = availableActions.reduce((acc, action) => {
    const group = acc.find(g => g.name === action.moduleName);
    if (group) {
      group.actions.push(action);
    } else {
      acc.push({ name: action.moduleName, actions: [action] });
    }
    return acc;
  }, [] as { name: string, actions: typeof ACTION_REGISTRY }[]);

  return (
    <aside className="w-14 border-r bg-white flex flex-col items-center py-6 gap-6 hidden sm:flex shrink-0">
      <TooltipProvider delayDuration={0}>
        {/* "+" Button to manage shortcuts */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full border-dashed border-slate-300 text-slate-400 hover:text-[#46a395] hover:border-[#46a395] transition-all hover:scale-110"
                >
                  <Plus className="h-5 w-5" />
                  <span className="sr-only">Manage Shortcuts</span>
                </Button>
              </DialogTrigger>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-slate-900 text-white border-none text-xs">
              <p>Manage Shortcuts</p>
            </TooltipContent>
          </Tooltip>

          <DialogContent className="sm:max-w-[500px] h-[80vh] flex flex-col p-0">
            <DialogHeader className="p-6 pb-2">
              <DialogTitle className="text-xl">Customize Shortcuts</DialogTitle>
              <DialogDescription>
                Pin up to 7 actions to your sidebar for quick access.
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="flex-1 p-6 pt-2">
              <div className="space-y-8">
                {groupedActions.map((group) => (
                  <div key={group.name} className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">{group.name}</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {group.actions.map((action) => {
                        const isPinned = pinnedIds.includes(action.id);
                        return (
                          <div key={action.id} className="flex items-center justify-between p-2 rounded-lg border border-slate-100 hover:bg-slate-50 group transition-colors">
                            <Link 
                              href={action.href} 
                              className="flex items-center gap-3 flex-1" 
                              onClick={() => setIsOpen(false)}
                            >
                              <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-white group-hover:shadow-sm transition-all">
                                <action.icon className="h-5 w-5" />
                              </div>
                              <span className="text-sm font-medium">{action.label}</span>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "h-10 w-10 rounded-lg transition-all",
                                isPinned ? "text-[#46a395] bg-[#46a395]/10" : "text-slate-300 opacity-0 group-hover:opacity-100 hover:bg-slate-200"
                              )}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleTogglePin(action.id);
                              }}
                              disabled={!isPinned && pinnedIds.length >= 7}
                            >
                              {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="p-4 border-t bg-slate-50/50 flex justify-between items-center px-6">
              <span className="text-xs font-medium text-slate-500">
                {pinnedIds.length} / 7 Shortcuts pinned
              </span>
              <Button size="sm" onClick={() => setIsOpen(false)}>Done</Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="w-8 border-t border-slate-100 my-1" />

        {/* Dynamic Pinned Shortcuts */}
        <div className="flex flex-col items-center gap-6 w-full overflow-y-auto max-h-[60vh] no-scrollbar">
          {shortcuts.map((shortcut) => (
            <Tooltip key={shortcut.id}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-xl hover:bg-slate-50 text-slate-500 hover:text-[#46a395] transition-all hover:scale-110 active:scale-95 shrink-0"
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

        {/* Help icon fixed at the bottom */}
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
    </aside>
  );
}
