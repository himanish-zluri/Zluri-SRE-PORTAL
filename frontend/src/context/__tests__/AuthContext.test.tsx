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
  const { user, isLoading, isLoggingOut, login, logout } = useAuth();
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      <span data-testid="user">{user ? user.email : 'No user'}</span>
      <span data-testid="logging-out">{isLoggingOut ? 'Logging out' : 'Not logging out'}</span>
      <button onClick={() => login('test@test.com', 'password')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

describe('AuthContext with HttpOnly Cookies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    (localStorage.getItem as jest.Mock).mockReturnValue(null);
  });

  it('provides null user initially when no access token', async () => {
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

  it('attempts to refresh token on mount if access token exists', async () => {
    (localStorage.getItem as jest.Mock).mockReturnValue('existing-access-token');
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
    
    // Should call refresh without parameters (uses HttpOnly cookie)
    expect(authApi.refresh).toHaveBeenCalledWith();
    expect(localStorage.setItem).toHaveBeenCalledWith('accessToken', 'new-access-token');
    expect(screen.getByTestId('user')).toHaveTextContent('test@test.com');
  });

  it('clears access token on refresh failure', async () => {
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
    // Should NOT try to remove refreshToken (it's in HttpOnly cookie)
    expect(localStorage.removeItem).not.toHaveBeenCalledWith('refreshToken');
    expect(screen.getByTestId('user')).toHaveTextContent('No user');
  });

  it('logs in user successfully and only stores access token', async () => {
    (authApi.login as jest.Mock).mockResolvedValue({
      data: {
        accessToken: 'access-token',
        // No refreshToken in response (it's set as HttpOnly cookie)
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
    // Should NOT store refresh token in localStorage
    expect(localStorage.setItem).not.toHaveBeenCalledWith('refreshToken', expect.anything());
  });

  it('logs out user successfully using HttpOnly cookie', async () => {
    (localStorage.getItem as jest.Mock).mockReturnValue('access-token');
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
    
    // Should call logout without parameters (uses HttpOnly cookie)
    expect(authApi.logout).toHaveBeenCalledWith();
    expect(localStorage.removeItem).toHaveBeenCalledWith('accessToken');
    // Should NOT try to remove refreshToken from localStorage
    expect(localStorage.removeItem).not.toHaveBeenCalledWith('refreshToken');
  });

  it('handles logout API error gracefully', async () => {
    (localStorage.getItem as jest.Mock).mockReturnValue('access-token');
    (authApi.refresh as jest.Mock).mockResolvedValue({
      data: {
        accessToken: 'access-token',
        user: { id: '1', email: 'test@test.com', name: 'Test', role: 'DEVELOPER' },
      },
    });
    (authApi.logout as jest.Mock).mockRejectedValue(new Error('Logout failed'));
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
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
    
    // Should still clear access token even if API fails
    expect(localStorage.removeItem).toHaveBeenCalledWith('accessToken');
    expect(consoleSpy).toHaveBeenCalledWith('Logout error:', expect.any(Error));
    
    consoleSpy.mockRestore();
  });

  it('handles logout when no access token exists', async () => {
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
      // Should still call logout API to clear HttpOnly cookie
      expect(authApi.logout).toHaveBeenCalledWith();
    });
  });

  it('throws error when useAuth is used outside provider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within an AuthProvider');
    
    consoleSpy.mockRestore();
  });

  it('does not attempt refresh when no access token exists', async () => {
    (localStorage.getItem as jest.Mock).mockReturnValue(null);
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
    
    expect(authApi.refresh).not.toHaveBeenCalled();
    expect(screen.getByTestId('user')).toHaveTextContent('No user');
  });
});
