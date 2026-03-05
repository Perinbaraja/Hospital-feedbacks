import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Layouts
import DashboardLayout from './components/DashboardLayout';
import SuperAdminLayout from './components/SuperAdminLayout';

// Pages
import PublicFeedback from './pages/PublicFeedback';
import Login from './pages/Login';
import AdminSettings from './pages/AdminSettings';
import AdminStaff from './pages/AdminStaff';
import AdminFeedback from './pages/AdminFeedback';
import DeptDashboard from './pages/DeptDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import SuperAdminHospitalDetail from './pages/SuperAdminHospitalDetail';
import SuperAdminAddHospital from './pages/SuperAdminAddHospital';

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/feedback/:qrId" element={<PublicFeedback />} />
        <Route path="/login" element={<Login />} />

        {/* Super Admin Dashboard (Purple Theme) */}
        <Route element={<SuperAdminLayout />}>
          <Route path="/super-admin" element={<SuperAdminDashboard />} />
          <Route path="/super-admin/add-hospital" element={<SuperAdminAddHospital />} />
        </Route>

        {/* Standard Hospital Dashboards (Brand Theme) */}
        <Route element={<DashboardLayout allowedRoles={['Admin', 'Super_Admin', 'Dept_Head']} />}>

          {/* Routes shared by Admin and Super Admin */}
          <Route path="/admin" element={<AdminFeedback />} />
          <Route path="/admin/staff" element={<AdminStaff />} />
          <Route path="/admin/settings" element={<AdminSettings />} />

          {/* Dept Head Dashboard */}
          <Route path="/dept" element={<DeptDashboard />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
