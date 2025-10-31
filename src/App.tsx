import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import ForgotPassword from "./pages/AuthPages/ForgotPassword";
import ResetPassword from "./pages/AuthPages/ResetPassword";
import NotFound from "./pages/OtherPage/NotFound";
import UserProfiles from "./pages/UserProfiles";
import Videos from "./pages/UiElements/Videos";
import Images from "./pages/UiElements/Images";
import Alerts from "./pages/UiElements/Alerts";
import Badges from "./pages/UiElements/Badges";
import Avatars from "./pages/UiElements/Avatars";
import Buttons from "./pages/UiElements/Buttons";
import LineChart from "./pages/Charts/LineChart";
import BarChart from "./pages/Charts/BarChart";
import Calendar from "./pages/Calendar";
import FormElements from "./pages/Forms/FormElements";
import AppLayout from "./layout/AppLayout";
import SuperAdminLayout from "./layout/SuperAdminLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import ImplementationTasksPage from "./pages/PageClients/implementation-tasks";
import DevTasksPage from "./pages/PageClients/dev-tasks";
import MaintenanceTasksPage from "./pages/PageClients/maintenance-tasks";
import Hospitals from "./pages/Page/Hospitals";
import HisSystemPage from "./pages/Page/HisSystem";
import PersonCharge from "./pages/Page/PersonCharge";
import SuperAdminHome from "./pages/SuperAdmin/Home";
import SuperAdminUsers from "./pages/SuperAdmin/Users";
import Agencies from "./pages/SuperAdmin/Agencies";
import Hardware from "./pages/SuperAdmin/Hardware";
import SuperAdminProfile from "./pages/SuperAdmin/Profile";
import ImplementSuperTaskPage from "./pages/SuperAdmin/implementsuper-task";
import DevSuperTaskPage from "./pages/SuperAdmin/devsupertask";
import MaintenanceSuperTaskPage from "./pages/SuperAdmin/maintenacesuper-task";
import AllNotificationsPage from "./pages/Notifications/AllNotificationsPage";

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
  
  if (!token) {
    return <Navigate to="/signin" replace />;
  }
  
  return <>{children}</>;
};

export default function App() {
  // Check if user is authenticated
  // @ts-ignore
  const isAuthenticated = () => {
    const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
    return !!token;
  };

  // Get user roles
  const getUserRoles = () => {
    try {
      const rolesStr = localStorage.getItem("roles") || sessionStorage.getItem("roles");
      if (rolesStr) {
        return JSON.parse(rolesStr);
      }
    } catch (e) {
      console.error("Error parsing roles:", e);
    }
    return [];
  };

  // Check if user is super admin
  // @ts-ignore
  const isSuperAdmin = () => {
    const roles = getUserRoles();
    return roles.some((role: string) => role === "SUPERADMIN" || role === "SUPER_ADMIN" || role === "Super Admin");
  };

  return (
    <div className="font-outfit">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#fff',
            color: '#363636',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Default redirect to Sign In */}
          <Route path="/" element={<Navigate to="/signin" replace />} />

          {/* Super Admin Layout - Protected */}
          <Route element={<ProtectedRoute><SuperAdminLayout /></ProtectedRoute>}>
            <Route path="/superadmin/home" element={<SuperAdminHome />} />
            <Route path="/superadmin/users" element={<SuperAdminUsers />} />
            <Route path="/superadmin/hospitals" element={<Hospitals />} />
            <Route path="/superadmin/his-systems" element={<HisSystemPage />} />
            <Route path="/superadmin/agencies" element={<Agencies />} />
            <Route path="/superadmin/hardware" element={<Hardware />} />
            {/* SuperAdmin-specific task pages */}
            <Route path="/superadmin/implementation-tasks" element={<ImplementSuperTaskPage />} />
            <Route path="/superadmin/dev-tasks" element={<DevSuperTaskPage />} />
            <Route path="/superadmin/maintenance-tasks" element={<MaintenanceSuperTaskPage />} />
            <Route path="/superadmin/profile" element={<SuperAdminProfile />} />
          </Route>

          {/* Dashboard Layout - Protected */}
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/home" element={<Home />} />

            {/* Others Page */}
            <Route path="/profile" element={<UserProfiles />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/implementation-tasks" element={<ImplementationTasksPage />} />
            <Route path="/dev-tasks" element={<DevTasksPage />} />
            <Route path="/maintenance-tasks" element={<MaintenanceTasksPage />} />

            {/* Forms */}
            <Route path="/form-elements" element={<FormElements />} />

            {/* Tables */}
            <Route path="/hospitals" element={<Hospitals />} />
            <Route path="/his-sys" element={<HisSystemPage />} />
            <Route path="/personCharge" element={<PersonCharge />} />

            {/* Ui Elements */}
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/avatars" element={<Avatars />} />
            <Route path="/badge" element={<Badges />} />
            <Route path="/buttons" element={<Buttons />} />
            <Route path="/images" element={<Images />} />
            <Route path="/videos" element={<Videos />} />

            {/* Charts */}
            <Route path="/line-chart" element={<LineChart />} />
            <Route path="/bar-chart" element={<BarChart />} />
            <Route path="/notifications" element={<AllNotificationsPage />} />
          </Route>

          {/* Auth Layout */}
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </div>
  );
}
