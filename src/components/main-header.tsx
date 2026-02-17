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
  Home,
  Users,
  FolderKanban,
  Settings,
  LifeBuoy,
  Building,
  HardHat,
  FileText,
  CalendarDays,
  Menu,
  Bell,
  Files,
  Camera,
  Map as MapIcon,
  DollarSign,
  BarChart2,
  Clock,
  Sheet,
  Timer,
  CloudSun,
} from 'lucide-react';

export function MainHeader() {
  const menuItems = [
    { href: '/', label: 'Dashboard', icon: Home },
    { href: '/customers', label: 'Customers', icon: Building },
    { href: '/projects', label: 'Projects', icon: FolderKanban },
    { href: '/users', label: 'Users', icon: Users },
    { href: '/contractors', label: 'Contractors', icon: HardHat },
    { href: '/daily-report', label: 'Daily Report', icon: FileText },
    { href: '/monthly-report', label: 'Monthly Report', icon: CalendarDays },
    { href: '#', label: 'Project Team', icon: Users },
    { href: '#', label: 'Documents', icon: Files },
    { href: '#', label: 'Project Aerial View', icon: Camera },
    { href: '#', label: 'Calendar', icon: CalendarDays },
    { href: '#', label: 'Map', icon: MapIcon },
    { href: '#', label: 'CapEx', icon: DollarSign },
    { href: '#', label: 'Report/Analytics', icon: BarChart2 },
    { href: '#', label: 'Schedule', icon: Clock },
    { href: '#', label: 'Master Sheet Time', icon: Sheet },
    { href: '#', label: 'Time Sheet', icon: Timer },
    { href: '#', label: 'Weather', icon: CloudSun },
  ];

  const secondaryMenuItems = [
    { href: '/settings', label: 'Settings', icon: Settings, disabled: false },
    { href: '#', label: 'Support', icon: LifeBuoy, disabled: true },
  ];

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/60 px-4 backdrop-blur-sm sm:px-6">
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
        <DropdownMenuContent align="start">
          {menuItems.map((item) => (
            <DropdownMenuItem key={item.label} asChild>
              <Link href={item.href}>
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            </DropdownMenuItem>
          ))}
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
          <div className="flex flex-col">
            <span className="text-[30px] font-semibold font-brand">
              <span className="text-[#46a395]">Excellere</span>
              <span className="text-[#FF9800]">App</span>
            </span>
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
