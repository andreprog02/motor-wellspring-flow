import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTenantId } from '@/hooks/useTenantId';
import { toast } from 'sonner';
import { Upload, FileText, Trash2, Download, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipmentId: string;
  equipmentName: string;
}

export function EquipmentDocumentsDialog({ open, onOpenChange, equipmentId, equipmentName }: Props) {
  const qc = useQueryClient();
  const tenantId = useTenantId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const docs = useQuery({
    queryKey: ['equipment_documents', equipmentId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('equipment_documents')
        .select('*')
        .eq('equipment_id', equipmentId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Array<{
        id: string;
        name: string;
        file_path: string;
        file_size: number;
        mime_type: string;
        created_at: string;
      }>;
    },
    enabled: open,
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const safeName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = `${tenantId}/${equipmentId}/${Date.now()}_${safeName}`;
        const { error: uploadErr } = await supabase.storage
          .from('equipment-documents')
          .upload(filePath, file);
        if (uploadErr) throw uploadErr;

        const { error: dbErr } = await (supabase as any)
          .from('equipment_documents')
          .insert({
            equipment_id: equipmentId,
            name: file.name,
            file_path: filePath,
            file_size: file.size,
            mime_type: file.type || 'application/octet-stream',
            tenant_id: tenantId,
          });
        if (dbErr) throw dbErr;
      }
      toast.success('Documento(s) enviado(s) com sucesso');
      qc.invalidateQueries({ queryKey: ['equipment_documents', equipmentId] });
    } catch (err: any) {
      toast.error(`Erro ao enviar: ${err.message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (doc: { id: string; file_path: string; name: string }) => {
    try {
      await supabase.storage.from('equipment-documents').remove([doc.file_path]);
      const { error } = await (supabase as any)
        .from('equipment_documents')
        .delete()
        .eq('id', doc.id);
      if (error) throw error;
      toast.success(`"${doc.name}" removido`);
      qc.invalidateQueries({ queryKey: ['equipment_documents', equipmentId] });
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  const handleDownload = (doc: { file_path: string; name: string }) => {
    const { data } = supabase.storage.from('equipment-documents').getPublicUrl(doc.file_path);
    const a = document.createElement('a');
    a.href = data.publicUrl;
    a.download = doc.name;
    a.target = '_blank';
    a.click();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const documents = docs.data || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Documentação — {equipmentName}</DialogTitle>
          <DialogDescription>Manuais e documentos do equipamento.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt"
              className="hidden"
              onChange={handleUpload}
            />
            <Button
              variant="outline"
              className="w-full"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</>
              ) : (
                <><Upload className="h-4 w-4 mr-2" /> Enviar Documento</>
              )}
            </Button>
          </div>

          <div className="max-h-[50vh] overflow-y-auto space-y-2">
            {documents.length === 0 && !docs.isLoading && (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum documento cadastrado.</p>
            )}
            {documents.map(doc => (
              <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatSize(doc.file_size)} • {format(new Date(doc.created_at), 'dd/MM/yyyy')}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDownload(doc)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(doc)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
