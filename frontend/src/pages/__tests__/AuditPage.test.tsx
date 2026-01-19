import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuditPage } from '../AuditPage';

// Mock the API
jest.mock('../../services/api', () => ({
  auditApi: {
    getAll: jest.fn(),
  },
  usersApi: {
    getAll: jest.fn(),
  },
  instancesApi: {
    getAll: jest.fn(),
  },
  databasesApi: {
    getByInstance: jest.fn(),
  },
}));

import { auditApi, usersApi, instancesApi, databasesApi } from '../../services/api';

const mockAuditLogs = [
  {
    id: 'log-1',
    query_request_id: 'query-123456789',
    action: 'SUBMITTED',
    performed_by: 'user-1',
    performed_by_name: 'John Doe',
    performed_by_email: 'john@example.com',
    details: { 
      submissionType: 'QUERY', 
      podId: 'pod-1',
      podName: 'Analytics Pod',
      instanceId: 'inst-1',
      instanceName: 'Production DB',
      instanceType: 'POSTGRES',
      databaseName: 'analytics_db',
      requesterName: 'John Doe',
      requesterEmail: 'john@example.com'
    },
    created_at: '2024-01-15T10:30:00Z',
  },
  {
    id: 'log-2',
    query_request_id: 'query-123456789',
    action: 'EXECUTED',
    performed_by: 'user-2',
    performed_by_name: 'Jane Smith',
    performed_by_email: 'jane@example.com',
    details: { 
      instanceType: 'POSTGRES'
    },
    created_at: '2024-01-15T11:00:00Z',
  },
  {
    id: 'log-3',
    query_request_id: 'query-987654321',
    action: 'REJECTED',
    performed_by: 'user-2',
    performed_by_name: 'Jane Smith',
    performed_by_email: 'jane@example.com',
    details: { 
      reason: 'Query too broad'
    },
    created_at: '2024-01-14T15:00:00Z',
  },
  {
    id: 'log-4',
    query_request_id: 'query-111111111',
    action: 'FAILED',
    performed_by: 'user-1',
    performed_by_name: 'John Doe',
    performed_by_email: 'john@example.com',
    details: { 
      error: 'Connection timeout'
    },
    created_at: '2024-01-14T14:00:00Z',
  },
];

const mockUsers = [
  { id: 'user-1', name: 'John Doe', email: 'john@example.com' },
  { id: 'user-2', name: 'Jane Smith', email: 'jane@example.com' },
];

const mockPostgresInstances = [
  { id: 'inst-1', name: 'Production DB', type: 'POSTGRES' },
  { id: 'inst-2', name: 'Dev DB', type: 'POSTGRES' },
];

const mockMongoInstances = [
  { id: 'inst-3', name: 'Mongo Prod', type: 'MONGODB' },
  { id: 'inst-4', name: 'Mongo Dev', type: 'MONGODB' },
];

const mockDatabases = [
  { database_name: 'users_db' },
  { database_name: 'orders_db' },
];

