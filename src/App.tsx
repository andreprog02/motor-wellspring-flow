import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import MotorDetail from "./pages/MotorDetail";
import InventoryPage from "./pages/InventoryPage";
import ManufacturersPage from "./pages/ManufacturersPage";
import LocationsPage from "./pages/LocationsPage";
import MaintenancePage from "./pages/MaintenancePage";
import OilMaintenancePage from "./pages/OilMaintenancePage";
import PistonMaintenancePage from "./pages/PistonMaintenancePage";
import LinerMaintenancePage from "./pages/LinerMaintenancePage";
import SparkPlugMaintenancePage from "./pages/SparkPlugMaintenancePage";
import MaintenancePlansPage from "./pages/MaintenancePlansPage";
import EquipmentDetailPage from "./pages/EquipmentDetailPage";
import CylinderHeadsPage from "./pages/CylinderHeadsPage";
import TurbosPage from "./pages/TurbosPage";
import ReportsPage from "./pages/ReportsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/motor/:id" element={<MotorDetail />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/manufacturers" element={<ManufacturersPage />} />
          <Route path="/locations" element={<LocationsPage />} />
          <Route path="/maintenance" element={<MaintenancePage />} />
          <Route path="/maintenance/oil" element={<OilMaintenancePage />} />
          <Route path="/maintenance/pistons" element={<PistonMaintenancePage />} />
          <Route path="/maintenance/liners" element={<LinerMaintenancePage />} />
          <Route path="/maintenance/spark-plugs" element={<SparkPlugMaintenancePage />} />
          <Route path="/maintenance/plans" element={<MaintenancePlansPage />} />
          <Route path="/equipment/:id" element={<EquipmentDetailPage />} />
          <Route path="/cylinder-heads" element={<CylinderHeadsPage />} />
          <Route path="/turbos" element={<TurbosPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
