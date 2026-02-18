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
import { useAuth } from '@/firebase';

export function MainHeader() {
  const { role, assignedModules } = useAuth();
  
  const isAdmin = role === 'admin';
  const isProjectManager = role === 'project_manager';
  const isManager = isAdmin || isProjectManager;

  // Función para verificar si el usuario tiene acceso a un módulo específico
  const hasModuleAccess = (moduleId: string, defaultAccess: boolean) => {
    // Si el usuario tiene una lista explícita de módulos asignados, esa es la fuente de verdad.
    if (assignedModules && assignedModules.length > 0) {
      return assignedModules.includes(moduleId);
    }
    // Si no tiene configuración específica (usuarios antiguos o por defecto), usamos la lógica de roles.
    return defaultAccess;
  };

  const menuItems = [
    { id: 'dashboard', href: '/', label: 'Dashboard', icon: Home, show: hasModuleAccess('dashboard', true) },
    { id: 'customers', href: '/customers', label: 'Customers', icon: Building, show: hasModuleAccess('customers', true) },
    { id: 'projects', href: '/projects', label: 'Projects', icon: FolderKanban, show: hasModuleAccess('projects', isManager) },
    { id: 'users', href: '/users', label: 'Users', icon: Users, show: hasModuleAccess('users', isAdmin) },
    { id: 'contractors', href: '/contractors', label: 'Contractors', icon: HardHat, show: hasModuleAccess('contractors', isManager) },
    { id: 'daily-report', href: '/daily-report', label: 'Daily Report', icon: FileText, show: hasModuleAccess('daily-report', isManager) },
    { id: 'monthly-report', href: '/monthly-report', label: 'Monthly Report', icon: CalendarDays, show: hasModuleAccess('monthly-report', isManager) },
    { id: 'project-team', href: '#', label: 'Project Team', icon: Users, show: hasModuleAccess('project-team', true) },
    { id: 'documents', href: '#', label: 'Documents', icon: Files, show: hasModuleAccess('documents', true) },
    { id: 'project-aerial-view', href: '#', label: 'Project Aerial View', icon: Camera, show: hasModuleAccess('project-aerial-view', true) },
    { id: 'calendar', href: '#', label: 'Calendar', icon: CalendarDays, show: hasModuleAccess('calendar', true) },
    { id: 'map', href: '#', label: 'Map', icon: MapIcon, show: hasModuleAccess('map', true) },
    { id: 'capex', href: '#', label: 'CapEx', icon: DollarSign, show: hasModuleAccess('capex', true) },
    { id: 'reports-analytics', href: '#', label: 'Report/Analytics', icon: BarChart2, show: hasModuleAccess('reports-analytics', true) },
    { id: 'schedule', href: '#', label: 'Schedule', icon: Clock, show: hasModuleAccess('schedule', true) },
    { id: 'master-sheet-time', href: '#', label: 'Master Sheet Time', icon: Sheet, show: hasModuleAccess('master-sheet-time', true) },
    { id: 'time-sheet', href: '#', label: 'Time Sheet', icon: Timer, show: hasModuleAccess('time-sheet', true) },
    { id: 'weather', href: '#', label: 'Weather', icon: CloudSun, show: hasModuleAccess('weather', true) },
  ];

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