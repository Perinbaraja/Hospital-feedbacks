import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Layouts
import DashboardLayout from './components/DashboardLayout';

// Pages
import PublicFeedback from './pages/PublicFeedback';
import Login from './pages/Login';
import AdminSettings from './pages/AdminSettings';
import AdminStaff from './pages/AdminStaff';
import AdminFeedback from './pages/AdminFeedback';
import DeptDashboard from './pages/DeptDashboard';

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Route */}
        <Route path="/" element={<Navigate to="/feedback/1" replace />} />
        <Route path="/feedback/:hospitalId" element={<PublicFeedback />} />

        {/* Auth Route */}
        <Route path="/login" element={<Login />} />

        {/* Admin Dashboard Routes */}
        <Route element={<DashboardLayout allowedRoles={['Admin']} />}>
          <Route path="/admin" element={<AdminFeedback />} />
          <Route path="/admin/staff" element={<AdminStaff />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
        </Route>

        {/* Dept Dashboard Routes */}
        <Route element={<DashboardLayout allowedRoles={['Dept_Head']} />}>
          <Route path="/dept" element={<DeptDashboard />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
