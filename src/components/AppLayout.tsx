import { ReactNode, useState } from 'react';
import { AppSidebar } from '@/components/AppSidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { PanelLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AppLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Mobile top bar */}
      {isMobile && (
        <header className="sticky top-0 z-30 h-12 flex items-center border-b border-border bg-background px-4">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground"
          >
            <PanelLeft className="h-5 w-5" />
          </button>
          <span className="ml-3 text-sm font-bold text-foreground">Hub Engine</span>
        </header>
      )}

      <main className={cn(
        "transition-all duration-300",
        isMobile ? "" : collapsed ? "pl-14" : "pl-56"
      )}>
        <div className="p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
