import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Equipment, OilType, useEquipmentStore } from '@/hooks/useEquipmentStore';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Fuel, Clock, Zap, Cylinder, CalendarDays, Droplets, ChevronRight, Check, ChevronsUpDown, Factory } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Props {
  equipment: Equipment;
  oilTypes: OilType[];
}

export function EquipmentCard({ equipment, oilTypes }: Props) {
  const navigate = useNavigate();
  const { updateEquipment, deleteEquipment, oilTypes: oilTypesQuery, addOilType, fuelTypes, componentManufacturers, componentModels, addComponentManufacturer, addComponentModel } = useEquipmentStore();
  const fuels = fuelTypes.data || [];
  const fuelLabels = fuels.reduce((acc, f) => { acc[f.slug] = f.name; return acc; }, {} as Record<string, string>);
  const allOilTypes = oilTypesQuery.data || oilTypes;
  const allManufacturers = (componentManufacturers.data || []).slice().sort((a, b) => a.name.localeCompare(b.name));
  const allModels = componentModels.data || [];
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [oilComboOpen, setOilComboOpen] = useState(false);
  const [oilSearch, setOilSearch] = useState('');
  const [mfrComboOpen, setMfrComboOpen] = useState(false);
  const [mfrSearch, setMfrSearch] = useState('');
  const [modelComboOpen, setModelComboOpen] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [quickEditOpen, setQuickEditOpen] = useState(false);
  const [quickHorimeter, setQuickHorimeter] = useState(equipment.total_horimeter);
  const [quickStarts, setQuickStarts] = useState(equipment.total_starts);
  const [editData, setEditData] = useState({
    name: equipment.name,
    serial_number: equipment.serial_number,
    total_horimeter: equipment.total_horimeter,
    total_starts: equipment.total_starts,
    cylinders: equipment.cylinders,
    fuel_type: equipment.fuel_type,
    installation_date: equipment.installation_date || '',
    oil_type_id: equipment.oil_type_id || '',
    manufacturer_id: equipment.manufacturer_id || '',
    model_id: equipment.model_id || '',
  });

  const oilName = oilTypes.find(o => o.id === equipment.oil_type_id)?.name;

  const handleEdit = async () => {
    try {
      const updates: any = { ...editData };
      if (!updates.oil_type_id) updates.oil_type_id = null;
      if (!updates.installation_date) updates.installation_date = null;
      if (!updates.manufacturer_id) updates.manufacturer_id = null;
      if (!updates.model_id) updates.model_id = null;
      await updateEquipment.mutateAsync({ id: equipment.id, updates });
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

  const handleQuickSave = async () => {
    try {
      const updates: any = { total_horimeter: quickHorimeter };
      if (equipment.equipment_type !== 'outro') updates.total_starts = quickStarts;
      await updateEquipment.mutateAsync({ id: equipment.id, updates });
      toast.success('Contadores atualizados!');
      setQuickEditOpen(false);
    } catch { toast.error('Erro ao atualizar'); }
  };

  return (
    <>
      <Card className="group hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/equipment/${equipment.id}`)}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-bold text-base">{equipment.name}</h3>
              <p className="text-xs text-muted-foreground">{equipment.serial_number || 'Sem S/N'}</p>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setEditOpen(true); }}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteOpen(true); }}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <ChevronRight className="h-4 w-4 text-muted-foreground self-center ml-1" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {equipment.has_horimeter && equipment.total_horimeter > 0 && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> <span>{equipment.total_horimeter}h</span>
              </div>
            )}
            {equipment.equipment_type !== 'outro' && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Zap className="h-3.5 w-3.5" /> <span>{equipment.total_starts} arranques</span>
              </div>
            )}
            {equipment.equipment_type !== 'outro' && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Cylinder className="h-3.5 w-3.5" /> <span>{equipment.cylinders} cilindros</span>
              </div>
            )}
            {equipment.equipment_type !== 'outro' && equipment.fuel_type && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Fuel className="h-3.5 w-3.5" /> <span>{fuelLabels[equipment.fuel_type] || equipment.fuel_type}</span>
              </div>
            )}
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
            {equipment.equipment_type === 'outro' && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Badge variant="secondary" className="text-[10px] h-5">Outro Ativo</Badge>
              </div>
            )}
          </div>

          {equipment.equipment_type !== 'outro' && (
            <div className="mt-3 pt-2 border-t">
              <Button
                size="sm"
                variant="outline"
                className="w-full h-7 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  setQuickHorimeter(equipment.total_horimeter);
                  setQuickStarts(equipment.total_starts);
                  setQuickEditOpen(true);
                }}
              >
                <Clock className="h-3 w-3 mr-1" />
                Atualizar Contadores
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Equipamento</DialogTitle>
            <DialogDescription>Atualize os dados principais do equipamento.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <div><Label>Nome</Label><Input value={editData.name} onChange={e => setEditData(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label>Número de Série</Label><Input value={editData.serial_number} onChange={e => setEditData(p => ({ ...p, serial_number: e.target.value }))} /></div>
            
            {/* Fabricante */}
            <div>
              <Label>Fabricante</Label>
              <Popover open={mfrComboOpen} onOpenChange={setMfrComboOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between">
                    {editData.manufacturer_id ? allManufacturers.find(m => m.id === editData.manufacturer_id)?.name || 'Selecione...' : 'Selecione...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Pesquisar ou criar..." value={mfrSearch} onValueChange={setMfrSearch} />
                    <CommandList>
                      <CommandEmpty>
                        {mfrSearch.trim() ? (
                          <Button variant="ghost" className="w-full justify-start text-sm" onClick={async () => {
                            try {
                              const newMfr = await addComponentManufacturer.mutateAsync(mfrSearch.trim());
                              setEditData(p => ({ ...p, manufacturer_id: newMfr.id, model_id: '' }));
                              setMfrSearch('');
                              setMfrComboOpen(false);
                            } catch { toast.error('Erro ao criar fabricante'); }
                          }}>+ Criar "{mfrSearch.trim()}"</Button>
                        ) : 'Nenhum fabricante encontrado.'}
                      </CommandEmpty>
                      <CommandGroup>
                        {allManufacturers.map(m => (
                          <CommandItem key={m.id} value={m.name} onSelect={() => {
                            setEditData(p => ({ ...p, manufacturer_id: m.id, model_id: '' }));
                            setMfrComboOpen(false);
                          }}>
                            <Check className={cn("mr-2 h-4 w-4", editData.manufacturer_id === m.id ? "opacity-100" : "opacity-0")} />
                            {m.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Modelo */}
            {editData.manufacturer_id && (
              <div>
                <Label>Modelo</Label>
                <Popover open={modelComboOpen} onOpenChange={setModelComboOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between">
                      {editData.model_id ? allModels.find(m => m.id === editData.model_id)?.name || 'Selecione...' : 'Selecione...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Pesquisar ou criar..." value={modelSearch} onValueChange={setModelSearch} />
                      <CommandList>
                        <CommandEmpty>
                          {modelSearch.trim() ? (
                            <Button variant="ghost" className="w-full justify-start text-sm" onClick={async () => {
                              try {
                                const newModel = await addComponentModel.mutateAsync({ manufacturer_id: editData.manufacturer_id, name: modelSearch.trim() });
                                setEditData(p => ({ ...p, model_id: newModel.id }));
                                setModelSearch('');
                                setModelComboOpen(false);
                              } catch { toast.error('Erro ao criar modelo'); }
                            }}>+ Criar "{modelSearch.trim()}"</Button>
                          ) : 'Nenhum modelo encontrado.'}
                        </CommandEmpty>
                        <CommandGroup>
                          {allModels.filter(m => m.manufacturer_id === editData.manufacturer_id).sort((a, b) => a.name.localeCompare(b.name)).map(m => (
                            <CommandItem key={m.id} value={m.name} onSelect={() => {
                              setEditData(p => ({ ...p, model_id: m.id }));
                              setModelComboOpen(false);
                            }}>
                              <Check className={cn("mr-2 h-4 w-4", editData.model_id === m.id ? "opacity-100" : "opacity-0")} />
                              {m.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <div><Label>Horímetro</Label><Input type="number" value={editData.total_horimeter} onChange={e => setEditData(p => ({ ...p, total_horimeter: Number(e.target.value) }))} /></div>
            {equipment.equipment_type !== 'outro' && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Arranques</Label><Input type="number" value={editData.total_starts} onChange={e => setEditData(p => ({ ...p, total_starts: Number(e.target.value) }))} /></div>
                <div><Label>Cilindros</Label><Input type="number" value={editData.cylinders} onChange={e => setEditData(p => ({ ...p, cylinders: Number(e.target.value) }))} /></div>
              </div>
            )}
            {equipment.equipment_type !== 'outro' && (
              <div>
                <Label>Combustível</Label>
                <Select value={editData.fuel_type} onValueChange={v => setEditData(p => ({ ...p, fuel_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="biogas">Biogás</SelectItem>
                    <SelectItem value="landfill_gas">Gás de Aterro</SelectItem>
                    <SelectItem value="natural_gas">Gás Natural</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div><Label>Data de Instalação</Label><Input type="date" value={editData.installation_date} onChange={e => setEditData(p => ({ ...p, installation_date: e.target.value }))} /></div>
            {equipment.equipment_type !== 'outro' && (
              <div>
                <Label>Tipo de Óleo</Label>
                <Popover open={oilComboOpen} onOpenChange={setOilComboOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={oilComboOpen} className="w-full justify-between">
                      {editData.oil_type_id ? allOilTypes.find(o => o.id === editData.oil_type_id)?.name || 'Selecione...' : 'Selecione...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Pesquisar ou criar..." value={oilSearch} onValueChange={setOilSearch} />
                      <CommandList>
                        <CommandEmpty>
                          {oilSearch.trim() ? (
                            <Button
                              variant="ghost"
                              className="w-full justify-start text-sm"
                              onClick={async () => {
                                try {
                                  const newOil = await addOilType.mutateAsync(oilSearch.trim());
                                  setEditData(p => ({ ...p, oil_type_id: newOil.id }));
                                  setOilSearch('');
                                  setOilComboOpen(false);
                                } catch { toast.error('Erro ao criar tipo de óleo'); }
                              }}
                            >
                              + Criar "{oilSearch.trim()}"
                            </Button>
                          ) : 'Nenhum tipo de óleo encontrado.'}
                        </CommandEmpty>
                        <CommandGroup>
                          {allOilTypes.map(o => (
                            <CommandItem
                              key={o.id}
                              value={o.name}
                              onSelect={() => {
                                setEditData(p => ({ ...p, oil_type_id: o.id }));
                                setOilComboOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", editData.oil_type_id === o.id ? "opacity-100" : "opacity-0")} />
                              {o.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}
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

      {/* Quick Edit Counters Dialog */}
      <Dialog open={quickEditOpen} onOpenChange={setQuickEditOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Atualizar Contadores</DialogTitle>
            <DialogDescription>Atualize rapidamente o horímetro{equipment.equipment_type !== 'outro' ? ' e arranques' : ''}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Horímetro</Label>
              <Input type="number" value={quickHorimeter} onChange={e => setQuickHorimeter(Number(e.target.value))} />
            </div>
            {equipment.equipment_type !== 'outro' && (
              <div>
                <Label>Arranques</Label>
                <Input type="number" value={quickStarts} onChange={e => setQuickStarts(Number(e.target.value))} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleQuickSave} disabled={updateEquipment.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
