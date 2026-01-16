import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from '../Header';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';

// Mock the contexts
jest.mock('../../../context/AuthContext');
jest.mock('../../../context/ThemeContext');

const mockLogout = jest.fn();
const mockToggleTheme = jest.fn();

describe('Header', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      user: { name: 'Test User', role: 'DEVELOPER' },
      logout: mockLogout,
    });
    (useTheme as jest.Mock).mockReturnValue({
      theme: 'dark',
      toggleTheme: mockToggleTheme,
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

  it('calls logout when logout button is clicked', () => {
    render(<Header />);
    fireEvent.click(screen.getByText('Logout'));
    expect(mockLogout).toHaveBeenCalledTimes(1);
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
    });
    render(<Header />);
    // Should not crash
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
  });
});
