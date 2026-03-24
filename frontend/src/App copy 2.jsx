// frontend/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MemberDashboard from './pages/MemberDashboard'; // Add this
import CreateGroup from './pages/CreateGroup';


function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Login />} />
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;