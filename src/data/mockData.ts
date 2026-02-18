import { Motor, MaintenancePlan, MaintenanceLog, ComponentPosition, InventoryItem } from '@/types/models';

export const motors: Motor[] = [
  {
    id: '1',
    name: 'Motor Gerador A1',
    serialNumber: 'MGA-2024-001',
    brand: 'Caterpillar',
    model: 'C32 ACERT',
    location: 'Planta Norte - Sala 1',
    totalHorimeter: 12450,
    totalStarts: 3200,
    cylinders: 12,
    turbos: 2,
    status: 'ok',
  },
  {
    id: '2',
    name: 'Motor Bombeamento B3',
    serialNumber: 'MBB-2023-014',
    brand: 'Cummins',
    model: 'QSK60',
    location: 'Planta Sul - Estação 3',
    totalHorimeter: 8720,
    totalStarts: 1850,
    cylinders: 16,
    turbos: 4,
    status: 'warning',
  },
  {
    id: '3',
    name: 'Motor Compressor C2',
    serialNumber: 'MCC-2022-007',
    brand: 'Wärtsilä',
    model: 'W34SG',
    location: 'Planta Leste - Bloco 2',
    totalHorimeter: 22100,
    totalStarts: 5400,
    cylinders: 8,
    turbos: 1,
    status: 'critical',
  },
  {
    id: '4',
    name: 'Motor Gerador D1',
    serialNumber: 'MGD-2024-003',
    brand: 'MAN Energy',
    model: '51/60DF',
    location: 'Planta Norte - Sala 2',
    totalHorimeter: 4300,
    totalStarts: 980,
    cylinders: 18,
    turbos: 2,
    status: 'ok',
  },
  {
    id: '5',
    name: 'Motor Auxiliar E2',
    serialNumber: 'MAE-2023-019',
    brand: 'MTU',
    model: 'Series 4000',
    location: 'Planta Oeste - Área 5',
    totalHorimeter: 15600,
    totalStarts: 4100,
    cylinders: 20,
    turbos: 4,
    status: 'warning',
  },
];

export const componentPositions: ComponentPosition[] = [
  { id: 'cp1', motorId: '1', groupId: 'g1', groupName: 'Sistema de Óleo', name: 'Filtro de Óleo Principal', installedPartName: 'Filtro CAT 1R-0751', installDate: '2024-06-15', horimeterAtInstall: 12000, currentHorimeter: 12450 },
  { id: 'cp2', motorId: '1', groupId: 'g1', groupName: 'Sistema de Óleo', name: 'Filtro de Óleo Secundário', installedPartName: 'Filtro CAT 1R-0749', installDate: '2024-05-10', horimeterAtInstall: 11800, currentHorimeter: 12450 },
  { id: 'cp3', motorId: '1', groupId: 'g2', groupName: 'Sistema de Combustível', name: 'Filtro de Combustível', installedPartName: 'Filtro CAT 1R-0753', installDate: '2024-07-01', horimeterAtInstall: 12200, currentHorimeter: 12450 },
  { id: 'cp4', motorId: '1', groupId: 'g3', groupName: 'Cabeçotes', name: 'Cabeçote Cilindro 1', installedPartName: 'Cabeçote OEM C32', installDate: '2023-01-15', horimeterAtInstall: 5000, currentHorimeter: 12450 },
  { id: 'cp5', motorId: '1', groupId: 'g4', groupName: 'Turbocompressores', name: 'Turbo Esquerdo', installedPartName: 'Turbo BorgWarner S400', installDate: '2024-01-20', horimeterAtInstall: 10000, currentHorimeter: 12450 },
  { id: 'cp6', motorId: '2', groupId: 'g1', groupName: 'Sistema de Óleo', name: 'Filtro de Óleo Principal', installedPartName: 'Filtro Cummins LF9009', installDate: '2024-03-01', horimeterAtInstall: 7500, currentHorimeter: 8720 },
  { id: 'cp7', motorId: '3', groupId: 'g1', groupName: 'Sistema de Óleo', name: 'Filtro de Óleo', installedPartName: 'Filtro Wärtsilä OEM', installDate: '2023-06-01', horimeterAtInstall: 18000, currentHorimeter: 22100 },
];

