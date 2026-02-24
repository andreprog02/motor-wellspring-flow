import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Equipment, OilType, useEquipmentStore } from '@/hooks/useEquipmentStore';
import { toast } from 'sonner';
import { Pencil, Trash2, Fuel, Clock, Zap, Cylinder, CalendarDays, Droplets } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  equipment: Equipment;
  oilTypes: OilType[];
}

const fuelLabels: Record<string, string> = { biogas: 'Biogás', landfill_gas: 'Gás de Aterro', natural_gas: 'Gás Natural' };

export function EquipmentCard({ equipment, oilTypes }: Props) {
  const { updateEquipment, deleteEquipment } = useEquipmentStore();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [editData, setEditData] = useState({
    name: equipment.name,
    serial_number: equipment.serial_number,
    total_horimeter: equipment.total_horimeter,
    total_starts: equipment.total_starts,
  });

  const oilName = oilTypes.find(o => o.id === equipment.oil_type_id)?.name;

  const handleEdit = async () => {
    try {
      await updateEquipment.mutateAsync({ id: equipment.id, updates: editData });
      toast.success('Equipamento atualizado!');
      setEditOpen(false);
    } catch { toast.error('Erro ao atualizar'); }
  };

  const handleDelete = async () => {
    if (deletePassword !== '1234') {
      toast.error('Senha incorreta');
      return;
    }
    try {
      await deleteEquipment.mutateAsync(equipment.id);
      toast.success('Equipamento excluído!');
      setDeleteOpen(false);
    } catch { toast.error('Erro ao excluir'); }
  };

  return (
    <>
      <Card className="group hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-bold text-base">{equipment.name}</h3>
              <p className="text-xs text-muted-foreground">{equipment.serial_number || 'Sem S/N'}</p>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditOpen(true)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> <span>{equipment.total_horimeter}h</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Zap className="h-3.5 w-3.5" /> <span>{equipment.total_starts} arranques</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Cylinder className="h-3.5 w-3.5" /> <span>{equipment.cylinders} cilindros</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Fuel className="h-3.5 w-3.5" /> <span>{fuelLabels[equipment.fuel_type] || equipment.fuel_type}</span>
            </div>
            {equipment.installation_date && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" /> <span>{format(new Date(equipment.installation_date), 'dd/MM/yyyy')}</span>
              </div>
            )}
            {oilName && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Droplets className="h-3.5 w-3.5" /> <span>{oilName}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Equipamento</DialogTitle>
            <DialogDescription>Atualize os dados principais do equipamento.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={editData.name} onChange={e => setEditData(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label>Número de Série</Label><Input value={editData.serial_number} onChange={e => setEditData(p => ({ ...p, serial_number: e.target.value }))} /></div>
            <div><Label>Horímetro</Label><Input type="number" value={editData.total_horimeter} onChange={e => setEditData(p => ({ ...p, total_horimeter: Number(e.target.value) }))} /></div>
            <div><Label>Arranques</Label><Input type="number" value={editData.total_starts} onChange={e => setEditData(p => ({ ...p, total_starts: Number(e.target.value) }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={updateEquipment.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{equipment.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. Todos os componentes e planos de manutenção serão excluídos. Digite a senha para confirmar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input type="password" placeholder="Senha de exclusão" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletePassword('')}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
