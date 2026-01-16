import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LoginPage } from '../LoginPage';
import { ThemeProvider } from '../../context/ThemeContext';

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
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<div>Dashboard</div>} />
      </Routes>
    </MemoryRouter>
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
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
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
    const passwordInput = screen.getByLabelText(/password/i);
    
    await userEvent.type(passwordInput, 'password123');
    expect(passwordInput).toHaveValue('password123');
  });

  it('calls login function on form submit', async () => {
    mockLogin.mockResolvedValue(undefined);
    renderLoginPage();
    
    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
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
    await userEvent.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await userEvent.click(screen.getByRole('button', { name: /login/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('displays default error message when no message in response', async () => {
    mockLogin.mockRejectedValue(new Error('Network error'));
    renderLoginPage();
    
    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password');
    await userEvent.click(screen.getByRole('button', { name: /login/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
    });
  });

  it('shows loading state during login', async () => {
    mockLogin.mockImplementation(() => new Promise(() => {})); // Never resolves
    renderLoginPage();
    
    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password');
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

  it('has required attribute on email and password inputs', () => {
    renderLoginPage();
    
    expect(screen.getByLabelText(/email/i)).toBeRequired();
    expect(screen.getByLabelText(/password/i)).toBeRequired();
  });

  it('email input has correct type', () => {
    renderLoginPage();
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('type', 'email');
  });

  it('password input has correct type', () => {
    renderLoginPage();
    expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password');
  });
});