export const maintenancePlans: MaintenancePlan[] = [
  { id: 'mp1', componentPositionId: 'cp1', componentName: 'Filtro de Óleo Principal', task: 'Substituição do filtro de óleo', triggerType: 'hours', interval: 500, lastExecutionValue: 12000, currentValue: 12450 },
  { id: 'mp2', componentPositionId: 'cp2', componentName: 'Filtro de Óleo Secundário', task: 'Substituição do filtro secundário', triggerType: 'hours', interval: 500, lastExecutionValue: 11800, currentValue: 12450 },
  { id: 'mp3', componentPositionId: 'cp3', componentName: 'Filtro de Combustível', task: 'Substituição do filtro de combustível', triggerType: 'hours', interval: 1000, lastExecutionValue: 12200, currentValue: 12450 },
  { id: 'mp4', componentPositionId: 'cp4', componentName: 'Cabeçote Cilindro 1', task: 'Revisão completa do cabeçote', triggerType: 'hours', interval: 8000, lastExecutionValue: 5000, currentValue: 12450 },
  { id: 'mp5', componentPositionId: 'cp5', componentName: 'Turbo Esquerdo', task: 'Inspeção e balanceamento', triggerType: 'hours', interval: 4000, lastExecutionValue: 10000, currentValue: 12450 },
  { id: 'mp6', componentPositionId: 'cp6', componentName: 'Filtro de Óleo Principal', task: 'Substituição do filtro', triggerType: 'hours', interval: 500, lastExecutionValue: 7500, currentValue: 8720 },
  { id: 'mp7', componentPositionId: 'cp7', componentName: 'Filtro de Óleo', task: 'Substituição do filtro', triggerType: 'hours', interval: 500, lastExecutionValue: 18000, currentValue: 22100 },
];

export const maintenanceLogs: MaintenanceLog[] = [
  { id: 'ml1', motorId: '1', date: '2024-06-15', componentName: 'Filtro de Óleo Principal', serviceType: 'replacement', horimeter: 12000, partUsed: 'Filtro CAT 1R-0751', quantity: 1, technician: 'Carlos Silva', notes: 'Troca preventiva realizada dentro do prazo.' },
  { id: 'ml2', motorId: '1', date: '2024-05-10', componentName: 'Filtro de Óleo Secundário', serviceType: 'replacement', horimeter: 11800, partUsed: 'Filtro CAT 1R-0749', quantity: 1, technician: 'Pedro Santos', notes: 'Filtro apresentava leve saturação.' },
  { id: 'ml3', motorId: '1', date: '2024-07-01', componentName: 'Filtro de Combustível', serviceType: 'replacement', horimeter: 12200, partUsed: 'Filtro CAT 1R-0753', quantity: 1, technician: 'Carlos Silva', notes: 'Troca programada.' },
  { id: 'ml4', motorId: '2', date: '2024-03-01', componentName: 'Filtro de Óleo Principal', serviceType: 'replacement', horimeter: 7500, partUsed: 'Filtro Cummins LF9009', quantity: 1, technician: 'Ana Costa', notes: 'Manutenção preventiva padrão.' },
  { id: 'ml5', motorId: '3', date: '2023-06-01', componentName: 'Filtro de Óleo', serviceType: 'replacement', horimeter: 18000, partUsed: 'Filtro Wärtsilä OEM', quantity: 1, technician: 'Roberto Lima', notes: 'Substituição emergencial por vazamento detectado.' },
];

export const inventoryItems: InventoryItem[] = [
  { id: 'inv1', name: 'Filtro de Óleo CAT 1R-0751', manufacturer: 'Caterpillar', partNumber: '1R-0751', estimatedLife: 500, quantity: 12, location: 'Almoxarifado Central', minStock: 5 },
  { id: 'inv2', name: 'Filtro de Óleo CAT 1R-0749', manufacturer: 'Caterpillar', partNumber: '1R-0749', estimatedLife: 500, quantity: 8, location: 'Almoxarifado Central', minStock: 3 },
  { id: 'inv3', name: 'Filtro Combustível CAT 1R-0753', manufacturer: 'Caterpillar', partNumber: '1R-0753', estimatedLife: 1000, quantity: 6, location: 'Almoxarifado Central', minStock: 3 },
  { id: 'inv4', name: 'Filtro Cummins LF9009', manufacturer: 'Cummins', partNumber: 'LF9009', estimatedLife: 500, quantity: 2, location: 'Almoxarifado Sul', minStock: 4 },
  { id: 'inv5', name: 'Turbo BorgWarner S400', manufacturer: 'BorgWarner', partNumber: 'S400SX-71', estimatedLife: 15000, quantity: 1, location: 'Almoxarifado Central', minStock: 1 },
  { id: 'inv6', name: 'Cabeçote OEM C32', manufacturer: 'Caterpillar', partNumber: 'C32-HEAD-01', estimatedLife: 20000, quantity: 2, location: 'Almoxarifado Central', minStock: 1 },
];

export function getMotorHealthScore(motorId: string): number {
  const plans = maintenancePlans.filter(p => {
    const cp = componentPositions.find(c => c.id === p.componentPositionId);
    return cp?.motorId === motorId;
  });
  if (plans.length === 0) return 100;
  const scores = plans.map(p => {
    const usage = p.currentValue - p.lastExecutionValue;
    const ratio = usage / p.interval;
    if (ratio >= 1) return 0;
    return Math.round((1 - ratio) * 100);
  });
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}
