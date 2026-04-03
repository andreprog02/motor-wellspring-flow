import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Upload, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useTenantId } from '@/hooks/useTenantId';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Tables in dependency order (parents first)
const TABLES_ORDERED = [
  'locations',
  'oil_types',
  'manufacturers',
  'manufacturer_models',
  'component_manufacturers',
  'component_models',
  'maintenance_plan_templates',
  'maintenance_plan_template_tasks',
  'maintenance_descriptions',
  'equipments',
  'equipment_sub_components',
  'cylinder_components',
  'component_maintenance_plans',
  'inventory_items',
  'maintenance_logs',
  'maintenance_log_items',
  'cylinder_heads',
  'cylinder_head_installations',
  'cylinder_head_maintenances',
  'cylinder_head_components',
  'oil_analyses',
  'turbos',
  'turbo_installations',
  'turbo_maintenances',
  'turbo_components',
] as const;

function formatDate() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}_${String(d.getHours()).padStart(2, '0')}h${String(d.getMinutes()).padStart(2, '0')}`;
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BackupDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const tenantId = useTenantId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const handleExportJSON = async () => {
    setExporting(true);
    try {
      const backup: Record<string, any[]> = {};
      for (const table of TABLES_ORDERED) {
        const { data, error } = await (supabase as any).from(table).select('*');
        if (error) throw new Error(`Erro ao exportar ${table}: ${error.message}`);
        backup[table] = data ?? [];
      }
      const json = JSON.stringify({ version: 1, exported_at: new Date().toISOString(), tables: backup }, null, 2);
      downloadBlob(json, `hubengine_backup_${formatDate()}.json`, 'application/json');
      toast({ title: 'Backup exportado com sucesso!' });
    } catch (e: any) {
      toast({ title: 'Erro ao exportar', description: e.message, variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const sections: string[] = [];
      for (const table of TABLES_ORDERED) {
        const { data, error } = await (supabase as any).from(table).select('*');
        if (error) throw new Error(`Erro ao exportar ${table}: ${error.message}`);
        const rows = data ?? [];
        if (rows.length === 0) {
          sections.push(`##TABLE:${table}\n(vazio)`);
          continue;
        }
        const headers = Object.keys(rows[0]);
        const csvRows = [headers.join(','), ...rows.map((r: any) => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))];
        sections.push(`##TABLE:${table}\n${csvRows.join('\n')}`);
      }
      const csv = sections.join('\n\n');
      downloadBlob(csv, `motorguard_backup_${formatDate()}.csv`, 'text/csv;charset=utf-8;');
      toast({ title: 'Backup CSV exportado com sucesso!' });
    } catch (e: any) {
      toast({ title: 'Erro ao exportar', description: e.message, variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setConfirmRestore(true);
    e.target.value = '';
  };

  const handleRestore = async () => {
    if (!pendingFile) return;
    setConfirmRestore(false);
    setImporting(true);

    try {
      const text = await pendingFile.text();
      let backup: Record<string, any[]>;

      if (pendingFile.name.endsWith('.json')) {
        const parsed = JSON.parse(text);
        backup = parsed.tables ?? parsed;
      } else if (pendingFile.name.endsWith('.csv')) {
        backup = parseCSVBackup(text);
      } else {
        throw new Error('Formato não suportado. Use .json ou .csv');
      }

      // Delete in reverse order (children first)
      const reverseOrder = [...TABLES_ORDERED].reverse();
      for (const table of reverseOrder) {
        if (backup[table]) {
          const { error } = await (supabase as any).from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
          if (error) console.warn(`Aviso ao limpar ${table}:`, error.message);
        }
      }

      // Insert in order (parents first), injecting tenant_id
      const SKIP_TENANT = ['tenants', 'profiles'];
      for (const table of TABLES_ORDERED) {
        const rows = backup[table];
        if (!rows || rows.length === 0) continue;
        // Inject tenant_id for tables that support it
        const enrichedRows = rows.map((row: any) => {
          if (!SKIP_TENANT.includes(table) && tenantId) {
            return { ...row, tenant_id: tenantId };
          }
          return row;
        });
        // Insert in batches of 500
        for (let i = 0; i < enrichedRows.length; i += 500) {
          const batch = enrichedRows.slice(i, i + 500);
          const { error } = await (supabase as any).from(table).insert(batch);
          if (error) throw new Error(`Erro ao restaurar ${table}: ${error.message}`);
        }
      }

      qc.invalidateQueries();
      toast({ title: 'Backup restaurado com sucesso!' });
    } catch (e: any) {
      toast({ title: 'Erro ao restaurar', description: e.message, variant: 'destructive' });
    } finally {
      setImporting(false);
      setPendingFile(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Backup & Restauração</DialogTitle>
            <DialogDescription>
              Exporte todos os dados do sistema ou restaure a partir de um arquivo de backup.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Exportar Backup</h3>
              <p className="text-xs text-muted-foreground">
                Gera um arquivo com todos os dados: ativos, estoque, ferramentas, manutenções, históricos, cabeçotes, turbos e configurações.
              </p>
              <div className="flex gap-2">
                <Button onClick={handleExportJSON} disabled={exporting} className="flex-1">
                  {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                  JSON (recomendado)
                </Button>
                <Button onClick={handleExportCSV} disabled={exporting} variant="outline" className="flex-1">
                  {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                  CSV
                </Button>
              </div>
            </div>

            <div className="border-t border-border" />

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Restaurar Backup</h3>
              <p className="text-xs text-muted-foreground">
                Importa e substitui todos os dados atuais pelo conteúdo do arquivo. Use JSON para restauração completa.
              </p>
              <input ref={fileInputRef} type="file" accept=".json,.csv" className="hidden" onChange={handleFileSelect} />
              <Button onClick={() => fileInputRef.current?.click()} disabled={importing} variant="outline" className="w-full">
                {importing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                {importing ? 'Restaurando...' : 'Selecionar arquivo (.json ou .csv)'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmRestore} onOpenChange={setConfirmRestore}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmar restauração
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá <strong>substituir todos os dados atuais</strong> pelo conteúdo do arquivo{' '}
              <strong>{pendingFile?.name}</strong>. Esta operação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingFile(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function parseCSVBackup(text: string): Record<string, any[]> {
  const result: Record<string, any[]> = {};
  const sections = text.split(/\n##TABLE:/);

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    let tableName: string;
    let content: string;

    if (trimmed.startsWith('##TABLE:')) {
      const rest = trimmed.slice('##TABLE:'.length);
      const nlIdx = rest.indexOf('\n');
      tableName = rest.slice(0, nlIdx).trim();
      content = rest.slice(nlIdx + 1).trim();
    } else {
      const nlIdx = trimmed.indexOf('\n');
      tableName = trimmed.slice(0, nlIdx).trim();
      content = trimmed.slice(nlIdx + 1).trim();
    }

    if (content === '(vazio)' || !content) {
      result[tableName] = [];
      continue;
    }

    const lines = content.split('\n').filter(l => l.trim());
    if (lines.length < 2) { result[tableName] = []; continue; }

    const headers = lines[0].split(',').map(h => h.trim());
    const rows: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const row: any = {};
      headers.forEach((h, idx) => {
        let val: any = values[idx] ?? '';
        if (val === '' || val === 'null') val = null;
        else if (val === 'true') val = true;
        else if (val === 'false') val = false;
        else if (/^\d+$/.test(val)) val = parseInt(val, 10);
        else if (/^\d+\.\d+$/.test(val)) val = parseFloat(val);
        row[h] = val;
      });
      rows.push(row);
    }
    result[tableName] = rows;
  }

  return result;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { result.push(current); current = ''; }
      else current += ch;
    }
  }
  result.push(current);
  return result;
}
