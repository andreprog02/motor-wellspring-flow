import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useEquipmentStore } from '@/hooks/useEquipmentStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gauge, PlusCircle, Loader2 } from 'lucide-react';
import { EquipmentWizard } from '@/components/equipment/EquipmentWizard';
import { EquipmentCard } from '@/components/equipment/EquipmentCard';

const Dashboard = () => {
  const [wizardOpen, setWizardOpen] = useState(false);
  const { equipments, oilTypes } = useEquipmentStore();

  const registeredEquipments = equipments.data || [];
  const oils = oilTypes.data || [];

  const generators = registeredEquipments.filter(eq => eq.equipment_type === 'gerador');
  const otherAssets = registeredEquipments.filter(eq => eq.equipment_type !== 'gerador');

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

        <div className="flex items-center justify-end">
          <Button onClick={() => setWizardOpen(true)}>
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
                    <EquipmentCard key={eq.id} equipment={eq} oilTypes={oils} />
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
                    <EquipmentCard key={eq.id} equipment={eq} oilTypes={oils} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <EquipmentWizard open={wizardOpen} onOpenChange={setWizardOpen} />
    </AppLayout>
  );
};

export default Dashboard;
