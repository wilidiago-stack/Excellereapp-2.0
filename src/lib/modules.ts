
/**
 * @fileOverview CENTRAL APPLICATION MODULES CONFIGURATION
 * 
 * ATTENTION: This file is the SINGLE source of truth for system modules.
 * OBLIGATORY: Any new module created in the application MUST be registered 
 * in this 'APP_MODULES' array so it appears automatically in both the 
 * navigation menu and the user permissions panel.
 */

import { 
  Home, Users, FolderKanban, Building, HardHat, FileText, 
  CalendarDays, Files, Camera, Map as MapIcon, DollarSign, 
  BarChart2, Clock, CloudSun, ShieldAlert, LucideIcon 
} from 'lucide-react';

export interface AppModule {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Default visibility based on role if no explicit configuration exists */
  defaultVisibility: 'all' | 'manager' | 'admin';
}

export const APP_MODULES: AppModule[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/', icon: Home, defaultVisibility: 'all' },
  { id: 'customers', label: 'Customers', href: '/customers', icon: Building, defaultVisibility: 'all' },
  { id: 'projects', label: 'Projects', href: '/projects', icon: FolderKanban, defaultVisibility: 'manager' },
  { id: 'users', label: 'Users', href: '/users', icon: Users, defaultVisibility: 'admin' },
  { id: 'contractors', label: 'Contractors', href: '/contractors', icon: HardHat, defaultVisibility: 'manager' },
  { id: 'daily-report', label: 'Daily Report', href: '/daily-report', icon: FileText, defaultVisibility: 'manager' },
  { id: 'monthly-report', label: 'Monthly Report', href: '/monthly-report', icon: CalendarDays, defaultVisibility: 'manager' },
  { id: 'safety-events', label: 'Safety Events', href: '/safety-events', icon: ShieldAlert, defaultVisibility: 'all' },
  { id: 'project-team', label: 'Project Team', href: '/project-team', icon: Users, defaultVisibility: 'all' },
  { id: 'documents', label: 'Documents', href: '#', icon: Files, defaultVisibility: 'all' },
  { id: 'project-aerial-view', label: 'Project Aerial View', href: '#', icon: Camera, defaultVisibility: 'all' },
  { id: 'calendar', label: 'Calendar', href: '/calendar', icon: CalendarDays, defaultVisibility: 'all' },
  { id: 'map', label: 'Map', href: '/map', icon: MapIcon, defaultVisibility: 'all' },
  { id: 'capex', label: 'CapEx', href: '#', icon: DollarSign, defaultVisibility: 'all' },
  { id: 'reports-analytics', label: 'Report/Analytics', href: '#', icon: BarChart2, defaultVisibility: 'all' },
  { id: 'schedule', label: 'Schedule', href: '#', icon: Clock, defaultVisibility: 'all' },
  { id: 'weather', label: 'Weather', href: '/weather', icon: CloudSun, defaultVisibility: 'all' },
];
