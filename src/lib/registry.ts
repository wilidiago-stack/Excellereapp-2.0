import { 
  Home, 
  PlusCircle, 
  UserPlus, 
  FileText, 
  Sparkles, 
  FolderKanban, 
  Users, 
  HardHat, 
  CalendarDays, 
  Map, 
  CloudSun, 
  ShieldAlert,
  Files,
  Building,
  Camera,
  DollarSign,
  BarChart2,
  Clock,
  LucideIcon
} from 'lucide-react';

export interface AppAction {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  moduleId: string;
  moduleName: string;
  description: string;
}

export const ACTION_REGISTRY: AppAction[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/', icon: Home, moduleId: 'dashboard', moduleName: 'System', description: 'Main overview and project filter' },
  { id: 'project-new', label: 'New Project', href: '/projects/new', icon: PlusCircle, moduleId: 'projects', moduleName: 'Projects', description: 'Launch a new construction project' },
  { id: 'projects-list', label: 'Project List', href: '/projects', icon: FolderKanban, moduleId: 'projects', moduleName: 'Projects', description: 'Manage all project references' },
  { id: 'user-new', label: 'New User', href: '/users/new', icon: UserPlus, moduleId: 'users', moduleName: 'Users', description: 'Create a new system user' },
  { id: 'users-list', label: 'User List', href: '/users', icon: Users, moduleId: 'users', moduleName: 'Users', description: 'Directory of site personnel' },
  { id: 'contractor-new', label: 'New Contractor', href: '/contractors/new', icon: HardHat, moduleId: 'contractors', moduleName: 'Contractors', description: 'Register a new vendor' },
  { id: 'contractors-list', label: 'Contractor List', href: '/contractors', icon: HardHat, moduleId: 'contractors', moduleName: 'Contractors', description: 'Manage site subcontractors' },
  { id: 'daily-report-new', label: 'New Daily Report', href: '/daily-report/new', icon: FileText, moduleId: 'daily-report', moduleName: 'Reports', description: 'Generate field operation log' },
  { id: 'daily-report-list', label: 'Daily Reports', href: '/daily-report', icon: FileText, moduleId: 'daily-report', moduleName: 'Reports', description: 'History of daily site logs' },
  { id: 'monthly-report-new', label: 'New Monthly Report', href: '/monthly-report/new', icon: CalendarDays, moduleId: 'monthly-report', moduleName: 'Reports', description: 'Strategic monthly analysis' },
  { id: 'monthly-report-list', label: 'Monthly Reports', href: '/monthly-report', icon: CalendarDays, moduleId: 'monthly-report', moduleName: 'Reports', description: 'Archive of monthly KPI reports' },
  { id: 'safety-event-new', label: 'New Safety Event', href: '/safety-events/new', icon: ShieldAlert, moduleId: 'safety-events', moduleName: 'Safety', description: 'Register HSE incident or observation' },
  { id: 'safety-events-list', label: 'Safety Events', href: '/safety-events', icon: ShieldAlert, moduleId: 'safety-events', moduleName: 'Safety', description: 'Risk tracking and compliance' },
  { id: 'documents-view', label: 'Documents', href: '/documents', icon: Files, moduleId: 'documents', moduleName: 'Tools', description: 'Blueprint and asset repository' },
  { id: 'calendar-view', label: 'Calendar', href: '/calendar', icon: CalendarDays, moduleId: 'calendar', moduleName: 'Tools', description: 'Project milestones and timeline' },
  { id: 'map-view', label: 'Project Map', href: '/map', icon: Map, moduleId: 'map', moduleName: 'Tools', description: 'Geographic project distribution' },
  { id: 'weather-view', label: 'Weather', href: '/weather', icon: CloudSun, moduleId: 'weather', moduleName: 'Tools', description: 'Site conditions monitoring' },
  { id: 'analytics-view', label: 'Report/Analytics', href: '/reports-analytics', icon: BarChart2, moduleId: 'reports-analytics', moduleName: 'Tools', description: 'Intelligence Hub & Metrics' },
];
