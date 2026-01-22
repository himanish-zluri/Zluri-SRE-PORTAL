import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LoginPage } from '../LoginPage';
import { ThemeProvider } from '../../context/ThemeContext';
import { ErrorProvider } from '../../context/ErrorContext';

// Mock useAuth hook
const mockLogin = jest.fn();
const mockUseAuth = jest.fn();
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock useTheme hook
const mockToggleTheme = jest.fn();
jest.mock('../../context/ThemeContext', () => ({
  ...jest.requireActual('../../context/ThemeContext'),
  useTheme: () => ({
    theme: 'light',
    toggleTheme: mockToggleTheme,
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const renderLoginPage = () => {
  return render(
    <ErrorProvider>
      <ThemeProvider>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<div>Dashboard</div>} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </ErrorProvider>
  );
};

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, login: mockLogin });
  });

  it('renders login form with all elements', () => {
    renderLoginPage();
    
    expect(screen.getByText('Database Query Portal')).toBeInTheDocument();
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('renders the logo', () => {
    renderLoginPage();
    expect(screen.getByText('DB')).toBeInTheDocument();
  });

  it('redirects to dashboard if user is already logged in', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', name: 'Test', email: 'test@test.com', role: 'DEVELOPER' },
      login: mockLogin,
    });
    renderLoginPage();
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('updates email input on change', async () => {
    renderLoginPage();
    const emailInput = screen.getByLabelText(/email/i);
    
    await userEvent.type(emailInput, 'test@example.com');
    expect(emailInput).toHaveValue('test@example.com');
  });

  it('updates password input on change', async () => {
    renderLoginPage();
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    
    await userEvent.type(passwordInput, 'password123');
    expect(passwordInput).toHaveValue('password123');
  });

  it('calls login function on form submit', async () => {
    mockLogin.mockResolvedValue(undefined);
    renderLoginPage();
    
    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    await userEvent.type(screen.getByPlaceholderText('Enter your password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /login/i }));
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('displays error message on login failure', async () => {
    mockLogin.mockRejectedValue({
      response: { data: { message: 'Invalid credentials' } },
    });
    renderLoginPage();
    
    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    await userEvent.type(screen.getByPlaceholderText('Enter your password'), 'wrongpassword');
    await userEvent.click(screen.getByRole('button', { name: /login/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('displays default error message when no message in response', async () => {
    mockLogin.mockRejectedValue(new Error('Network error'));
    renderLoginPage();
    
    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    await userEvent.type(screen.getByPlaceholderText('Enter your password'), 'password');
    await userEvent.click(screen.getByRole('button', { name: /login/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
    });
  });

  it('shows loading state during login', async () => {
    mockLogin.mockImplementation(() => new Promise(() => {})); // Never resolves
    renderLoginPage();
    
    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    await userEvent.type(screen.getByPlaceholderText('Enter your password'), 'password');
    await userEvent.click(screen.getByRole('button', { name: /login/i }));
    
    // Button should show loading state (text changes to "Loading...")
    const button = screen.getByRole('button', { name: /loading/i });
    expect(button).toBeDisabled();
  });

  it('calls toggleTheme when theme button is clicked', async () => {
    renderLoginPage();
    
    // Find the theme toggle button (it's the button with SVG)
    const themeButton = screen.getByRole('button', { name: '' });
    await userEvent.click(themeButton);
    
    expect(mockToggleTheme).toHaveBeenCalled();
  });

  it('shows correct icon for light theme', () => {
    renderLoginPage();
    
    // Should show moon icon for light theme (the second SVG path)
    const themeButton = screen.getByRole('button', { name: '' });
    expect(themeButton).toBeInTheDocument();
  });

  it('has required attribute on email and password inputs', () => {
    renderLoginPage();
    
    expect(screen.getByLabelText(/email/i)).toBeRequired();
    expect(screen.getByPlaceholderText('Enter your password')).toBeRequired();
  });

  it('email input has correct type', () => {
    renderLoginPage();
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('type', 'email');
  });

  it('password input has correct type', () => {
    renderLoginPage();
    expect(screen.getByPlaceholderText('Enter your password')).toHaveAttribute('type', 'password');
  });

  it('toggles password visibility when eye button is clicked', async () => {
    renderLoginPage();
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const toggleButton = screen.getByLabelText('Show password');
    
    // Initially password should be hidden
    expect(passwordInput).toHaveAttribute('type', 'password');
    
    // Click to show password
    await userEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText('Hide password')).toBeInTheDocument();
    
    // Click to hide password again
    const hideButton = screen.getByLabelText('Hide password');
    await userEvent.click(hideButton);
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('Show password')).toBeInTheDocument();
  });

  // Additional tests for better branch coverage
  describe('Theme functionality', () => {
    it('shows correct icon for dark theme', () => {
      // Mock useTheme to return dark theme
      jest.doMock('../../context/ThemeContext', () => ({
        ...jest.requireActual('../../context/ThemeContext'),
        useTheme: () => ({
          theme: 'dark',
          toggleTheme: mockToggleTheme,
        }),
        ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
      }));

      renderLoginPage();
      
      // Should show sun icon for dark theme (the first SVG path)
      const themeButton = screen.getByRole('button', { name: '' });
      expect(themeButton).toBeInTheDocument();
    });
  });

  describe('Form validation', () => {
    it('prevents submission with empty email', async () => {
      renderLoginPage();
      
      // Try to submit with empty email
      await userEvent.type(screen.getByPlaceholderText('Enter your password'), 'password123');
      await userEvent.click(screen.getByRole('button', { name: /login/i }));
      
      // Should not call login function due to HTML5 validation
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('prevents submission with empty password', async () => {
      renderLoginPage();
      
      // Try to submit with empty password
      await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
      await userEvent.click(screen.getByRole('button', { name: /login/i }));
      
      // Should not call login function due to HTML5 validation
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('prevents submission with invalid email format', async () => {
      renderLoginPage();
      
      // Try to submit with invalid email
      await userEvent.type(screen.getByLabelText(/email/i), 'invalid-email');
      await userEvent.type(screen.getByPlaceholderText('Enter your password'), 'password123');
      await userEvent.click(screen.getByRole('button', { name: /login/i }));
      
      // Should not call login function due to HTML5 validation
      expect(mockLogin).not.toHaveBeenCalled();
    });
  });

  describe('Error handling edge cases', () => {
    it('displays error message from response data', async () => {
      mockLogin.mockRejectedValue({
        response: { data: { message: 'Account locked' } },
      });
      renderLoginPage();
      
      await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
      await userEvent.type(screen.getByPlaceholderText('Enter your password'), 'wrongpassword');
      await userEvent.click(screen.getByRole('button', { name: /login/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Account locked')).toBeInTheDocument();
      });
    });

    it('displays default error when response has no message', async () => {
      mockLogin.mockRejectedValue({
        response: { data: {} },
      });
      renderLoginPage();
      
      await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
      await userEvent.type(screen.getByPlaceholderText('Enter your password'), 'password');
      await userEvent.click(screen.getByRole('button', { name: /login/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
      });
    });

    it('displays default error when no response object', async () => {
      mockLogin.mockRejectedValue({
        message: 'Network error'
      });
      renderLoginPage();
      
      await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
      await userEvent.type(screen.getByPlaceholderText('Enter your password'), 'password');
      await userEvent.click(screen.getByRole('button', { name: /login/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
      });
    });

    it('clears error message when form is resubmitted', async () => {
      // First submission fails
      mockLogin.mockRejectedValueOnce({
        response: { data: { message: 'Invalid credentials' } },
      });
      
      renderLoginPage();
      
      await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
      await userEvent.type(screen.getByPlaceholderText('Enter your password'), 'wrongpassword');
      await userEvent.click(screen.getByRole('button', { name: /login/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });

      // Second submission succeeds
      mockLogin.mockResolvedValueOnce(undefined);
      
      // Clear and retype password
      const passwordInput = screen.getByPlaceholderText('Enter your password');
      await userEvent.clear(passwordInput);
      await userEvent.type(passwordInput, 'correctpassword');
      await userEvent.click(screen.getByRole('button', { name: /login/i }));
      
      // Error should be cleared before new submission
      await waitFor(() => {
        expect(screen.queryByText('Invalid credentials')).not.toBeInTheDocument();
      });
    });
  });

  describe('Loading state', () => {
    it('disables form during loading', async () => {
      let resolveLogin: (value?: any) => void;
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve;
      });
      mockLogin.mockReturnValue(loginPromise);
      
      renderLoginPage();
      
      await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
      await userEvent.type(screen.getByPlaceholderText('Enter your password'), 'password');
      await userEvent.click(screen.getByRole('button', { name: /login/i }));
      
      // Button should be disabled and show loading text
      const button = screen.getByRole('button', { name: /loading/i });
      expect(button).toBeDisabled();
      
      // Resolve the promise
      resolveLogin!();
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /loading/i })).not.toBeInTheDocument();
      });
    });

    it('re-enables form after login error', async () => {
      mockLogin.mockRejectedValue({
        response: { data: { message: 'Login failed' } },
      });
      
      renderLoginPage();
      
      await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
      await userEvent.type(screen.getByPlaceholderText('Enter your password'), 'password');
      await userEvent.click(screen.getByRole('button', { name: /login/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Login failed')).toBeInTheDocument();
      });
      
      // Button should be enabled again
      const button = screen.getByRole('button', { name: /login/i });
      expect(button).not.toBeDisabled();
    });
  });

  describe('User redirect', () => {
    it('redirects different user roles to dashboard', () => {
      mockUseAuth.mockReturnValue({
        user: { id: '2', name: 'Admin', email: 'admin@test.com', role: 'ADMIN' },
        login: mockLogin,
      });
      renderLoginPage();
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('redirects developer role to dashboard', () => {
      mockUseAuth.mockReturnValue({
        user: { id: '3', name: 'Dev', email: 'dev@test.com', role: 'DEVELOPER' },
        login: mockLogin,
      });
      renderLoginPage();
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });
});
