export type MaintenanceStatus = 'ok' | 'warning' | 'critical';

export interface Motor {
  id: string;
  name: string;
  serialNumber: string;
  brand: string;
  model: string;
  location: string;
  totalHorimeter: number;
  totalStarts: number;
  cylinders: number;
  turbos: number;
  status: MaintenanceStatus;
  imageUrl?: string;
}

export interface ComponentGroup {
  id: string;
  name: string;
  icon: string;
}

export interface ComponentPosition {
  id: string;
  motorId: string;
  groupId: string;
  groupName: string;
  name: string;
  installedPartName: string;
  installDate: string;
  horimeterAtInstall: number;
  currentHorimeter: number;
}

export interface MaintenancePlan {
  id: string;
  componentPositionId: string;
  componentName: string;
  task: string;
  triggerType: 'hours' | 'starts' | 'months';
  interval: number;
  lastExecutionValue: number;
  currentValue: number;
}

export interface MaintenanceLog {
  id: string;
  motorId: string;
  date: string;
  componentName: string;
  serviceType: 'replacement' | 'inspection' | 'repair';
  horimeter: number;
  partUsed: string;
  quantity: number;
  technician: string;
  notes: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  manufacturer: string;
  partNumber: string;
  quantity: number;
  location: string;
  minStock: number;
}

export function getMaintenanceStatus(currentValue: number, lastExecution: number, interval: number): MaintenanceStatus {
  const usage = currentValue - lastExecution;
  const ratio = usage / interval;
  if (ratio >= 1) return 'critical';
  if (ratio >= 0.9) return 'warning';
  return 'ok';
}

export function getUsagePercent(currentValue: number, lastExecution: number, interval: number): number {
  const usage = currentValue - lastExecution;
  return Math.min(Math.round((usage / interval) * 100), 100);
}
