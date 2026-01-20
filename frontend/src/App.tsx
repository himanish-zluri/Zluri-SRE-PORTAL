import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ErrorProvider } from './context/ErrorContext';
import { ProcessingProvider } from './context/ProcessingContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { MySubmissionsPage } from './pages/MySubmissionsPage';
import { ApprovalDashboardPage } from './pages/ApprovalDashboardPage';
import { AuditPage } from './pages/AuditPage';

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ErrorProvider>
          <ProcessingProvider>
            <AuthProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route element={<Layout />}>
                    <Route path="/dashboard" element={
                      <ErrorBoundary fallback={<div className="p-6 text-center text-red-600">Dashboard temporarily unavailable</div>}>
                        <DashboardPage />
                      </ErrorBoundary>
                    } />
                    <Route path="/submissions" element={
                      <ErrorBoundary fallback={<div className="p-6 text-center text-red-600">Submissions temporarily unavailable</div>}>
                        <MySubmissionsPage />
                      </ErrorBoundary>
                    } />
                    <Route 
                      path="/approval" 
                      element={
                        <ProtectedRoute allowedRoles={['MANAGER', 'ADMIN']}>
                          <ErrorBoundary fallback={<div className="p-6 text-center text-red-600">Approval dashboard temporarily unavailable</div>}>
                            <ApprovalDashboardPage />
                          </ErrorBoundary>
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/audit" 
                      element={
                        <ProtectedRoute allowedRoles={['ADMIN']}>
                          <ErrorBoundary fallback={<div className="p-6 text-center text-red-600">Audit page temporarily unavailable</div>}>
                            <AuditPage />
                          </ErrorBoundary>
                        </ProtectedRoute>
                      } 
                    />
                  </Route>
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </BrowserRouter>
            </AuthProvider>
          </ProcessingProvider>
        </ErrorProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
