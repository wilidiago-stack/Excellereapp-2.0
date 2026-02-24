'use client';

import { useState } from 'react';
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
  deleteDoc 
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
  ShieldAlert
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
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function DocumentsPage() {
  const { selectedProjectId } = useProjectContext();
  const firestore = useFirestore();
  const storage = useStorage();
  const { user, role } = useAuth();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Ingeniería de permisos alineada con storage.rules
  const isAdmin = role === 'admin';
  const isPM = role === 'project_manager';
  const canWrite = isAdmin || isPM;

  const projectsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'projects') : null),
    [firestore]
  );
  const { data: projects } = useCollection(projectsCollection);
  const activeProject = projects?.find(p => p.id === selectedProjectId);

  const docsCollection = useMemoFirebase(() => {
    if (!firestore || !selectedProjectId) return null;
    return collection(firestore, 'projects', selectedProjectId, 'documents');
  }, [firestore, selectedProjectId]);

  const { data: documents, isLoading } = useCollection(docsCollection);

  const filteredDocs = documents?.filter(d => 
    d.name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedProjectId || !user || !storage || !firestore) return;

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
        uploadedById: user.uid,
        uploadedByName: user.displayName || user.email,
        uploadDate: serverTimestamp(),
        projectId: selectedProjectId,
      };

      await addDoc(docsCollection!, docData);

      toast({ title: 'Document Uploaded', description: `${selectedFile.name} added.` });
      setUploadDialogOpen(false);
      setSelectedFile(null);
    } catch (error: any) {
      console.error('Upload failed:', error);
      toast({ 
        variant: 'destructive', 
        title: 'Upload Rejected', 
        description: 'Server denied write access. Please refresh your session.' 
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId: string, fileName: string) => {
    if (!firestore || !selectedProjectId || !canWrite) return;
    
    const docRef = doc(firestore, 'projects', selectedProjectId, 'documents', docId);
    deleteDoc(docRef)
      .then(() => {
        toast({ title: 'Removed', description: `${fileName} deleted.` });
      })
      .catch((error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        }));
      });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
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
            <span>Central Blueprint Repository.</span>
            {selectedProjectId && (
              <Badge variant="secondary" className="h-4 rounded-sm text-[9px] bg-[#46a395]/10 text-[#46a395] font-black uppercase">
                {activeProject?.name || 'Project Filter Active'}
              </Badge>
            )}
          </div>
        </div>
        
        {canWrite ? (
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 rounded-sm gap-2" disabled={!selectedProjectId}>
                <Upload className="h-3.5 w-3.5" /> Upload File
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-sm">
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid w-full items-center gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Select File</label>
                  <Input 
                    type="file" 
                    onChange={handleFileChange} 
                    className="h-10 border-slate-200 text-xs pt-2"
                  />
                </div>
                {selectedFile && (
                  <div className="p-3 bg-slate-50 rounded-sm border border-slate-100 flex items-center gap-3">
                    <FileCheck className="h-5 w-5 text-[#46a395]" />
                    <div>
                      <p className="text-xs font-bold text-slate-700">{selectedFile.name}</p>
                      <p className="text-[10px] text-slate-400">{formatFileSize(selectedFile.size)}</p>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
                <Button 
                  size="sm" 
                  onClick={handleUpload} 
                  disabled={!selectedFile || isUploading}
                  className="gap-2"
                >
                  {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  Confirm Upload
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-sm text-slate-500">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-tight">Read Only (Viewer)</span>
          </div>
        )}
      </div>

      {!selectedProjectId ? (
        <Card className="border-dashed py-20 flex flex-col items-center justify-center text-center bg-slate-50/20">
          <Files className="h-12 w-12 text-slate-200 mb-4" />
          <h2 className="text-sm font-bold text-slate-600">Select a project context</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">Use the Dashboard project filter to browse documents.</p>
        </Card>
      ) : (
        <div className="flex flex-col md:flex-row gap-2 flex-1 min-h-0">
          <Card className="w-full md:w-72 shrink-0 rounded-sm border-slate-200 shadow-sm flex flex-col">
            <CardHeader className="p-4 border-b bg-slate-50/50">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input 
                  placeholder="Filter files..." 
                  className="pl-8 h-9 bg-white border-slate-200 text-xs" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-4 flex-1 overflow-y-auto no-scrollbar space-y-6">
              <div className="p-3 rounded-sm border border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium">Visible Assets</span>
                </div>
                <span className="text-xs font-bold">{filteredDocs.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="flex-1 overflow-hidden flex flex-col rounded-sm border-slate-200 shadow-sm">
            <div className="flex-1 overflow-y-auto no-scrollbar">
              <Table>
                <TableHeader className="bg-slate-50/50 sticky top-0 z-10">
                  <TableRow className="hover:bg-transparent border-b-slate-200">
                    <TableHead className="text-[11px] font-bold h-10 px-6">File Reference</TableHead>
                    <TableHead className="text-[11px] font-bold h-10">Type</TableHead>
                    <TableHead className="text-[11px] font-bold h-10">Size</TableHead>
                    <TableHead className="text-[11px] font-bold h-10">Sync Date</TableHead>
                    <TableHead className="h-10 w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [1, 2].map(i => <TableRow key={i}><TableCell colSpan={5}><Loader2 className="h-4 w-4 animate-spin mx-auto text-slate-200" /></TableCell></TableRow>)
                  ) : filteredDocs.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="h-32 text-center text-xs text-slate-400">No blueprints available.</TableCell></TableRow>
                  ) : (
                    filteredDocs.map((doc: any) => (
                      <TableRow key={doc.id} className="hover:bg-slate-50/50 border-b-slate-100 group">
                        <TableCell className="py-2.5 px-6">
                          <div className="flex items-center gap-2">
                            <FileText className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-xs font-bold text-slate-700 truncate max-w-xs">{doc.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5">
                          <Badge variant="outline" className="text-[9px] h-4 rounded-sm uppercase bg-white">
                            {doc.fileType?.split('/')[1] || 'DATA'}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2.5 text-xs text-slate-500">{formatFileSize(doc.fileSize)}</TableCell>
                        <TableCell className="py-2.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">
                            {doc.uploadDate?.toDate ? format(doc.uploadDate.toDate(), 'MMM dd, yy') : 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell className="py-2.5 text-right pr-6">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm" asChild>
                              <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"><Download className="h-3.5 w-3.5" /></a>
                            </Button>
                            {canWrite && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 rounded-sm text-destructive hover:bg-destructive/10"
                                onClick={() => handleDelete(doc.id, doc.name)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
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