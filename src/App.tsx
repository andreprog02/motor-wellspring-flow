import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
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
import BearingMaintenancePage from "./pages/BearingMaintenancePage";
import ReportsPage from "./pages/ReportsPage";
import ToolsPage from "./pages/ToolsPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import TermsPage from "./pages/TermsPage";
import TeamPage from "./pages/TeamPage";
import SuperAdminPage from "./pages/SuperAdminPage";
import MaintenanceReportPage from "./pages/MaintenanceReportPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const P = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>{children}</ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/" element={<P><Index /></P>} />
            <Route path="/motor/:id" element={<P><MotorDetail /></P>} />
            <Route path="/inventory" element={<P><InventoryPage /></P>} />
            <Route path="/tools" element={<P><ToolsPage /></P>} />
            <Route path="/manufacturers" element={<P><ManufacturersPage /></P>} />
            <Route path="/locations" element={<P><LocationsPage /></P>} />
            <Route path="/maintenance" element={<P><MaintenancePage /></P>} />
            <Route path="/maintenance/oil" element={<P><OilMaintenancePage /></P>} />
            <Route path="/maintenance/pistons" element={<P><PistonMaintenancePage /></P>} />
            <Route path="/maintenance/liners" element={<P><LinerMaintenancePage /></P>} />
            <Route path="/maintenance/spark-plugs" element={<P><SparkPlugMaintenancePage /></P>} />
            <Route path="/maintenance/bearings" element={<P><BearingMaintenancePage /></P>} />
            <Route path="/maintenance/plans" element={<P><MaintenancePlansPage /></P>} />
            <Route path="/equipment/:id" element={<P><EquipmentDetailPage /></P>} />
            <Route path="/cylinder-heads" element={<P><CylinderHeadsPage /></P>} />
            <Route path="/turbos" element={<P><TurbosPage /></P>} />
            <Route path="/reports" element={<P><ReportsPage /></P>} />
            <Route path="/maintenance/report" element={<P><MaintenanceReportPage /></P>} />
            <Route path="/team" element={<P><TeamPage /></P>} />
            <Route path="/super-admin" element={<P><SuperAdminPage /></P>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