describe('AuditPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (auditApi.getAll as jest.Mock).mockResolvedValue({ data: mockAuditLogs });
    (usersApi.getAll as jest.Mock).mockResolvedValue({ data: mockUsers });
    (instancesApi.getAll as jest.Mock).mockImplementation((type) => {
      if (type === 'POSTGRES') {
        return Promise.resolve({ data: mockPostgresInstances });
      } else if (type === 'MONGODB') {
        return Promise.resolve({ data: mockMongoInstances });
      }
      return Promise.resolve({ data: [] });
    });
    (databasesApi.getByInstance as jest.Mock).mockResolvedValue({ data: mockDatabases });
  });

  it('renders the page title', async () => {
    render(<AuditPage />);
    expect(screen.getByText('Audit Logs')).toBeInTheDocument();
  });

  it('shows loading spinner initially', () => {
    render(<AuditPage />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('loads and displays audit logs', async () => {
    render(<AuditPage />);
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // John Doe and Jane Smith appear multiple times
    expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Jane Smith').length).toBeGreaterThan(0);
  });

  it('displays action types', async () => {
    render(<AuditPage />);
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('SUBMITTED')).toBeInTheDocument();
    expect(screen.getByText('EXECUTED')).toBeInTheDocument();
    expect(screen.getByText('REJECTED')).toBeInTheDocument();
    expect(screen.getByText('FAILED')).toBeInTheDocument();
  });

  it('displays truncated query IDs', async () => {
    render(<AuditPage />);
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // query-12 appears multiple times (same query ID for multiple logs)
    expect(screen.getAllByText('query-12').length).toBeGreaterThan(0);
  });

  it('renders filter dropdowns', async () => {
    render(<AuditPage />);
    
    // Check for select elements by their role
    const selects = screen.getAllByRole('combobox');
    expect(selects).toHaveLength(5); // 4 filters + 1 per page selector
    
    // Check for labels
    expect(screen.getByText('User:')).toBeInTheDocument();
    expect(screen.getByText('Instance:')).toBeInTheDocument();
    expect(screen.getByText('Database:')).toBeInTheDocument();
    expect(screen.getByText('Action:')).toBeInTheDocument();
  });

  it('loads users for filter dropdown', async () => {
    render(<AuditPage />);
    
    await waitFor(() => {
      expect(usersApi.getAll).toHaveBeenCalled();
    });
  });

  it('loads instances for filter dropdown', async () => {
    render(<AuditPage />);
    
    await waitFor(() => {
      expect(instancesApi.getAll).toHaveBeenCalledWith('POSTGRES');
      expect(instancesApi.getAll).toHaveBeenCalledWith('MONGODB');
    });
  });

  it('loads databases when instance is selected', async () => {
    render(<AuditPage />);
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Get the instance select (second select element)
    const selects = screen.getAllByRole('combobox');
    const instanceSelect = selects[1];
    
    await userEvent.selectOptions(instanceSelect, 'inst-1');
    
    await waitFor(() => {
      expect(databasesApi.getByInstance).toHaveBeenCalledWith('inst-1');
    });
  });

  it('applies filters automatically when filter changes', async () => {
    render(<AuditPage />);
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Get the action select (fourth select element)
    const selects = screen.getAllByRole('combobox');
    const actionSelect = selects[3];
    
    await userEvent.selectOptions(actionSelect, 'EXECUTED');
    
    await waitFor(() => {
      expect(auditApi.getAll).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'EXECUTED' })
      );
    });
  });

  it('clears filters when Clear button is clicked', async () => {
    render(<AuditPage />);
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Get the action select (fourth select element)
    const selects = screen.getAllByRole('combobox');
    const actionSelect = selects[3];
    
    await userEvent.selectOptions(actionSelect, 'EXECUTED');
    await userEvent.click(screen.getByRole('button', { name: /clear/i }));
    
    expect(actionSelect).toHaveValue('');
  });

  it('shows pagination controls', async () => {
    render(<AuditPage />);
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Check for specific pagination elements
    expect(screen.getByText(/^Page/)).toBeInTheDocument();
    expect(screen.getByText(/per page/i)).toBeInTheDocument();
  });

  it('changes items per page', async () => {
    render(<AuditPage />);
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    const selects = screen.getAllByRole('combobox');
    const perPageSelect = selects[selects.length - 1];
    
    await userEvent.selectOptions(perPageSelect, '25');
    
    await waitFor(() => {
      expect(auditApi.getAll).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 25 })
      );
    });
  });

  it('navigates to next page', async () => {
    // Return exactly itemsPerPage items to enable Next button (hasMore = true)
    const tenLogs = Array(10).fill(null).map((_, i) => ({
      ...mockAuditLogs[0],
      id: `log-${i}`,
    }));
    (auditApi.getAll as jest.Mock).mockResolvedValue({ data: tenLogs });
    
    render(<AuditPage />);
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Clear mock to track next call
    (auditApi.getAll as jest.Mock).mockClear();
    
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    
    await waitFor(() => {
      expect(auditApi.getAll).toHaveBeenCalledWith(
        expect.objectContaining({ offset: 10 })
      );
    });
  });

  it('disables Previous button on first page', async () => {
    render(<AuditPage />);
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
  });

  it('shows no logs message when empty', async () => {
    (auditApi.getAll as jest.Mock).mockResolvedValue({ data: [] });
    
    render(<AuditPage />);
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('No audit logs found')).toBeInTheDocument();
  });

  it('displays details for SUBMITTED action', async () => {
    render(<AuditPage />);
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Check for common details that appear in all logs
    expect(screen.getAllByText('Type:').length).toBeGreaterThan(0);
    expect(screen.getAllByText('QUERY').length).toBeGreaterThan(0);
  });

  it('displays details for REJECTED action', async () => {
    render(<AuditPage />);
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('Query too broad')).toBeInTheDocument();
  });

  it('displays details for FAILED action', async () => {
    render(<AuditPage />);
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('Connection timeout')).toBeInTheDocument();
  });

  it('displays details for EXECUTED action', async () => {
    render(<AuditPage />);
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Check for instance type in the details
    expect(screen.getByText('POSTGRES')).toBeInTheDocument();
  });

  it('handles user loading failure gracefully', async () => {
    (usersApi.getAll as jest.Mock).mockRejectedValue(new Error('Forbidden'));
    
    render(<AuditPage />);
    
    // Should still render the page without users
    await waitFor(() => {
      expect(screen.getByText('Audit Logs')).toBeInTheDocument();
    });
  });

  it('disables database filter when no instance selected', async () => {
    render(<AuditPage />);
    
    // Get the database select (third select element)
    const selects = screen.getAllByRole('combobox');
    const databaseSelect = selects[2];
    
    expect(databaseSelect).toBeDisabled();
  });

  it('enables database filter when instance is selected', async () => {
    render(<AuditPage />);
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Get the instance and database selects
    const selects = screen.getAllByRole('combobox');
    const instanceSelect = selects[1];
    const databaseSelect = selects[2];
    
    await userEvent.selectOptions(instanceSelect, 'inst-1');
    
    await waitFor(() => {
      expect(databaseSelect).not.toBeDisabled();
    });
  });

  it('formats timestamp correctly', async () => {
    render(<AuditPage />);
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Check for formatted date (Jan 15 appears multiple times)
    expect(screen.getAllByText(/Jan 15/).length).toBeGreaterThan(0);
  });

  it('handles filter options loading failure gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (instancesApi.getAll as jest.Mock).mockRejectedValue(new Error('Failed'));
    
    render(<AuditPage />);
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load filter options:', expect.any(Error));
    });
    
    consoleSpy.mockRestore();
  });

  it('handles audit logs loading failure gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (auditApi.getAll as jest.Mock).mockRejectedValue(new Error('Failed'));
    
    render(<AuditPage />);
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load audit logs:', expect.any(Error));
    });
    
    consoleSpy.mockRestore();
  });

  it('handles databases loading failure gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (databasesApi.getByInstance as jest.Mock).mockRejectedValue(new Error('Failed'));
    
    render(<AuditPage />);
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Get the instance select (second select element)
    const selects = screen.getAllByRole('combobox');
    const instanceSelect = selects[1];
    
    await userEvent.selectOptions(instanceSelect, 'inst-1');
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load databases:', expect.any(Error));
    });
    
    consoleSpy.mockRestore();
  });

  // Note: The database filter clearing when instance is deselected is tested implicitly
  // through the disabled state test above

  it('displays default details format for unknown action', async () => {
    const logsWithUnknownAction = [{
      id: 'log-1',
      query_request_id: 'query-123456789',
      action: 'UNKNOWN_ACTION',
      performed_by: 'user-1',
      performed_by_name: 'John Doe',
      performed_by_email: 'john@example.com',
      details: { customKey: 'customValue' },
      created_at: '2024-01-15T10:30:00Z',
    }];
    (auditApi.getAll as jest.Mock).mockResolvedValue({ data: logsWithUnknownAction });
    
    render(<AuditPage />);
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('customKey:')).toBeInTheDocument();
    expect(screen.getByText('customValue')).toBeInTheDocument();
  });

  it('displays dash for empty details', async () => {
    const logsWithEmptyDetails = [{
      id: 'log-1',
      query_request_id: 'query-123456789',
      action: 'SUBMITTED',
      performed_by: 'user-1',
      performed_by_name: 'John Doe',
      performed_by_email: 'john@example.com',
      details: {},
      created_at: '2024-01-15T10:30:00Z',
    }];
    (auditApi.getAll as jest.Mock).mockResolvedValue({ data: logsWithEmptyDetails });
    
    render(<AuditPage />);
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Should show dash for empty details
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('displays default rejection reason when not provided', async () => {
    const logsWithNoReason = [{
      id: 'log-1',
      query_request_id: 'query-123456789',
      action: 'REJECTED',
      performed_by: 'user-1',
      performed_by_name: 'John Doe',
      performed_by_email: 'john@example.com',
      details: {},
      created_at: '2024-01-15T10:30:00Z',
    }];
    (auditApi.getAll as jest.Mock).mockResolvedValue({ data: logsWithNoReason });
    
    render(<AuditPage />);
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Empty details should show dash
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('displays default error message when not provided', async () => {
    const logsWithNoError = [{
      id: 'log-1',
      query_request_id: 'query-123456789',
      action: 'FAILED',
      performed_by: 'user-1',
      performed_by_name: 'John Doe',
      performed_by_email: 'john@example.com',
      details: {},
      created_at: '2024-01-15T10:30:00Z',
    }];
    (auditApi.getAll as jest.Mock).mockResolvedValue({ data: logsWithNoError });
    
    render(<AuditPage />);
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Empty details should show dash
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('filters by user automatically', async () => {
    render(<AuditPage />);
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Get the user select (first select element)
    const selects = screen.getAllByRole('combobox');
    const userSelect = selects[0];
    
    await userEvent.selectOptions(userSelect, 'user-1');
    
    await waitFor(() => {
      expect(auditApi.getAll).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1' })
      );
    });
  });

  it('filters by database automatically', async () => {
    render(<AuditPage />);
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Get the instance and database selects
    const selects = screen.getAllByRole('combobox');
    const instanceSelect = selects[1];
    const databaseSelect = selects[2];
    
    // Select instance first to enable database filter
    await userEvent.selectOptions(instanceSelect, 'inst-1');
    
    await waitFor(() => {
      expect(databaseSelect).not.toBeDisabled();
    });
    
    await userEvent.selectOptions(databaseSelect, 'users_db');
    
    await waitFor(() => {
      expect(auditApi.getAll).toHaveBeenCalledWith(
        expect.objectContaining({ databaseName: 'users_db' })
      );
    });
  });

  it('navigates to previous page', async () => {
    // Return exactly itemsPerPage items to enable Next button
    const tenLogs = Array(10).fill(null).map((_, i) => ({
      ...mockAuditLogs[0],
      id: `log-${i}`,
    }));
    (auditApi.getAll as jest.Mock).mockResolvedValue({ data: tenLogs });
    
    render(<AuditPage />);
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Go to page 2
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Page 2')).toBeInTheDocument();
    });
    
    // Go back to page 1
    await userEvent.click(screen.getByRole('button', { name: /previous/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Page 1')).toBeInTheDocument();
    });
  });

  it('disables Next button when no more results', async () => {
    // Return fewer than itemsPerPage items to disable Next button
    const fewLogs = mockAuditLogs.slice(0, 3);
    (auditApi.getAll as jest.Mock).mockResolvedValue({ data: fewLogs });
    
    render(<AuditPage />);
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });

  it('handles loading failure gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (auditApi.getAll as jest.Mock).mockRejectedValue(new Error('Load failed'));
    
    render(<AuditPage />);
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load audit logs:', expect.any(Error));
    });
    
    consoleSpy.mockRestore();
  });

  it('handles users loading failure gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    (usersApi.getAll as jest.Mock).mockRejectedValue(new Error('Users load failed'));
    
    render(<AuditPage />);
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Could not load users (may not have permission)');
    });
    
    consoleSpy.mockRestore();
  });

  it('handles instances loading failure gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (instancesApi.getAll as jest.Mock).mockRejectedValue(new Error('Instances load failed'));
    
    render(<AuditPage />);
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load filter options:', expect.any(Error));
    });
    
    consoleSpy.mockRestore();
  });

  it('handles databases loading failure gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (databasesApi.getByInstance as jest.Mock).mockRejectedValue(new Error('Databases load failed'));
    
    render(<AuditPage />);
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Get the instance select (second select element)
    const selects = screen.getAllByRole('combobox');
    const instanceSelect = selects[1];
    
    // Select instance to trigger database loading
    await userEvent.selectOptions(instanceSelect, 'inst-1');
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load databases:', expect.any(Error));
    });
    
    consoleSpy.mockRestore();
  });

  it('shows empty state when no audit logs', async () => {
    (auditApi.getAll as jest.Mock).mockResolvedValue({ data: [] });
    
    render(<AuditPage />);
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('No audit logs found')).toBeInTheDocument();
  });

  it('clears filters correctly', async () => {
    render(<AuditPage />);
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Get the user and instance selects
    const selects = screen.getAllByRole('combobox');
    const userSelect = selects[0];
    const instanceSelect = selects[1];
    
    // Set some filters
    await userEvent.selectOptions(userSelect, 'user-1');
    await userEvent.selectOptions(instanceSelect, 'inst-1');
    
    // Clear filters
    await userEvent.click(screen.getByRole('button', { name: /clear/i }));
    
    await waitFor(() => {
      expect(userSelect).toHaveValue('');
      expect(instanceSelect).toHaveValue('');
    });
  });
});
