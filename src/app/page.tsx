
'use client';

import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { 
  FolderKanban, 
  HardHat, 
  Users, 
  Target, 
  LayoutDashboard,
  ExternalLink,
  Plus,
  Trash2,
  Link as LinkIcon,
  Loader2,
  BarChart3,
  Sparkles
} from 'lucide-react';
import { 
  useFirestore, 
  useDoc, 
  useCollection, 
  useMemoFirebase, 
  useAuth 
} from '@/firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  deleteDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjectContext } from '@/context/project-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function Home() {
  const { user, role, assignedProjects } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { selectedProjectId, setSelectedProjectId } = useProjectContext();
  
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = role === 'admin';

  // System Metadata Read
  const metadataDoc = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'system', 'metadata') : null),
    [firestore, user?.uid]
  );
  const { data: systemMetadata, isLoading: metadataLoading } = useDoc(metadataDoc);

  // Projects Read
  const projectsCollection = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'projects') : null),
    [firestore, user?.uid]
  );
  const { data: projects, isLoading: projectsLoading } = useCollection(projectsCollection);

  // Contractors Read
  const contractorsCollection = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'contractors') : null),
    [firestore, user?.uid]
  );
  const { data: contractors, isLoading: contractorsLoading } = useCollection(contractorsCollection);

  // Quick Links Read (Project Specific Subcollection)
  const quickLinksCollection = useMemoFirebase(
    () => (firestore && selectedProjectId 
      ? collection(firestore, 'projects', selectedProjectId, 'quick_links') 
      : null),
    [firestore, selectedProjectId]
  );
  const { data: quickLinks, isLoading: linksLoading } = useCollection(quickLinksCollection);

  const loading = metadataLoading || projectsLoading || contractorsLoading;

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    if (role === 'admin') return projects;
    return projects.filter(p => assignedProjects?.includes(p.id));
  }, [projects, role, assignedProjects]);

  const handleAddLink = async () => {
    if (!firestore || !newLinkLabel || !newLinkUrl || !selectedProjectId) return;
    setIsSaving(true);
    
    const linkData = {
      label: newLinkLabel,
      url: newLinkUrl.startsWith('http') ? newLinkUrl : `https://${newLinkUrl}`,
      createdAt: serverTimestamp(),
      projectId: selectedProjectId,
    };

    const targetRef = collection(firestore, 'projects', selectedProjectId, 'quick_links');

    addDoc(targetRef, linkData)
      .then(() => {
        toast({ title: "Link Created", description: "Quick access button added." });
        setNewLinkLabel('');
        setNewLinkUrl('');
        setIsAddDialogOpen(false);
      })
      .catch((err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: targetRef.path,
          operation: 'create',
          requestResourceData: linkData,
        }));
      })
      .finally(() => setIsSaving(false));
  };

  const handleDeleteLink = (id: string) => {
    if (!firestore || !isAdmin || !selectedProjectId) return;
    const linkRef = doc(firestore, 'projects', selectedProjectId, 'quick_links', id);
    deleteDoc(linkRef).catch(err => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: linkRef.path,
        operation: 'delete',
      }));
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-sm border-slate-200 shadow-sm p-4 bg-[#46a395] text-white overflow-hidden relative group cursor-default">
          <div className="absolute right-[-10px] top-[-10px] opacity-10 group-hover:scale-110 transition-transform">
            <Users className="h-24 w-24" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Total Users</p>
          {loading ? <Skeleton className="h-8 w-20 bg-white/20 mt-1" /> : <h3 className="text-2xl font-black mt-1 leading-none">{systemMetadata?.userCount || 0}</h3>}
          <p className="text-[9px] mt-2 font-bold opacity-70">System-wide directory</p>
        </Card>
        
        <Card className="rounded-sm border-slate-200 shadow-sm p-4 bg-[#46a395] text-white overflow-hidden relative group cursor-default">
          <div className="absolute right-[-10px] top-[-10px] opacity-10 group-hover:scale-110 transition-transform">
            <FolderKanban className="h-24 w-24" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-80">My Projects</p>
          {loading ? <Skeleton className="h-8 w-20 bg-white/20 mt-1" /> : <h3 className="text-2xl font-black mt-1 leading-none">{filteredProjects.length}</h3>}
          <p className="text-[9px] mt-2 font-bold opacity-70">Accessible portfolio</p>
        </Card>

        <Card className="rounded-sm border-slate-200 shadow-sm p-4 bg-[#46a395] text-white overflow-hidden relative group cursor-default">
          <div className="absolute right-[-10px] top-[-10px] opacity-10 group-hover:scale-110 transition-transform">
            <HardHat className="h-24 w-24" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Contractors</p>
          {loading ? <Skeleton className="h-8 w-20 bg-white/20 mt-1" /> : <h3 className="text-2xl font-black mt-1 leading-none">{contractors?.length || 0}</h3>}
          <p className="text-[9px] mt-2 font-bold opacity-70">Verified vendors</p>
        </Card>

        <Card className="rounded-sm border-slate-200 shadow-sm p-4 bg-[#FF9800] text-white overflow-hidden relative group cursor-default">
          <div className="absolute right-[-10px] top-[-10px] opacity-10 group-hover:scale-110 transition-transform">
            <Target className="h-24 w-24" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Focused Project</p>
          <div className="mt-2 relative z-10">
            <Select value={selectedProjectId || "all"} onValueChange={(val) => setSelectedProjectId(val === "all" ? null : val)}>
              <SelectTrigger className="h-8 rounded-sm border-white/20 bg-white/10 text-white text-[11px] font-bold shadow-sm hover:bg-white/20 transition-colors">
                <SelectValue placeholder="Global Context" />
              </SelectTrigger>
              <SelectContent className="rounded-sm">
                <SelectItem value="all" className="text-xs font-bold">All Assigned Projects</SelectItem>
                {filteredProjects?.map((p) => <SelectItem key={p.id} value={p.id} className="text-xs font-medium">{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <p className="text-[9px] mt-2 font-bold opacity-70">Modules filter active</p>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <LayoutDashboard className="h-4 w-4 text-slate-400" />
          <div className="flex flex-col">
            <CardTitle className="text-lg text-slate-800">Activity Overview</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">System performance trends.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-sm border border-dashed border-slate-200">
            <div className="relative mb-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary animate-pulse">
                <BarChart3 className="h-8 w-8" />
              </div>
              <Sparkles className="h-5 w-5 text-orange-400 absolute -top-1 -right-1 animate-bounce" />
            </div>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-1">
              Analytics Under Construction
            </h3>
            <p className="text-xs text-slate-500 text-center max-w-xs px-4">
              We are currently working on these charts to provide you with real-time project insights and metrics.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-sm border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="p-4 border-b bg-slate-50/50 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-sm bg-[#46a395]/10 flex items-center justify-center">
              <LinkIcon className="h-4 w-4 text-[#46a395]" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold uppercase tracking-tight">Quick Access Links</CardTitle>
              <p className="text-[9px] text-slate-400 font-bold uppercase">Project-specific resources</p>
            </div>
          </div>
          {isAdmin && selectedProjectId && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-7 text-[10px] font-bold uppercase rounded-sm border-[#46a395] text-[#46a395] hover:bg-[#46a395] hover:text-white transition-all gap-1">
                  <Plus className="h-3 w-3" /> Add Link
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-sm">
                <DialogHeader>
                  <DialogTitle>Create Quick Access Button</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Button Label</label>
                    <Input placeholder="e.g. Safety Portal" value={newLinkLabel} onChange={(e) => setNewLinkLabel(e.target.value)} className="h-10 rounded-sm text-xs" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Target URL</label>
                    <Input placeholder="https://example.com" value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)} className="h-10 rounded-sm text-xs" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" size="sm" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleAddLink} disabled={!newLinkLabel || !newLinkUrl || isSaving} className="gap-2">
                    {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    Confirm Creation
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent className="p-4 bg-slate-50/20">
          {!selectedProjectId ? (
            <div className="w-full py-12 flex flex-col items-center justify-center border border-dashed rounded-sm bg-white/50">
              <FolderKanban className="h-10 w-10 text-slate-200 mb-2" />
              <p className="text-[10px] font-bold uppercase text-slate-400">Select a project context above to manage links</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {linksLoading ? [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full rounded-sm" />) : quickLinks?.length === 0 ? (
                <div className="col-span-full py-10 text-center text-[10px] font-bold uppercase text-slate-400 italic border border-dashed rounded-sm bg-white/50">
                  No project-specific links created yet
                </div>
              ) : (
                quickLinks?.map((link: any) => (
                  <div key={link.id} className="relative group">
                    <a 
                      href={link.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-sm shadow-sm hover:shadow-md hover:border-[#46a395] transition-all group relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-[#46a395]/30 hover:before:bg-[#46a395] hover:-translate-y-0.5"
                    >
                      <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#46a395]/10 group-hover:text-[#46a395] transition-colors">
                        <ExternalLink className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-black text-slate-700 block truncate group-hover:text-[#46a395] transition-colors">{link.label}</span>
                        <span className="text-[8px] text-slate-400 font-bold uppercase truncate block opacity-0 group-hover:opacity-100 transition-opacity">Open Resource</span>
                      </div>
                    </a>
                    {isAdmin && (
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          handleDeleteLink(link.id);
                        }}
                        className="absolute -right-1 -top-1 h-6 w-6 rounded-full bg-white border border-slate-100 text-slate-300 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white hover:border-red-500 shadow-sm z-10 scale-75 group-hover:scale-100"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
