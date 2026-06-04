import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navigation } from './components/Navigation';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import CreateGroup from './pages/CreateGroup';
import GroupReports from './pages/GroupReports';

function AppContent() {
  return (
    <NotificationProvider>
      <Navigation />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['user', 'super_admin']}><Dashboard /></ProtectedRoute>} />
        <Route path="/groups/create" element={<ProtectedRoute allowedRoles={['user', 'super_admin']}><CreateGroup /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute allowedRoles={['user', 'super_admin']}><GroupReports /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['super_admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['super_admin']}><AdminUsers /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </NotificationProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;