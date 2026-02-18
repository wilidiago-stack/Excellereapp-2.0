/**
 * @fileOverview CONFIGURACIÓN CENTRAL DE MÓDULOS DE LA APLICACIÓN
 * 
 * ATENCIÓN: Este archivo es la ÚNICA fuente de verdad para los módulos del sistema.
 * ES OBLIGATORIO: Cualquier módulo nuevo que se cree en la aplicación DEBE registrarse 
 * en este array 'APP_MODULES' para que aparezca automáticamente tanto en el menú 
 * de navegación como en el panel de permisos de usuario.
 */

import { 
  Home, Users, FolderKanban, Building, HardHat, FileText, 
  CalendarDays, Files, Camera, Map as MapIcon, DollarSign, 
  BarChart2, Clock, Sheet, Timer, CloudSun, LucideIcon 
} from 'lucide-react';

export interface AppModule {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Visibilidad por defecto basada en el rol si no hay configuración explícita */
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
  { id: 'project-team', label: 'Project Team', href: '#', icon: Users, defaultVisibility: 'all' },
  { id: 'documents', label: 'Documents', href: '#', icon: Files, defaultVisibility: 'all' },
  { id: 'project-aerial-view', label: 'Project Aerial View', href: '#', icon: Camera, defaultVisibility: 'all' },
  { id: 'calendar', label: 'Calendar', href: '#', icon: CalendarDays, defaultVisibility: 'all' },
  { id: 'map', label: 'Map', href: '#', icon: MapIcon, defaultVisibility: 'all' },
  { id: 'capex', label: 'CapEx', href: '#', icon: DollarSign, defaultVisibility: 'all' },
  { id: 'reports-analytics', label: 'Report/Analytics', href: '#', icon: BarChart2, defaultVisibility: 'all' },
  { id: 'schedule', label: 'Schedule', href: '#', icon: Clock, defaultVisibility: 'all' },
  { id: 'master-sheet-time', label: 'Master Sheet Time', href: '#', icon: Sheet, defaultVisibility: 'all' },
  { id: 'time-sheet', label: 'Time Sheet', href: '#', icon: Timer, defaultVisibility: 'all' },
  { id: 'weather', label: 'Weather', href: '#', icon: CloudSun, defaultVisibility: 'all' },
];
