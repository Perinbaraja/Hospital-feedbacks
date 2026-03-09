import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Layouts
import DashboardLayout from './components/DashboardLayout';
import SuperAdminLayout from './components/SuperAdminLayout';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import PublicFeedback from './pages/PublicFeedback';
import TrackFeedback from './pages/TrackFeedback';
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
        <Route path="/track" element={<TrackFeedback />} />
        <Route path="/track/:id" element={<TrackFeedback />} />
        <Route path="/login" element={<Login />} />

        {/* Super Admin Dashboard (Purple Theme) */}
        <Route element={<ProtectedRoute element={<SuperAdminLayout />} allowedRoles={['Super_Admin']} />}>
          <Route path="/super-admin" element={<SuperAdminDashboard />} />
          <Route path="/super-admin/add-hospital" element={<SuperAdminAddHospital />} />
          <Route path="/super-admin/hospital/:id" element={<SuperAdminHospitalDetail />} />
        </Route>

        {/* Standard Hospital Dashboards (Brand Theme) */}
        <Route element={<ProtectedRoute element={<DashboardLayout allowedRoles={['Admin', 'Super_Admin', 'Dept_Head']} />} allowedRoles={['Admin', 'Super_Admin', 'Dept_Head']} />}>
          <Route path="/admin" element={<AdminFeedback />} />
          <Route path="/admin/staff" element={<AdminStaff />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/dept" element={<DeptDashboard />} />
        </Route>


        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
