import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { MySubmissionsPage } from './pages/MySubmissionsPage';
import { ApprovalDashboardPage } from './pages/ApprovalDashboardPage';
import { AuditPage } from './pages/AuditPage';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/submissions" element={<MySubmissionsPage />} />
              <Route 
                path="/approval" 
                element={
                  <ProtectedRoute allowedRoles={['MANAGER', 'ADMIN']}>
                    <ApprovalDashboardPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/audit" 
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AuditPage />
                  </ProtectedRoute>
                } 
              />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
