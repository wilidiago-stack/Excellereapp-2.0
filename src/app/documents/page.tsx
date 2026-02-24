'use client';

import { useState, useMemo } from 'react';
import { useProjectContext } from '@/context/project-context';
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase, 
  useAuth, 
  useStorage 
} from '@/firebase';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  doc, 
  deleteDoc,
  query,
  where,
  updateDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  FileText, 
  Upload, 
  Search, 
  Trash2, 
  Download, 
  Loader2, 
  Files,
  FileCheck,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FolderPlus,
  Folder,
  ChevronRight,
  MoreVertical,
  Move,
  ExternalLink
} from 'lucide-react';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cn } from '@/lib/utils';

interface Breadcrumb {
  id: string;
  name: string;
}

export default function DocumentsPage() {
  const { selectedProjectId } = useProjectContext();
  const firestore = useFirestore();
  const storage = useStorage();
  const { user, role } = useAuth();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Navigation State
  const [currentFolderId, setCurrentFolderId] = useState<string>('root');
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([{ id: 'root', name: 'Main Repository' }]);

  const isVerified = user?.emailVerified;
  const isAdmin = role === 'admin';
  const isPM = role === 'project_manager';
  const canWrite = (isAdmin || isPM) && isVerified;

  const projectsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'projects') : null),
    [firestore]
  );
  const { data: projects } = useCollection(projectsCollection);
  const activeProject = projects?.find(p => p.id === selectedProjectId);

  const docsCollection = useMemoFirebase(() => {
    if (!firestore || !selectedProjectId) return null;
    return query(
      collection(firestore, 'projects', selectedProjectId, 'documents'),
      where('parentId', '==', currentFolderId)
    );
  }, [firestore, selectedProjectId, currentFolderId]);

  const { data: items, isLoading } = useCollection(docsCollection);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    return items.filter(item => 
      item.name?.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => {
      // Folders first
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;
      return a.name.localeCompare(b.name);
    });
  }, [items, searchQuery]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedProjectId || !user || !storage || !firestore) return;
    if (!isVerified) {
      toast({ variant: 'destructive', title: 'Account Not Verified', description: 'Please verify your email.' });
      return;
    }

    setIsUploading(true);
    try {
      const storagePath = `projects/${selectedProjectId}/documents/${Date.now()}_${selectedFile.name}`;
      const storageRef = ref(storage, storagePath);
      
      const snapshot = await uploadBytes(storageRef, selectedFile);
      const downloadUrl = await getDownloadURL(snapshot.ref);

      const docData = {
        name: selectedFile.name,
        fileUrl: downloadUrl,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
        type: 'file',
        parentId: currentFolderId,
        uploadedById: user.uid,
        uploadedByName: user.displayName || user.email,
        uploadDate: serverTimestamp(),
        projectId: selectedProjectId,
      };

      await addDoc(collection(firestore, 'projects', selectedProjectId, 'documents'), docData);

      toast({ title: 'Upload Complete', description: `${selectedFile.name} is now available.` });
      setUploadDialogOpen(false);
      setSelectedFile(null);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Upload Failed', description: 'Storage access denied.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName || !selectedProjectId || !firestore) return;
    
    const folderData = {
      name: newFolderName,
      type: 'folder',
      parentId: currentFolderId,
      uploadDate: serverTimestamp(),
      projectId: selectedProjectId,
      uploadedByName: user?.displayName || user?.email,
    };

    try {
      await addDoc(collection(firestore, 'projects', selectedProjectId, 'documents'), folderData);
      toast({ title: 'Folder Created', description: `Directory '${newFolderName}' added.` });
      setNewFolderName('');
      setFolderDialogOpen(false);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not create folder.' });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!firestore || !selectedProjectId || !canWrite) return;
    
    const docRef = doc(firestore, 'projects', selectedProjectId, 'documents', id);
    deleteDoc(docRef)
      .then(() => {
        toast({ title: 'Deleted', description: `${name} has been removed.` });
      })
      .catch((error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        }));
      });
  };

  const navigateToFolder = (id: string, name: string) => {
    setCurrentFolderId(id);
    setBreadcrumbs(prev => [...prev, { id, name }]);
  };

  const navigateToBreadcrumb = (index: number) => {
    const target = breadcrumbs[index];
    setCurrentFolderId(target.id);
    setBreadcrumbs(prev => prev.slice(0, index + 1));
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] gap-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">Project Documents</h1>
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span>Repository & Blueprint Explorer.</span>
            {selectedProjectId && (
              <Badge variant="secondary" className="h-4 rounded-sm text-[9px] bg-[#46a395]/10 text-[#46a395] font-black uppercase">
                {activeProject?.name || 'Project Filter Active'}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {canWrite && (
            <div className="flex items-center gap-2">
              <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 rounded-sm gap-2" disabled={!selectedProjectId}>
                    <FolderPlus className="h-3.5 w-3.5" /> New Folder
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-sm">
                  <DialogHeader><DialogTitle>Create New Folder</DialogTitle></DialogHeader>
                  <div className="py-4"><Input placeholder="Folder Name" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} className="h-10 text-xs" /></div>
                  <DialogFooter>
                    <Button variant="outline" size="sm" onClick={() => setFolderDialogOpen(false)}>Cancel</Button>
                    <Button size="sm" onClick={handleCreateFolder} disabled={!newFolderName}>Create Folder</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-8 rounded-sm gap-2" disabled={!selectedProjectId}>
                    <Upload className="h-3.5 w-3.5" /> Upload File
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-sm">
                  <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
                  <div className="space-y-4 py-4">
                    <Input type="file" onChange={handleFileChange} className="h-10 text-xs pt-2" />
                    {selectedFile && (
                      <div className="p-3 bg-slate-50 rounded-sm border flex items-center gap-3">
                        <FileCheck className="h-5 w-5 text-[#46a395]" /><div className="flex-1 overflow-hidden"><p className="text-xs font-bold truncate">{selectedFile.name}</p><p className="text-[10px] text-slate-400">{formatFileSize(selectedFile.size)}</p></div>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" size="sm" onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
                    <Button size="sm" onClick={handleUpload} disabled={!selectedFile || isUploading} className="gap-2">
                      {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Confirm
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </div>

      {!selectedProjectId ? (
        <Card className="border-dashed py-20 flex flex-col items-center justify-center text-center bg-slate-50/20">
          <Files className="h-12 w-12 text-slate-200 mb-4" />
          <h2 className="text-sm font-bold text-slate-600">Select a project context</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">Use the Dashboard project filter to browse documents.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2 flex-1 min-h-0">
          {/* NAVIGATION BAR */}
          <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-sm border border-slate-200">
            {breadcrumbs.map((crumb, idx) => (
              <div key={crumb.id} className="flex items-center gap-2">
                <button 
                  onClick={() => navigateToBreadcrumb(idx)}
                  className={cn(
                    "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-sm transition-all",
                    idx === breadcrumbs.length - 1 ? "bg-white text-[#46a395] shadow-sm" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  {crumb.name}
                </button>
                {idx < breadcrumbs.length - 1 && <ChevronRight className="h-3 w-3 text-slate-300" />}
              </div>
            ))}
            <div className="flex-1" />
            <div className="relative w-48">
              <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400" />
              <Input placeholder="Search items..." className="pl-7 h-7 bg-white text-[10px] rounded-sm" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
          </div>

          <Card className="flex-1 overflow-hidden flex flex-col rounded-sm border-slate-200 shadow-sm">
            <div className="flex-1 overflow-y-auto no-scrollbar">
              <Table>
                <TableHeader className="bg-slate-50 sticky top-0 z-10">
                  <TableRow className="h-10 border-b-slate-200">
                    <TableHead className="text-[11px] font-bold px-6">Name</TableHead>
                    <TableHead className="text-[11px] font-bold">Type</TableHead>
                    <TableHead className="text-[11px] font-bold">Size</TableHead>
                    <TableHead className="text-[11px] font-bold">Modified</TableHead>
                    <TableHead className="h-10 w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [1, 2].map(i => <TableRow key={i}><TableCell colSpan={5}><Loader2 className="h-4 w-4 animate-spin mx-auto text-slate-200" /></TableCell></TableRow>)
                  ) : filteredItems.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="h-32 text-center text-xs text-slate-400">Empty directory.</TableCell></TableRow>
                  ) : (
                    filteredItems.map((item: any) => (
                      <TableRow key={item.id} className="hover:bg-slate-50/50 border-b-slate-100 group">
                        <TableCell className="py-2.5 px-6">
                          <div className="flex items-center gap-3">
                            {item.type === 'folder' ? (
                              <button onClick={() => navigateToFolder(item.id, item.name)} className="flex items-center gap-3 text-left">
                                <Folder className="h-4 w-4 text-orange-400 fill-orange-400/20" />
                                <span className="text-xs font-bold text-slate-700 hover:text-primary transition-colors">{item.name}</span>
                              </button>
                            ) : (
                              <>
                                <FileText className="h-4 w-4 text-slate-400" />
                                <span className="text-xs font-medium text-slate-600 truncate max-w-xs">{item.name}</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5">
                          <Badge variant="outline" className="text-[9px] h-4 rounded-sm uppercase bg-white">
                            {item.type === 'folder' ? 'DIR' : (item.fileType?.split('/')[1] || 'FILE')}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2.5 text-[10px] text-slate-500">{item.type === 'folder' ? '--' : formatFileSize(item.fileSize)}</TableCell>
                        <TableCell className="py-2.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">
                            {item.uploadDate?.toDate ? format(item.uploadDate.toDate(), 'MMM dd, yy') : 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell className="py-2.5 text-right pr-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm opacity-0 group-hover:opacity-100"><MoreVertical className="h-3.5 w-3.5" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-sm w-40">
                              <DropdownMenuLabel className="text-[10px] font-bold uppercase text-slate-400">Manage Item</DropdownMenuLabel>
                              {item.type === 'folder' ? (
                                <DropdownMenuItem onClick={() => navigateToFolder(item.id, item.name)} className="text-xs gap-2"><ExternalLink className="h-3 w-3" /> Open</DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem asChild className="text-xs gap-2"><a href={item.fileUrl} target="_blank" rel="noreferrer"><Download className="h-3 w-3" /> Download</a></DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {canWrite && (
                                <>
                                  <DropdownMenuItem className="text-xs gap-2"><Move className="h-3 w-3" /> Move to...</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDelete(item.id, item.name)} className="text-xs gap-2 text-destructive"><Trash2 className="h-3 w-3" /> Delete</DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
