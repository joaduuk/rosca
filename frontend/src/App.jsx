// frontend/src/App.jsx (Simplified - remove MemberDashboard if not needed)
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
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
    <>
      <Navigation />
      <Routes>
        {/* Public route */}
        <Route path="/" element={<Login />} />
        
        {/* Dashboard for all authenticated users */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['user', 'super_admin']}>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        
        {/* Create Group - available to all users */}
        <Route 
          path="/groups/create" 
          element={
            <ProtectedRoute allowedRoles={['user', 'super_admin']}>
              <CreateGroup />
            </ProtectedRoute>
          } 
        />
        
        {/* Reports - available to all users */}
        <Route 
          path="/reports" 
          element={
            <ProtectedRoute allowedRoles={['user', 'super_admin']}>
              <GroupReports />
            </ProtectedRoute>
          } 
        />
        
        {/* Super Admin only routes */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedRoles={['super_admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/admin/users" 
          element={
            <ProtectedRoute allowedRoles={['super_admin']}>
              <AdminUsers />
            </ProtectedRoute>
          } 
        />
        
        {/* Catch all - redirect to dashboard if logged in, else login */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
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