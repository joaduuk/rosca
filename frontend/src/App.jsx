import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navigation } from './components/Navigation';
import HomePage from './pages/HomePage';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import CreateGroup from './pages/CreateGroup';
import GroupReports from './pages/GroupReports';
import Profile from './pages/Profile';
import ContactPage from './pages/ContactPage';
import GroupManage from './pages/GroupManage';
import AboutDeveloper from './pages/AboutDeveloper';

function AppContent() {
  return (
    <NotificationProvider>
      <Navigation />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['user', 'super_admin']}><Dashboard /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute allowedRoles={['user', 'super_admin']}><Profile /></ProtectedRoute>} />
        <Route path="/groups/create" element={<ProtectedRoute allowedRoles={['user', 'super_admin']}><CreateGroup /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute allowedRoles={['user', 'super_admin']}><GroupReports /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['super_admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['super_admin']}><AdminUsers /></ProtectedRoute>} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/about-the-developer" element={<AboutDeveloper />} />
        <Route path="/manage" element={<ProtectedRoute allowedRoles={['user', 'super_admin']}><GroupManage /></ProtectedRoute>} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
        
      </Routes>
    </NotificationProvider>
  );
}

function App() {
  return (
    <HelmetProvider>
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
    </HelmetProvider>
  );
}

export default App;
