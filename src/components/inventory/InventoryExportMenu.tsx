import { InventoryItemDisplay } from '@/hooks/useInventoryStore';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub,
  DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

type SortField = 'codigo' | 'codigo_alt_01' | 'codigo_alt_02' | 'part_number' | 'name' | 'aplicacao' | 'tipo' | 'gerador' | 'location_name';

const sortLabels: Record<SortField, string> = {
  codigo: 'Código',
  codigo_alt_01: 'Cód. Alt. 01',
  codigo_alt_02: 'Cód. Alt. 02',
  part_number: 'Part Number',
  name: 'Nome',
  aplicacao: 'Aplicação',
  tipo: 'Tipo',
  gerador: 'Gerador',
  location_name: 'Local',
};

function sortItems(items: InventoryItemDisplay[], field: SortField) {
  return [...items].sort((a, b) => {
    const va = (a[field] ?? '') as string;
    const vb = (b[field] ?? '') as string;
    return va.localeCompare(vb, 'pt-BR', { sensitivity: 'base' });
  });
}

function formatDate() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}

const headers = ['Código', 'Cód. Alt. 01', 'Cód. Alt. 02', 'Part Number', 'Nome', 'Aplicação', 'Tipo', 'Gerador', 'Qtd', 'Local'];

function toRows(items: InventoryItemDisplay[]) {
  return items.map(i => [
    i.codigo || '—', i.codigo_alt_01 || '—', i.codigo_alt_02 || '—', i.part_number, i.name, i.aplicacao, i.tipo, i.gerador || '—',
    i.quantity, i.location_name,
  ]);
}

function exportCSV(items: InventoryItemDisplay[]) {
  const rows = [headers, ...toRows(items)];
  const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  downloadBlob(csv, `estoque_atualizado_em_${formatDate()}.csv`, 'text/csv;charset=utf-8;');
}

function exportExcel(items: InventoryItemDisplay[]) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...toRows(items)]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Estoque');
  XLSX.writeFile(wb, `estoque_atualizado_em_${formatDate()}.xlsx`);
}

function exportPDF(items: InventoryItemDisplay[]) {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(16);
  doc.text('Estoque de Peças', 14, 18);
  doc.setFontSize(9);
  doc.text(`Atualizado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 24);

  autoTable(doc, {
    startY: 30,
    head: [headers],
    body: toRows(items),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [41, 65, 94] },
  });

  doc.save(`estoque_atualizado_em_${formatDate()}.pdf`);
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob(['\uFEFF' + content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type ExportFn = (items: InventoryItemDisplay[]) => void;

interface Props {
  items: InventoryItemDisplay[];
}

export function InventoryExportMenu({ items }: Props) {
  const buildSortMenu = (exportFn: ExportFn, label: string) => (
    <DropdownMenuSub key={label}>
      <DropdownMenuSubTrigger>{label}</DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuLabel className="text-xs text-muted-foreground">Ordenar por</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {(Object.entries(sortLabels) as [SortField, string][]).map(([field, fieldLabel]) => (
          <DropdownMenuItem key={field} onClick={() => exportFn(sortItems(items, field))}>
            {fieldLabel}
          </DropdownMenuItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {buildSortMenu(exportPDF, 'PDF')}
        {buildSortMenu(exportCSV, 'CSV')}
        {buildSortMenu(exportExcel, 'Excel')}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
