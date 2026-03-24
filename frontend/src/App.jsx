// frontend/src/App.jsx (with Navigation)
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navigation } from './components/Navigation'; // Add this import
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import MemberDashboard from './pages/MemberDashboard';
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
        
        {/* Protected routes for all authenticated users */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['group_member', 'group_admin', 'super_admin']}>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/my-groups" 
          element={
            <ProtectedRoute allowedRoles={['group_member', 'group_admin', 'super_admin']}>
              <MemberDashboard />
            </ProtectedRoute>
          } 
        />
        
        {/* Group Admin specific routes */}
        <Route 
          path="/groups/create" 
          element={
            <ProtectedRoute allowedRoles={['group_admin', 'super_admin']}>
              <CreateGroup />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/reports" 
          element={
            <ProtectedRoute allowedRoles={['group_admin', 'super_admin']}>
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
        
        {/* Catch all - redirect to login */}
        <Route path="*" element={<Navigate to="/" replace />} />
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