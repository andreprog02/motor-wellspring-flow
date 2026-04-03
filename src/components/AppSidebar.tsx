import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Package, Settings, Wrench, Factory, MapPin, Droplets, Cylinder, CircleDot, Zap, Circle, ClipboardList, Cog, Wind, FileText, PanelLeftClose, PanelLeft, ChevronDown, DatabaseBackup, LogOut, UserCircle, Users, ShieldCheck } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { BackupDialog } from '@/components/BackupDialog';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSelector } from '@/components/LanguageSelector';

const navKeys: Record<string, string> = {
  '/': 'nav.dashboard',
  '/inventory': 'nav.inventory',
  '/tools': 'nav.tools',
  '/cylinder-heads': 'nav.cylinder_heads',
  '/turbos': 'nav.turbos',
  '/reports': 'nav.reports',
};

const navItems = [
  { to: '/', icon: LayoutDashboard },
  { to: '/inventory', icon: Package },
  { to: '/tools', icon: Wrench },
  { to: '/cylinder-heads', icon: Cog },
  { to: '/turbos', icon: Wind },
  { to: '/reports', icon: FileText },
];

const maintenanceSubItems = [
  { to: '/maintenance/plans', key: 'nav.plans', icon: ClipboardList },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function AppSidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: AppSidebarProps) {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { profile, tenant, isSuperAdmin, signOut } = useAuth();
  const { t } = useLanguage();
  const isMaintenanceActive = location.pathname.startsWith('/maintenance');
  const [maintenanceOpen, setMaintenanceOpen] = useState(isMaintenanceActive);
  const [backupOpen, setBackupOpen] = useState(false);
  const showLabels = !collapsed || isMobile;
  const isAdmin = profile?.role === 'admin';

  const renderNavLink = (item: { to: string; icon: React.ElementType; key?: string }, indent = false) => {
    const label = t(item.key || navKeys[item.to] || item.to);
    const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
    return (
      <Link
        key={item.to}
        to={item.to}
        onClick={isMobile ? onMobileClose : undefined}
        title={!showLabels ? label : undefined}
        className={cn(
          'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
          !showLabels ? 'justify-center px-2' : '',
          indent && showLabels ? 'pl-9' : '',
          isActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
        )}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        {showLabels && label}
      </Link>
    );
  };

  const sidebarContent = (
    <>
      <div className={cn("px-5 py-5 border-b border-sidebar-border flex items-center", collapsed && !isMobile ? "px-3 justify-center" : "justify-between")}>
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
            <Settings className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          {showLabels && (
            <div>
              <h1 className="text-sm font-bold text-sidebar-accent-foreground tracking-tight">Hub Engine</h1>
              <p className="text-[10px] text-sidebar-foreground">Asset Management</p>
            </div>
          )}
        </div>
        {!isMobile && (
          <button onClick={onToggle} className="text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors p-1 rounded-md hover:bg-sidebar-accent">
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(item => renderNavLink(item))}

        {/* Manutenção group */}
        <button
          onClick={() => setMaintenanceOpen(o => !o)}
          title={!showLabels ? t('nav.maintenance') : undefined}
          className={cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors w-full',
            !showLabels ? 'justify-center px-2' : '',
            isMaintenanceActive
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
          )}
        >
          <Wrench className="h-4 w-4 shrink-0" />
          {showLabels && (
            <>
              <span className="flex-1 text-left">{t('nav.maintenance')}</span>
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", maintenanceOpen && "rotate-180")} />
            </>
          )}
        </button>
        {maintenanceOpen && showLabels && (
          <div className="space-y-0.5">
            {maintenanceSubItems.map(item => renderNavLink(item, true))}
          </div>
        )}
      </nav>

      <div className={cn("px-3 py-3 border-t border-sidebar-border space-y-1")}>
        {/* User info */}
        {showLabels && profile && (
          <div className="px-3 py-2">
            <p className="text-xs font-medium text-sidebar-accent-foreground truncate">{profile.full_name || profile.email}</p>
            <p className="text-[10px] text-sidebar-foreground truncate">{tenant?.name}</p>
            {isAdmin && <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">Admin</span>}
          </div>
        )}
        {isAdmin && (
          <Link
            to="/team"
            onClick={isMobile ? onMobileClose : undefined}
            title={!showLabels ? t('nav.team') : undefined}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors w-full',
              !showLabels ? 'justify-center px-2' : '',
              location.pathname === '/team'
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            )}
          >
            <Users className="h-4 w-4 shrink-0" />
            {showLabels && t('nav.team')}
          </Link>
        )}
        {isSuperAdmin && (
          <Link
            to="/super-admin"
            onClick={isMobile ? onMobileClose : undefined}
            title={!showLabels ? t('nav.super_admin') : undefined}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors w-full',
              !showLabels ? 'justify-center px-2' : '',
              location.pathname === '/super-admin'
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            )}
          >
            <ShieldCheck className="h-4 w-4 shrink-0" />
            {showLabels && t('nav.super_admin')}
          </Link>
        )}

        {/* Language selector */}
        <div className={cn("px-3 py-1", !showLabels && "px-1 flex justify-center")}>
          <LanguageSelector compact={!showLabels} />
        </div>

        <button
          onClick={() => setBackupOpen(true)}
          title={!showLabels ? t('nav.backup') : undefined}
          className={cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors w-full',
            !showLabels ? 'justify-center px-2' : '',
            'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
          )}
        >
          <DatabaseBackup className="h-4 w-4 shrink-0" />
          {showLabels && t('nav.backup')}
        </button>
        <button
          onClick={signOut}
          title={!showLabels ? t('nav.logout') : undefined}
          className={cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors w-full',
            !showLabels ? 'justify-center px-2' : '',
            'text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive'
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {showLabels && t('nav.logout')}
        </button>
        <div className={cn("px-2 pt-1", !showLabels && "text-center")}>
          <p className="text-[10px] text-sidebar-foreground">v1.0 · Multi-tenant SaaS</p>
        </div>
      </div>
      <BackupDialog open={backupOpen} onOpenChange={setBackupOpen} />
    </>
  );

  // Mobile: overlay drawer
  if (isMobile) {
    return (
      <>
        {mobileOpen && (
          <div className="fixed inset-0 z-40 bg-black/50" onClick={onMobileClose} />
        )}
        <aside
          className={cn(
            "fixed left-0 top-0 bottom-0 z-50 w-64 flex flex-col bg-sidebar border-r border-sidebar-border transition-transform duration-300",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {sidebarContent}
        </aside>
      </>
    );
  }

  // Desktop: collapsible
  return (
    <aside
      className={cn(
        "fixed left-0 top-0 bottom-0 z-30 flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-14" : "w-56"
      )}
    >
      {sidebarContent}
    </aside>
  );
}
