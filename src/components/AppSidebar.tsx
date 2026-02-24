import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Package, Settings, Wrench, Factory, MapPin, Droplets, Cylinder, CircleDot, Zap, Circle, ClipboardList, Cog, Wind, FileText } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/inventory', label: 'Estoque', icon: Package },
  { to: '/manufacturers', label: 'Fabricantes', icon: Factory },
  { to: '/locations', label: 'Locais', icon: MapPin },
  { to: '/cylinder-heads', label: 'Cabeçotes', icon: Cog },
  { to: '/turbos', label: 'Turbos', icon: Wind },
  { to: '/reports', label: 'Relatórios', icon: FileText },
  { to: '/maintenance', label: 'Manutenção', icon: Wrench },
  { to: '/maintenance/oil', label: 'Óleo', icon: Droplets },
  { to: '/maintenance/pistons', label: 'Pistões', icon: Cylinder },
  { to: '/maintenance/liners', label: 'Camisas', icon: CircleDot },
  { to: '/maintenance/spark-plugs', label: 'Velas', icon: Zap },
  { to: '/maintenance/bearings', label: 'Bronzinas', icon: Circle },
  { to: '/maintenance/plans', label: 'Planos', icon: ClipboardList },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 bottom-0 z-30 w-56 flex flex-col bg-sidebar border-r border-sidebar-border">
      <div className="px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Settings className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-sidebar-accent-foreground tracking-tight">MotorGuard</h1>
            <p className="text-[10px] text-sidebar-foreground">Asset Management</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(item => {
          const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-sidebar-border">
        <p className="text-[10px] text-sidebar-foreground">v1.0 · Multi-tenant SaaS</p>
      </div>
    </aside>
  );
}
