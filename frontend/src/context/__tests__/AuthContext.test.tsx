import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import { authApi } from '../../services/api';

// Mock the API
jest.mock('../../services/api', () => ({
  authApi: {
    login: jest.fn(),
    logout: jest.fn(),
    refresh: jest.fn(),
  },
}));

// Test component that uses the auth context
function TestComponent() {
  const { user, isLoading, login, logout } = useAuth();
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      <span data-testid="user">{user ? user.email : 'No user'}</span>
      <button onClick={() => login('test@test.com', 'password')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    (localStorage.getItem as jest.Mock).mockReturnValue(null);
  });

  it('provides null user initially when no refresh token', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
    
    expect(screen.getByTestId('user')).toHaveTextContent('No user');
  });

  it('attempts to refresh token on mount if refresh token exists', async () => {
    (localStorage.getItem as jest.Mock).mockReturnValue('refresh-token');
    (authApi.refresh as jest.Mock).mockResolvedValue({
      data: {
        accessToken: 'new-access-token',
        user: { id: '1', email: 'test@test.com', name: 'Test', role: 'DEVELOPER' },
      },
    });
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
    
    expect(authApi.refresh).toHaveBeenCalledWith('refresh-token');
    expect(screen.getByTestId('user')).toHaveTextContent('test@test.com');
  });

  it('clears tokens on refresh failure', async () => {
    (localStorage.getItem as jest.Mock).mockReturnValue('invalid-token');
    (authApi.refresh as jest.Mock).mockRejectedValue(new Error('Invalid token'));
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
    
    expect(localStorage.removeItem).toHaveBeenCalledWith('accessToken');
    expect(localStorage.removeItem).toHaveBeenCalledWith('refreshToken');
    expect(screen.getByTestId('user')).toHaveTextContent('No user');
  });

  it('logs in user successfully', async () => {
    (authApi.login as jest.Mock).mockResolvedValue({
      data: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: { id: '1', email: 'test@test.com', name: 'Test', role: 'DEVELOPER' },
      },
    });
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Login'));
    
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('test@test.com');
    });
    
    expect(authApi.login).toHaveBeenCalledWith('test@test.com', 'password');
    expect(localStorage.setItem).toHaveBeenCalledWith('accessToken', 'access-token');
    expect(localStorage.setItem).toHaveBeenCalledWith('refreshToken', 'refresh-token');
  });

  it('logs out user successfully', async () => {
    (localStorage.getItem as jest.Mock).mockImplementation((key) => {
      if (key === 'refreshToken') return 'refresh-token';
      return null;
    });
    (authApi.refresh as jest.Mock).mockResolvedValue({
      data: {
        accessToken: 'access-token',
        user: { id: '1', email: 'test@test.com', name: 'Test', role: 'DEVELOPER' },
      },
    });
    (authApi.logout as jest.Mock).mockResolvedValue({});
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('test@test.com');
    });
    
    fireEvent.click(screen.getByText('Logout'));
    
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('No user');
    });
    
    expect(authApi.logout).toHaveBeenCalledWith('refresh-token');
    expect(localStorage.removeItem).toHaveBeenCalledWith('accessToken');
    expect(localStorage.removeItem).toHaveBeenCalledWith('refreshToken');
  });

  it('handles logout API error gracefully', async () => {
    (localStorage.getItem as jest.Mock).mockImplementation((key) => {
      if (key === 'refreshToken') return 'refresh-token';
      return null;
    });
    (authApi.refresh as jest.Mock).mockResolvedValue({
      data: {
        accessToken: 'access-token',
        user: { id: '1', email: 'test@test.com', name: 'Test', role: 'DEVELOPER' },
      },
    });
    (authApi.logout as jest.Mock).mockRejectedValue(new Error('Logout failed'));
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('test@test.com');
    });
    
    fireEvent.click(screen.getByText('Logout'));
    
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('No user');
    });
    
    // Should still clear tokens even if API fails
    expect(localStorage.removeItem).toHaveBeenCalledWith('accessToken');
    expect(localStorage.removeItem).toHaveBeenCalledWith('refreshToken');
  });

  it('handles logout when no refresh token exists', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Logout'));
    
    await waitFor(() => {
      expect(authApi.logout).not.toHaveBeenCalled();
    });
  });

  it('throws error when useAuth is used outside provider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within an AuthProvider');
    
    consoleSpy.mockRestore();
  });
});
