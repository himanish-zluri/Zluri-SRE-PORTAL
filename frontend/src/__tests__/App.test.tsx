import { render, screen } from '@testing-library/react';
import { Outlet } from 'react-router-dom';
import App from '../App';

// Mock all the page components
jest.mock('../pages/LoginPage', () => ({
  LoginPage: () => <div data-testid="login-page">Login Page</div>,
}));

jest.mock('../pages/DashboardPage', () => ({
  DashboardPage: () => <div data-testid="dashboard-page">Dashboard Page</div>,
}));

jest.mock('../pages/MySubmissionsPage', () => ({
  MySubmissionsPage: () => <div data-testid="submissions-page">My Submissions Page</div>,
}));

jest.mock('../pages/ApprovalDashboardPage', () => ({
  ApprovalDashboardPage: () => <div data-testid="approval-page">Approval Dashboard Page</div>,
}));

jest.mock('../pages/AuditPage', () => ({
  AuditPage: () => <div data-testid="audit-page">Audit Page</div>,
}));

// Mock Layout component - must use Outlet for nested routes
jest.mock('../components/layout/Layout', () => {
  const { Outlet } = require('react-router-dom');
  return {
    Layout: () => (
      <div data-testid="layout">
        <div data-testid="layout-outlet">
          <Outlet />
        </div>
      </div>
    ),
  };
});

// Mock AuthContext
const mockUseAuth = jest.fn();
jest.mock('../context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => mockUseAuth(),
}));

// Mock ThemeContext
jest.mock('../context/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useTheme: () => ({ theme: 'light', toggleTheme: jest.fn() }),
}));

describe('App', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: '1', name: 'Test', email: 'test@test.com', role: 'ADMIN' },
      isLoading: false,
    });
  });

  it('renders without crashing', () => {
    render(<App />);
    expect(document.body).toBeInTheDocument();
  });

  it('wraps app in ThemeProvider and AuthProvider', () => {
    render(<App />);
    // If it renders without error, providers are working
    expect(document.body).toBeInTheDocument();
  });

  it('renders login page at /login route', () => {
    // Mock window.location
    window.history.pushState({}, '', '/login');
    
    render(<App />);
    
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
  });

  it('redirects unknown routes to dashboard', () => {
    window.history.pushState({}, '', '/unknown-route');
    
    render(<App />);
    
    // Should redirect to dashboard (which is inside Layout)
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('renders dashboard page at /dashboard route', () => {
    window.history.pushState({}, '', '/dashboard');
    
    render(<App />);
    
    expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
  });

  it('renders submissions page at /submissions route', () => {
    window.history.pushState({}, '', '/submissions');
    
    render(<App />);
    
    expect(screen.getByTestId('submissions-page')).toBeInTheDocument();
  });

  it('renders approval page at /approval route', () => {
    window.history.pushState({}, '', '/approval');
    
    render(<App />);
    
    expect(screen.getByTestId('approval-page')).toBeInTheDocument();
  });

  it('renders audit page at /audit route', () => {
    window.history.pushState({}, '', '/audit');
    
    render(<App />);
    
    expect(screen.getByTestId('audit-page')).toBeInTheDocument();
  });

  it('uses Layout component for protected routes', () => {
    window.history.pushState({}, '', '/dashboard');
    
    render(<App />);
    
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('does not use Layout for login page', () => {
    window.history.pushState({}, '', '/login');
    
    render(<App />);
    
    expect(screen.queryByTestId('layout')).not.toBeInTheDocument();
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
  });
});
