import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import { authApi } from '../../services/api';

// Mock the API
jest.mock('../../services/api', () => ({
  authApi: {
    refresh: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
  },
}));

const mockAuthApi = authApi as jest.Mocked<typeof authApi>;

// Test component to use the hook
function TestComponent() {
  const { user, isLoading, isLoggingOut, login, logout } = useAuth();
  
  return (
    <div>
      <div data-testid="user">{user ? user.name : 'No user'}</div>
      <div data-testid="loading">{isLoading ? 'Loading' : 'Not loading'}</div>
      <div data-testid="logging-out">{isLoggingOut ? 'Logging out' : 'Not logging out'}</div>
      <button onClick={() => login('test@example.com', 'password')}>Login</button>
      <button onClick={() => logout()}>Logout</button>
    </div>
  );
}

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('throws error when useAuth is used outside AuthProvider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within an AuthProvider');
    
    consoleSpy.mockRestore();
  });

  it('initializes with loading state and attempts token refresh', async () => {
    mockAuthApi.refresh.mockRejectedValue(new Error('No refresh token'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Initially should be loading
    expect(screen.getByTestId('loading')).toHaveTextContent('Loading');
    expect(screen.getByTestId('user')).toHaveTextContent('No user');

    // Wait for initialization to complete
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Not loading');
    });

    expect(mockAuthApi.refresh).toHaveBeenCalledTimes(1);
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('accessToken');
  });

  it('successfully refreshes token on initialization', async () => {
    const mockUser = { id: '1', name: 'John Doe', email: 'john@example.com', role: 'USER' };
    mockAuthApi.refresh.mockResolvedValue({
      data: {
        user: mockUser,
        accessToken: 'new-access-token',
      },
    } as any);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Not loading');
    });

    expect(screen.getByTestId('user')).toHaveTextContent('John Doe');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('accessToken', 'new-access-token');
  });

  it('handles login successfully', async () => {
    const mockUser = { id: '1', name: 'John Doe', email: 'john@example.com', role: 'USER' };
    mockAuthApi.refresh.mockRejectedValue(new Error('No refresh token'));
    mockAuthApi.login.mockResolvedValue({
      data: {
        user: mockUser,
        accessToken: 'access-token',
      },
    } as any);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for initialization
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Not loading');
    });

    // Perform login
    const loginButton = screen.getByText('Login');
    await act(async () => {
      loginButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('John Doe');
    });

    expect(mockAuthApi.login).toHaveBeenCalledWith('test@example.com', 'password');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('accessToken', 'access-token');
  });

  it('handles logout successfully', async () => {
    const mockUser = { id: '1', name: 'John Doe', email: 'john@example.com', role: 'USER' };
    mockAuthApi.refresh.mockResolvedValue({
      data: {
        user: mockUser,
        accessToken: 'access-token',
      },
    } as any);
    mockAuthApi.logout.mockResolvedValue({} as any);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for initialization with user
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('John Doe');
    });

    // Perform logout
    const logoutButton = screen.getByText('Logout');
    await act(async () => {
      logoutButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('No user');
      expect(screen.getByTestId('logging-out')).toHaveTextContent('Not logging out');
    });

    expect(mockAuthApi.logout).toHaveBeenCalledTimes(1);
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('accessToken');
  });

  it('handles logout failure gracefully', async () => {
    const mockUser = { id: '1', name: 'John Doe', email: 'john@example.com', role: 'USER' };
    mockAuthApi.refresh.mockResolvedValue({
      data: {
        user: mockUser,
        accessToken: 'access-token',
      },
    } as any);
    mockAuthApi.logout.mockRejectedValue(new Error('Network error'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for initialization with user
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('John Doe');
    });

    // Perform logout
    const logoutButton = screen.getByText('Logout');
    await act(async () => {
      logoutButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('No user');
      expect(screen.getByTestId('logging-out')).toHaveTextContent('Not logging out');
    });

    expect(consoleSpy).toHaveBeenCalledWith('Logout error:', expect.any(Error));
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('accessToken');

    consoleSpy.mockRestore();
  });

  it('logs detailed error in development mode', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    mockAuthApi.refresh.mockRejectedValue({
      response: {
        status: 401,
        data: { error: 'Token expired' }
      }
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Not loading');
    });

    expect(consoleSpy).toHaveBeenCalledWith('Token refresh failed:', 401, 'Token expired');

    consoleSpy.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });

  it('does not log detailed error in production mode', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    mockAuthApi.refresh.mockRejectedValue({
      response: {
        status: 401,
        data: { error: 'Token expired' }
      }
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Not loading');
    });

    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });

  it('handles refresh error without response object', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    mockAuthApi.refresh.mockRejectedValue(new Error('Network error'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Not loading');
    });

    expect(screen.getByTestId('user')).toHaveTextContent('No user');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('accessToken');

    consoleSpy.mockRestore();
  });
});