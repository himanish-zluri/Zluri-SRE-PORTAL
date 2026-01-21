import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from '../Header';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { useError } from '../../../context/ErrorContext';

// Mock the contexts
jest.mock('../../../context/AuthContext');
jest.mock('../../../context/ThemeContext');
jest.mock('../../../context/ErrorContext');

const mockLogout = jest.fn();
const mockToggleTheme = jest.fn();
const mockShowSuccess = jest.fn();

describe('Header', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      user: { name: 'Test User', role: 'DEVELOPER' },
      logout: mockLogout,
      isLoggingOut: false,
    });
    (useTheme as jest.Mock).mockReturnValue({
      theme: 'dark',
      toggleTheme: mockToggleTheme,
    });
    (useError as jest.Mock).mockReturnValue({
      showSuccess: mockShowSuccess,
    });
  });

  it('renders the header title', () => {
    render(<Header />);
    expect(screen.getByText('Zluri SRE Internal Portal')).toBeInTheDocument();
  });

  it('displays user name and role', () => {
    render(<Header />);
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('DEVELOPER')).toBeInTheDocument();
  });

  it('displays user initial in avatar', () => {
    render(<Header />);
    expect(screen.getByText('T')).toBeInTheDocument();
  });

  it('calls logout when logout button is clicked', async () => {
    render(<Header />);
    fireEvent.click(screen.getByText('Logout'));
    expect(mockLogout).toHaveBeenCalledTimes(1);
    // Note: showSuccess will be called after logout completes
  });

  it('calls toggleTheme when theme button is clicked', () => {
    render(<Header />);
    const themeButton = screen.getByTitle('Switch to light mode');
    fireEvent.click(themeButton);
    expect(mockToggleTheme).toHaveBeenCalledTimes(1);
  });

  it('shows sun icon in dark mode', () => {
    render(<Header />);
    expect(screen.getByTitle('Switch to light mode')).toBeInTheDocument();
  });

  it('shows moon icon in light mode', () => {
    (useTheme as jest.Mock).mockReturnValue({
      theme: 'light',
      toggleTheme: mockToggleTheme,
    });
    render(<Header />);
    expect(screen.getByTitle('Switch to dark mode')).toBeInTheDocument();
  });

  it('handles user with no name gracefully', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { role: 'ADMIN' },
      logout: mockLogout,
      isLoggingOut: false,
    });
    render(<Header />);
    // Should not crash
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
  });

  it('shows loading state when logging out', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { name: 'Test User', role: 'DEVELOPER' },
      logout: mockLogout,
      isLoggingOut: true,
    });
    render(<Header />);
    expect(screen.getByText('Logging out...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logging out/i })).toBeDisabled();
  });

  it('shows normal logout button when not logging out', () => {
    render(<Header />);
    expect(screen.getByText('Logout')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logout/i })).not.toBeDisabled();
  });
});
