import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';

// Mock the useAuth hook
jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

import { useAuth } from '../../context/AuthContext';

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('ProtectedRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading spinner when auth is loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
      login: jest.fn(),
      logout: jest.fn(),
    });

    renderWithRouter(
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('redirects to login when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
    });

    renderWithRouter(
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('redirects to dashboard when user lacks required role', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: '1',
        email: 'dev@example.com',
        name: 'Developer',
        role: 'DEVELOPER',
      },
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
    });

    renderWithRouter(
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <div>Admin Only Content</div>
      </ProtectedRoute>
    );

    expect(screen.queryByText('Admin Only Content')).not.toBeInTheDocument();
  });

  it('renders children when user has required role', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: '1',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'ADMIN',
      },
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
    });

    renderWithRouter(
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <div>Admin Only Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Admin Only Content')).toBeInTheDocument();
  });

  it('renders children when user has one of multiple allowed roles', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: '1',
        email: 'manager@example.com',
        name: 'Manager',
        role: 'MANAGER',
      },
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
    });

    renderWithRouter(
      <ProtectedRoute allowedRoles={['MANAGER', 'ADMIN']}>
        <div>Manager or Admin Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Manager or Admin Content')).toBeInTheDocument();
  });

  it('blocks access when user role is not in allowed roles', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: '1',
        email: 'dev@example.com',
        name: 'Developer',
        role: 'DEVELOPER',
      },
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
    });

    renderWithRouter(
      <ProtectedRoute allowedRoles={['MANAGER', 'ADMIN']}>
        <div>Manager or Admin Content</div>
      </ProtectedRoute>
    );

    expect(screen.queryByText('Manager or Admin Content')).not.toBeInTheDocument();
  });
});