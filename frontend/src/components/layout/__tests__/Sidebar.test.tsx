import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '../Sidebar';

// Mock useAuth hook
const mockUseAuth = jest.fn();
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const renderSidebar = (initialRoute = '/dashboard') => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Sidebar />
    </MemoryRouter>
  );
};

describe('Sidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the logo and app name', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'DEVELOPER' } });
    renderSidebar();
    
    expect(screen.getByText('DB')).toBeInTheDocument();
    expect(screen.getByText('Query Portal')).toBeInTheDocument();
  });

  describe('navigation items based on role', () => {
    it('shows only Dashboard and My Submissions for DEVELOPER', () => {
      mockUseAuth.mockReturnValue({ user: { role: 'DEVELOPER' } });
      renderSidebar();
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('My Submissions')).toBeInTheDocument();
      expect(screen.queryByText('Approval Dashboard')).not.toBeInTheDocument();
      expect(screen.queryByText('Audit Logs')).not.toBeInTheDocument();
    });

    it('shows Dashboard, Approval Dashboard, and My Submissions for MANAGER', () => {
      mockUseAuth.mockReturnValue({ user: { role: 'MANAGER' } });
      renderSidebar();
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Approval Dashboard')).toBeInTheDocument();
      expect(screen.getByText('My Submissions')).toBeInTheDocument();
      expect(screen.queryByText('Audit Logs')).not.toBeInTheDocument();
    });

    it('shows all navigation items for ADMIN', () => {
      mockUseAuth.mockReturnValue({ user: { role: 'ADMIN' } });
      renderSidebar();
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Approval Dashboard')).toBeInTheDocument();
      expect(screen.getByText('My Submissions')).toBeInTheDocument();
      expect(screen.getByText('Audit Logs')).toBeInTheDocument();
    });

    it('shows no items when user has no role', () => {
      mockUseAuth.mockReturnValue({ user: null });
      renderSidebar();
      
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
      expect(screen.queryByText('Approval Dashboard')).not.toBeInTheDocument();
      expect(screen.queryByText('My Submissions')).not.toBeInTheDocument();
      expect(screen.queryByText('Audit Logs')).not.toBeInTheDocument();
    });
  });

  it('renders navigation links with correct paths', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'ADMIN' } });
    renderSidebar();
    
    // Use more specific patterns to avoid matching multiple elements
    expect(screen.getByRole('link', { name: /^📊\s*Dashboard$/i })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: /Approval Dashboard/i })).toHaveAttribute('href', '/approval');
    expect(screen.getByRole('link', { name: /My Submissions/i })).toHaveAttribute('href', '/submissions');
    expect(screen.getByRole('link', { name: /Audit Logs/i })).toHaveAttribute('href', '/audit');
  });

  it('renders icons for each navigation item', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'ADMIN' } });
    renderSidebar();
    
    expect(screen.getByText('📊')).toBeInTheDocument();
    expect(screen.getByText('✅')).toBeInTheDocument();
    expect(screen.getByText('📝')).toBeInTheDocument();
    expect(screen.getByText('📋')).toBeInTheDocument();
  });

  it('applies active styling to current route', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'ADMIN' } });
    renderSidebar('/dashboard');
    
    // Use exact match to avoid matching "Approval Dashboard"
    const dashboardLink = screen.getByRole('link', { name: /^📊\s*Dashboard$/i });
    expect(dashboardLink).toHaveClass('bg-blue-600', 'text-white');
  });

  it('applies inactive styling to non-current routes', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'ADMIN' } });
    renderSidebar('/dashboard');
    
    const auditLink = screen.getByRole('link', { name: /Audit Logs/i });
    expect(auditLink).toHaveClass('text-gray-600');
    expect(auditLink).not.toHaveClass('bg-blue-600');
  });
});
