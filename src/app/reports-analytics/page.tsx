'use client';

import { useState, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  ShieldAlert, 
  Activity, 
  Download,
  Filter,
  MousePointer2,
  ChevronRight,
  Info,
  Layers,
  PieChart as PieChartIcon
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useProjectContext } from '@/context/project-context';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
} from '@/components/ui/chart';
import { 
  Bar, 
  BarChart, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area,
  Tooltip,
  LineChart,
  Line
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

type VizModel = 'project-pulse' | 'safety-matrix' | 'labor-dynamics';
type ChartType = 'bar' | 'area' | 'pie' | 'line';

export default function AnalyticsPage() {
  const firestore = useFirestore();
  const { selectedProjectId } = useProjectContext();
  const [activeModel, setActiveModel] = useState<VizModel>('project-pulse');
  const [chartType, setChartType] = useState<ChartType>('bar');

  // DATA FETCHING
  const projectsRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'projects') : null), 
    [firestore]
  );
  const { data: projects, isLoading: projectsLoading } = useCollection(projectsRef);

  const safetyRef = useMemoFirebase(() => {
    if (!firestore) return null;
    let ref = collection(firestore, 'safetyEvents');
    if (selectedProjectId) return query(ref, where('projectId', '==', selectedProjectId));
    return ref;
  }, [firestore, selectedProjectId]);
  const { data: safetyEvents, isLoading: safetyLoading } = useCollection(safetyRef);

  const reportsRef = useMemoFirebase(() => {
    if (!firestore) return null;
    let ref = collection(firestore, 'dailyReports');
    if (selectedProjectId) return query(ref, where('projectId', '==', selectedProjectId));
    return ref;
  }, [firestore, selectedProjectId]);
  const { data: dailyReports, isLoading: reportsLoading } = useCollection(reportsRef);

  // DATA PROCESSING: Project Pulse
  const projectStatusData = useMemo(() => {
    if (!projects) return [];
    const counts = projects.reduce((acc: any, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [projects]);

  // DATA PROCESSING: Safety Matrix
  const safetyTrendData = useMemo(() => {
    if (!safetyEvents) return [];
    return [...safetyEvents]
      .sort((a, b) => (a.date?.seconds || 0) - (b.date?.seconds || 0))
      .slice(-15)
      .map(e => ({
        date: e.date?.toDate ? format(e.date.toDate(), 'MMM dd') : 'N/A',
        severity: e.severity === 'Critical' ? 4 : e.severity === 'High' ? 3 : e.severity === 'Medium' ? 2 : 1,
        type: e.type
      }));
  }, [safetyEvents]);

  // DATA PROCESSING: Labor Dynamics
  const laborTrendData = useMemo(() => {
    if (!dailyReports) return [];
    return [...dailyReports]
      .sort((a, b) => (a.date?.seconds || 0) - (b.date?.seconds || 0))
      .slice(-10)
      .map(r => {
        const totalHrs = (r.manHours || []).reduce(
          (sum: number, mh: any) => sum + (mh.headcount * mh.hours), 
          0
        );
        return {
          date: r.date?.toDate ? format(r.date.toDate(), 'MMM dd') : 'N/A',
          hours: totalHrs,
          incidents: r.safetyStats?.recordableIncidents || 0
        };
      });
  }, [dailyReports]);

  const COLORS = ['#46a395', '#FF9800', '#64748b', '#ef4444', '#3b82f6'];

  const chartConfig = {
    value: { label: "Value", color: "#46a395" },
    hours: { label: "Total Man-Hours", color: "#FF9800" },
    severity: { label: "Risk Level", color: "#ef4444" }
  };

  const renderChart = () => {
    if (isLoading) return <div className="h-[350px] w-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#46a395]" /></div>;

    if (activeModel === 'project-pulse') {
      if (chartType === 'pie') {
        return (
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={projectStatusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {projectStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );
      }
      return (
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={projectStatusData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} className="text-[10px] font-bold" />
            <YAxis axisLine={false} tickLine={false} className="text-[10px]" />
            <Tooltip content={<ChartTooltipContent />} />
            <Bar dataKey="value" fill="#46a395" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (activeModel === 'safety-matrix') {
      const data = safetyTrendData;
      return (
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="date" axisLine={false} tickLine={false} className="text-[10px]" />
            <YAxis axisLine={false} tickLine={false} className="text-[10px]" />
            <Tooltip content={<ChartTooltipContent />} />
            <Area type="monotone" dataKey="severity" stroke="#ef4444" fillOpacity={1} fill="url(#colorRisk)" strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    if (activeModel === 'labor-dynamics') {
      const data = laborTrendData;
      if (chartType === 'line') {
        return (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} className="text-[10px]" />
              <YAxis axisLine={false} tickLine={false} className="text-[10px]" />
              <Tooltip content={<ChartTooltipContent />} />
              <Line type="stepAfter" dataKey="hours" stroke="#FF9800" strokeWidth={4} dot={{ r: 6, fill: '#FF9800' }} />
            </LineChart>
          </ResponsiveContainer>
        );
      }
      return (
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="date" axisLine={false} tickLine={false} className="text-[10px]" />
            <YAxis axisLine={false} tickLine={false} className="text-[10px]" />
            <Tooltip content={<ChartTooltipContent />} />
            <Bar dataKey="hours" fill="#FF9800" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }
  };

  const isLoading = projectsLoading || safetyLoading || reportsLoading;

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] gap-4 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 flex items-center gap-2">
            <Activity className="h-6 w-6 text-[#46a395]" /> 
            Intelligence Hub
          </h1>
          <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Operational Analytics & KPI Dashboard</p>
        </div>
        
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-sm border border-slate-200 shadow-sm">
          <Button 
            variant={activeModel === 'project-pulse' ? 'default' : 'ghost'} 
            size="sm" 
            className="h-8 text-[10px] font-bold uppercase rounded-sm"
            onClick={() => setActiveModel('project-pulse')}
          >
            Project Pulse
          </Button>
          <Button 
            variant={activeModel === 'safety-matrix' ? 'default' : 'ghost'} 
            size="sm" 
            className="h-8 text-[10px] font-bold uppercase rounded-sm"
            onClick={() => setActiveModel('safety-matrix')}
          >
            Safety Matrix
          </Button>
          <Button 
            variant={activeModel === 'labor-dynamics' ? 'default' : 'ghost'} 
            size="sm" 
            className="h-8 text-[10px] font-bold uppercase rounded-sm"
            onClick={() => setActiveModel('labor-dynamics')}
          >
            Labor Dynamics
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-0">
        
        <Card className="lg:col-span-1 rounded-sm border-slate-200 shadow-sm flex flex-col bg-slate-50/20">
          <CardHeader className="p-4 border-b bg-white">
            <CardTitle className="text-xs font-black uppercase flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-[#46a395]" /> Visualization Model
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-6 flex-1 overflow-y-auto no-scrollbar">
            
            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase text-slate-400">Representation Mode</label>
              <Select value={chartType} onValueChange={(v: any) => setChartType(v)}>
                <SelectTrigger className="h-10 rounded-sm border-slate-200 text-xs font-bold bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-sm">
                  <SelectItem value="bar" className="text-xs">Cluster Bar Chart</SelectItem>
                  <SelectItem value="area" className="text-xs">Smooth Area Gradient</SelectItem>
                  <SelectItem value="pie" className="text-xs">Proportional Ring (Donut)</SelectItem>
                  <SelectItem value="line" className="text-xs">Step Progression Line</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4 border-t space-y-4">
              <div className="p-3 bg-white rounded-sm border border-slate-100 shadow-sm">
                <h4 className="text-[10px] font-black text-[#46a395] uppercase mb-2 flex items-center gap-1.5">
                  <Info className="h-3 w-3" /> Model Insight
                </h4>
                <p className="text-[10px] text-slate-500 leading-relaxed italic">
                  {activeModel === 'project-pulse' && "Analyzing global distribution of work orders across portfolio states."}
                  {activeModel === 'safety-matrix' && "Monitoring recordable incident frequency vs temporal site progression."}
                  {activeModel === 'labor-dynamics' && "Tracking of cumulative man-hours reported in daily field logs."}
                </p>
              </div>

              <div className="p-3 bg-[#46a395]/5 rounded-sm border border-[#46a395]/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-600 uppercase">Context Filter</span>
                  <MousePointer2 className="h-3 w-3 text-[#46a395]" />
                </div>
                <Badge variant="outline" className="w-full justify-center py-1.5 rounded-sm bg-white border-primary/20 text-primary font-black text-[9px] uppercase">
                  {selectedProjectId ? "Active Project Only" : "Global System View"}
                </Badge>
              </div>
            </div>

            <Button variant="outline" className="w-full h-10 rounded-sm gap-2 border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors mt-auto">
              <Download className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold uppercase">Export RAW (CSV)</span>
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 rounded-sm border-slate-200 shadow-lg flex flex-col overflow-hidden">
          <CardHeader className="p-6 border-b bg-white flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-black tracking-tight text-slate-800 capitalize">
                {activeModel.replace('-', ' ')} Analysis
              </CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">Real-time data stream sync</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[9px] font-black uppercase text-slate-400">Live Sync Active</span>
            </div>
          </CardHeader>
          <CardContent className="p-8 flex-1 flex flex-col justify-center bg-slate-50/10">
            {renderChart()}
          </CardContent>
          <div className="p-4 border-t bg-slate-50/50 flex items-center justify-between px-8">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-[#46a395]" />
                <span className="text-[10px] font-bold text-slate-500 uppercase">Primary Metric</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-[#FF9800]" />
                <span className="text-[10px] font-bold text-slate-500 uppercase">Comparison Delta</span>
              </div>
            </div>
            <div className="text-[10px] font-medium text-slate-400 italic flex items-center gap-1">
              Source: Firestore Production Cluster <ChevronRight className="h-2.5 w-2.5" />
            </div>
          </div>
        </Card>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-auto">
        <Card className="rounded-sm border-slate-200 shadow-sm p-4 bg-[#46a395] text-white overflow-hidden relative group cursor-default">
          <div className="absolute right-[-10px] top-[-10px] opacity-10 group-hover:scale-110 transition-transform">
            <BarChart3 className="h-24 w-24" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Portfolio Volume</p>
          <h3 className="text-3xl font-black mt-1">{projects?.length || 0} Projects</h3>
          <p className="text-[9px] mt-2 font-bold opacity-70">Active engagements in system</p>
        </Card>

        <Card className="rounded-sm border-slate-200 shadow-sm p-4 bg-white overflow-hidden relative group cursor-default border-l-4 border-l-[#FF9800]">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Risk Mitigation</p>
          <h3 className="text-3xl font-black mt-1 text-slate-800">{safetyEvents?.length || 0} Records</h3>
          <p className="text-[9px] mt-2 font-bold text-orange-500 flex items-center gap-1">
            <ShieldAlert className="h-3 w-3" /> Compliance tracking active
          </p>
        </Card>

        <Card className="rounded-sm border-slate-200 shadow-sm p-4 bg-white overflow-hidden relative group cursor-default border-l-4 border-l-slate-800">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Site Hours</p>
          <h3 className="text-3xl font-black mt-1 text-slate-800">
            {laborTrendData.reduce((acc, curr) => acc + curr.hours, 0).toLocaleString()}h
          </h3>
          <p className="text-[9px] mt-2 font-bold text-slate-500">Cumulative reported labor</p>
        </Card>
      </div>
    </div>
  );
}
