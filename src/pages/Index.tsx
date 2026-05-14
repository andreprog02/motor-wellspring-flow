import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useEquipmentStore } from '@/hooks/useEquipmentStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gauge, PlusCircle, Loader2 } from 'lucide-react';
import { EquipmentWizard } from '@/components/equipment/EquipmentWizard';
import { EquipmentCard } from '@/components/equipment/EquipmentCard';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

function getStatus(percent: number): 'ok' | 'warning' | 'critical' {
  if (percent >= 100) return 'critical';
  if (percent >= 85) return 'warning';
  return 'ok';
}

const Dashboard = () => {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardType, setWizardType] = useState<string>('gerador');
  const { equipments, oilTypes } = useEquipmentStore();

  const registeredEquipments = equipments.data || [];
  const oils = oilTypes.data || [];

  const generators = registeredEquipments.filter(eq => eq.equipment_type === 'gerador').sort((a, b) => a.name.localeCompare(b.name));
  const otherAssets = registeredEquipments.filter(eq => eq.equipment_type !== 'gerador').sort((a, b) => a.name.localeCompare(b.name));

  // Fetch maintenance plans to compute per-equipment status
  const plansQuery = useQuery({
    queryKey: ['component_maintenance_plans_dashboard'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('component_maintenance_plans').select('*');
      if (error) throw error;
      return data as any[];
    },
  });

  const equipmentStatusMap = useMemo(() => {
    if (!plansQuery.data || !registeredEquipments.length) return new Map<string, 'ok' | 'warning' | 'critical' | 'none'>();

    const map = new Map<string, 'ok' | 'warning' | 'critical' | 'none'>();

    registeredEquipments.forEach((eq) => {
      const eqPlans = plansQuery.data.filter((p: any) => p.equipment_id === eq.id);
      if (eqPlans.length === 0) {
        map.set(eq.id, 'none');
        return;
      }
      const current = eq.total_horimeter ?? 0;
      let hasCritical = false;
      let hasWarning = false;
      for (const p of eqPlans) {
        const last = p.last_execution_value ?? 0;
        const interval = p.interval_value ?? 1;
        const usage = current - last;
        const percent = Math.min(Math.round((usage / interval) * 100), 100);
        const status = getStatus(percent);
        if (status === 'critical') hasCritical = true;
        if (status === 'warning') hasWarning = true;
      }
      if (hasCritical) map.set(eq.id, 'critical');
      else if (hasWarning) map.set(eq.id, 'warning');
      else map.set(eq.id, 'ok');
    });

    return map;
  }, [plansQuery.data, registeredEquipments]);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard do Ativo</h1>
          <p className="text-sm text-muted-foreground mt-1">Visão geral dos equipamentos e alertas de manutenção</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-industrial/10 flex items-center justify-center">
                <Gauge className="h-5 w-5 text-industrial" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Geradores</p>
                <p className="text-2xl font-bold">{generators.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-industrial/10 flex items-center justify-center">
                <Gauge className="h-5 w-5 text-industrial" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Outros Equipamentos</p>
                <p className="text-2xl font-bold">{otherAssets.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button onClick={() => { setWizardType('gerador'); setWizardOpen(true); }}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Cadastrar Gerador
          </Button>
          <Button variant="outline" onClick={() => { setWizardType('outro'); setWizardOpen(true); }}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Cadastrar Equipamento
          </Button>
        </div>

        {equipments.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : registeredEquipments.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <p>Nenhum equipamento cadastrado ainda.</p>
              <p className="text-xs mt-1">Clique em "Cadastrar Equipamento" para começar.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Geradores */}
            {generators.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3">Geradores</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {generators.map(eq => (
                    <EquipmentCard key={eq.id} equipment={eq} oilTypes={oils} maintenanceStatus={equipmentStatusMap.get(eq.id) || 'none'} />
                  ))}
                </div>
              </div>
            )}

            {/* Outros Equipamentos */}
            {otherAssets.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3">Outros Equipamentos</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {otherAssets.map(eq => (
                    <EquipmentCard key={eq.id} equipment={eq} oilTypes={oils} maintenanceStatus={equipmentStatusMap.get(eq.id) || 'none'} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <EquipmentWizard open={wizardOpen} onOpenChange={setWizardOpen} initialType={wizardType} />
    </AppLayout>
  );
};

export default Dashboard;
