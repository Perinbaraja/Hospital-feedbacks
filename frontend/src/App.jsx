import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Layouts
import DashboardLayout from './components/DashboardLayout';
import SuperAdminLayout from './components/SuperAdminLayout';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import PublicFeedback from './pages/PublicFeedback';
import Login from './pages/Login';
import AdminSettings from './pages/AdminSettings';
import AdminStaff from './pages/AdminStaff';
import AdminFeedback from './pages/AdminFeedback';
import AdminDashboard from './pages/AdminDashboard';
import AdminTvMonitor from './pages/AdminTvMonitor';
import DeptDashboard from './pages/DeptDashboard';
import ForgotPassword from './pages/ForgotPassword';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import SuperAdminHospitalDetail from './pages/SuperAdminHospitalDetail';
import SuperAdminAddHospital from './pages/SuperAdminAddHospital';
import TvDashboard from './pages/TvDashboard';

const HomeRedirect = () => {
  const { user, loading } = useAuth();
  
  if (loading) return null;
  
  if (!user) return <Navigate to="/login" replace />;
  
  const role = (user.role || '').toLowerCase().replace(/[^a-z]/g, '');
  if (role === 'superadmin') return <Navigate to="/super-admin" replace />;
  if (['admin', 'hospitaladmin'].includes(role)) return <Navigate to="/admin" replace />;
  if (role === 'depthead') return <Navigate to="/dept" replace />;
  
  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/feedback/:qrId" element={<PublicFeedback />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Super Admin Dashboard (Purple Theme) */}
        <Route element={<ProtectedRoute allowedRoles={['Super_Admin', 'super_admin']} />}>
          <Route element={<SuperAdminLayout />}>
            <Route path="/super-admin" element={<SuperAdminDashboard />} />
            <Route path="/super-admin/add-hospital" element={<SuperAdminAddHospital />} />
            <Route path="/super-admin/hospital/:id" element={<SuperAdminHospitalDetail />} />
          </Route>
        </Route>

        {/* Standard Hospital Dashboards (Brand Theme) */}
        <Route element={<DashboardLayout allowedRoles={['admin', 'hospitaladmin', 'superadmin', 'depthead']} />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/feedbacks" element={<AdminFeedback />} />
          <Route path="/admin/staff" element={<AdminStaff />} />
          <Route path="/admin/tv-monitor" element={<AdminTvMonitor />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/dept" element={<DeptDashboard />} />
        </Route>

        {/* Full Screen Pages */}
        <Route path="/tv-dashboard" element={<TvDashboard />} />


        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
