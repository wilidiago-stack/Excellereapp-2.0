'use client';

import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { UserNav } from '@/components/user-nav';
import {
  Settings,
  LifeBuoy,
  Menu,
  Bell,
} from 'lucide-react';
import { useAuth } from '@/firebase';
import { APP_MODULES } from '@/lib/modules';

export function MainHeader() {
  const { role, assignedModules } = useAuth();
  
  const isAdmin = role === 'admin';

  // Strict visibility logic:
  // 1. If user is Admin, they see everything by default (safety fallback).
  // 2. Otherwise, they ONLY see what is in their 'assignedModules' list.
  const menuItems = APP_MODULES.map(module => {
    const isAssigned = assignedModules && assignedModules.includes(module.id);
    const show = isAdmin || isAssigned;

    return {
      ...module,
      show
    };
  });

  const secondaryMenuItems = [
    { href: '/settings', label: 'Settings', icon: Settings, disabled: false },
    { href: '#', label: 'Support', icon: LifeBuoy, disabled: true },
  ];

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-white px-4 sm:px-6">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full flex-shrink-0"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 max-h-[80vh] overflow-y-auto">
          {menuItems.map((item) =>
            item.show ? (
              <DropdownMenuItem key={item.label} asChild>
                <Link href={item.href}>
                  <item.icon className="mr-2 h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              </DropdownMenuItem>
            ) : null
          )}
          <DropdownMenuSeparator />
          {secondaryMenuItems.map((item) => (
            <DropdownMenuItem
              key={item.label}
              asChild
              disabled={item.disabled}
            >
              <Link href={item.href}>
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex flex-row items-baseline">
            <span className="text-[30px] font-semibold font-brand">
              <span className="text-[#46a395]">Excellere</span>
              <span className="text-[#FF9800]">App</span>
            </span>
            <span className="text-[8px] text-black ml-1">2.0</span>
          </div>
        </Link>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="rounded-full">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Toggle notifications</span>
        </Button>
        <UserNav />
      </div>
    </header>
  );
}
