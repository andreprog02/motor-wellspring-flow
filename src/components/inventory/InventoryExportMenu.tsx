import { useState } from 'react';
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

type SortField = 'part_number' | 'name' | 'category' | 'manufacturer_name' | 'model_name' | 'location_name';

const sortLabels: Record<SortField, string> = {
  part_number: 'Part Number',
  name: 'Peça',
  category: 'Categoria',
  manufacturer_name: 'Fabricante',
  model_name: 'Modelo',
  location_name: 'Local',
};

function sortItems(items: InventoryItemDisplay[], field: SortField) {
  return [...items].sort((a, b) => {
    const va = (a[field] ?? '') as string;
    const vb = (b[field] ?? '') as string;
    return va.localeCompare(vb, 'pt-BR', { sensitivity: 'base' });
  });
}

const headers = ['Peça', 'Categoria', 'Fabricante', 'Modelo', 'Part Number', 'Quantidade', 'Estoque Mín.', 'Local'];

function toRows(items: InventoryItemDisplay[]) {
  return items.map(i => [
    i.name, i.category, i.manufacturer_name, i.model_name ?? '—',
    i.part_number, i.quantity, i.min_stock, i.location_name,
  ]);
}

function exportCSV(items: InventoryItemDisplay[]) {
  const rows = [headers, ...toRows(items)];
  const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  downloadBlob(csv, 'estoque.csv', 'text/csv;charset=utf-8;');
}

function exportExcel(items: InventoryItemDisplay[]) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...toRows(items)]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Estoque');
  XLSX.writeFile(wb, 'estoque.xlsx');
}

function exportPDF(items: InventoryItemDisplay[]) {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(16);
  doc.text('Estoque de Peças', 14, 18);
  doc.setFontSize(9);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 24);

  autoTable(doc, {
    startY: 30,
    head: [headers],
    body: toRows(items),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [41, 65, 94] },
  });

  doc.save('estoque.pdf');
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
