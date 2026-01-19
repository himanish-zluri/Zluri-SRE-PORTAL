import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { AuditPage } from '../AuditPage';
import { auditApi, usersApi, instancesApi, databasesApi } from '../../services/api';

// Mock the APIs
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

// Mock the QueryDetailsModal
jest.mock('../../components/ui/QueryDetailsModal', () => ({
  QueryDetailsModal: ({ isOpen, onClose }: any) => 
    isOpen ? (
      <div data-testid="query-details-modal">
        <button onClick={onClose}>Close Modal</button>
      </div>
    ) : null
}));

// Mock Button component
jest.mock('../../components/ui/Button', () => ({
  Button: ({ children, onClick, variant, size, disabled }: any) => (
    <button onClick={onClick} data-variant={variant} data-size={size} disabled={disabled}>
      {children}
    </button>
  )
}));

const mockAuditApi = auditApi as jest.Mocked<typeof auditApi>;
const mockUsersApi = usersApi as jest.Mocked<typeof usersApi>;
const mockInstancesApi = instancesApi as jest.Mocked<typeof instancesApi>;
const mockDatabasesApi = databasesApi as jest.Mocked<typeof databasesApi>;

const mockAuditLogs = [
  {
    id: '1',
    action: 'SUBMITTED',
    performed_by_name: 'John Doe',
    performed_by_email: 'john@test.com',
    query_request_id: 'query-123',
    created_at: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    action: 'EXECUTED',
    performed_by_name: 'Jane Smith',
    performed_by_email: 'jane@test.com',
    query_request_id: 'query-456',
    created_at: '2024-01-16T11:00:00Z',
  },
];

const mockUsers = [
  { id: '1', name: 'John Doe', email: 'john@test.com' },
  { id: '2', name: 'Jane Smith', email: 'jane@test.com' },
];

const mockInstances = [
  { id: '1', name: 'PostgreSQL Instance', type: 'POSTGRES' },
  { id: '2', name: 'MongoDB Instance', type: 'MONGODB' },
];

// Use fake timers for debouncing tests
jest.useFakeTimers();

describe('AuditPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    
    // Setup default mocks
    mockAuditApi.getAll.mockResolvedValue({ data: mockAuditLogs } as any);
    mockUsersApi.getAll.mockResolvedValue({ data: mockUsers } as any);
    mockInstancesApi.getAll.mockResolvedValue({ data: mockInstances } as any);
    mockDatabasesApi.getByInstance.mockResolvedValue({ 
      data: [{ database_name: 'test_db' }] 
    } as any);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders audit logs page', async () => {
    render(<AuditPage />);
    
    expect(screen.getByText('Audit Logs')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('displays action overview counters', async () => {
    render(<AuditPage />);

    await waitFor(() => {
      expect(screen.getByText(/Submitted: 1/)).toBeInTheDocument();
      expect(screen.getByText(/Executed: 1/)).toBeInTheDocument();
      expect(screen.getByText(/Failed: 0/)).toBeInTheDocument();
      expect(screen.getByText(/Rejected: 0/)).toBeInTheDocument();
    });
  });

  it('implements debounced search correctly', async () => {
    render(<AuditPage />);

    // Wait for initial load
    await waitFor(() => {
      expect(mockAuditApi.getAll).toHaveBeenCalledTimes(1);
    });

    const searchInput = screen.getByPlaceholderText('Search by query ID...');
    
    // Type rapidly - should not trigger API calls immediately
    fireEvent.change(searchInput, { target: { value: 'q' } });
    fireEvent.change(searchInput, { target: { value: 'qu' } });
    fireEvent.change(searchInput, { target: { value: 'que' } });
    fireEvent.change(searchInput, { target: { value: 'quer' } });
    fireEvent.change(searchInput, { target: { value: 'query' } });

    // Should still be only the initial call
    expect(mockAuditApi.getAll).toHaveBeenCalledTimes(1);

    // Fast-forward time by 499ms (just before debounce delay)
    act(() => {
      jest.advanceTimersByTime(499);
    });

    // Should still be only the initial call
    expect(mockAuditApi.getAll).toHaveBeenCalledTimes(1);

    // Fast-forward time by 1ms more (completing the 500ms delay)
    act(() => {
      jest.advanceTimersByTime(1);
    });

    // Now should have made the debounced API call
    await waitFor(() => {
      expect(mockAuditApi.getAll).toHaveBeenCalledTimes(2);
      expect(mockAuditApi.getAll).toHaveBeenLastCalledWith({
        limit: 10,
        offset: 0,
        querySearch: 'query',
      });
    });
  });

  it('resets page to 1 when search changes', async () => {
    // Mock more data to enable pagination
    const moreAuditLogs = [
      ...mockAuditLogs,
      ...Array.from({ length: 15 }, (_, i) => ({
        id: `${i + 3}`,
        action: 'SUBMITTED',
        performed_by_name: `User ${i + 3}`,
        performed_by_email: `user${i + 3}@test.com`,
        query_request_id: `query-${i + 3}`,
        created_at: '2024-01-17T12:00:00Z',
      }))
    ];
    
    mockAuditApi.getAll.mockResolvedValue({ data: moreAuditLogs } as any);
    
    render(<AuditPage />);

    // Wait for initial load
    await waitFor(() => {
      expect(mockAuditApi.getAll).toHaveBeenCalledTimes(1);
    });

    // Go to page 2 first
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(mockAuditApi.getAll).toHaveBeenCalledWith({
        limit: 10,
        offset: 10, // Page 2
      });
    });

    // Now search for something
    const searchInput = screen.getByPlaceholderText('Search by query ID...');
    fireEvent.change(searchInput, { target: { value: 'test-query' } });

    // Fast-forward debounce delay
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Should reset to page 1 (offset: 0)
    await waitFor(() => {
      expect(mockAuditApi.getAll).toHaveBeenLastCalledWith({
        limit: 10,
        offset: 0, // Back to page 1
        querySearch: 'test-query',
      });
    });
  });

  it('handles filter changes correctly', async () => {
    render(<AuditPage />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Change action filter
    const actionSelect = screen.getByDisplayValue('All actions');
    fireEvent.change(actionSelect, { target: { value: 'EXECUTED' } });

    await waitFor(() => {
      expect(mockAuditApi.getAll).toHaveBeenLastCalledWith({
        limit: 10,
        offset: 0,
        action: 'EXECUTED',
      });
    });
  });

  it('opens query details modal when View Details is clicked', async () => {
    render(<AuditPage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const viewDetailsButtons = screen.getAllByText('View Details');
    fireEvent.click(viewDetailsButtons[0]);

    expect(screen.getByTestId('query-details-modal')).toBeInTheDocument();
  });

  it('closes query details modal', async () => {
    render(<AuditPage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Open modal
    const viewDetailsButtons = screen.getAllByText('View Details');
    fireEvent.click(viewDetailsButtons[0]);

    expect(screen.getByTestId('query-details-modal')).toBeInTheDocument();

    // Close modal
    const closeButton = screen.getByText('Close Modal');
    fireEvent.click(closeButton);

    expect(screen.queryByTestId('query-details-modal')).not.toBeInTheDocument();
  });

  it('clears all filters when Clear Filters is clicked', async () => {
    render(<AuditPage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Set some filters
    const searchInput = screen.getByPlaceholderText('Search by query ID...');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    const actionSelect = screen.getByDisplayValue('All actions');
    fireEvent.change(actionSelect, { target: { value: 'EXECUTED' } });

    // Fast-forward debounce
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Clear filters
    const clearButton = screen.getByText('Clear Filters');
    fireEvent.click(clearButton);

    // Check that inputs are cleared
    expect(searchInput).toHaveValue('');
    expect(actionSelect).toHaveValue('');
  });

  it('handles API errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockAuditApi.getAll.mockRejectedValue(new Error('API Error'));

    render(<AuditPage />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load audit logs:', expect.any(Error));
    });

    expect(screen.getByText('No audit logs found')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('formats dates correctly', async () => {
    render(<AuditPage />);

    await waitFor(() => {
      // Check the actual formatted dates from the component
      expect(screen.getByText('Jan 15, 03:30 PM')).toBeInTheDocument();
      expect(screen.getByText('Jan 16, 04:30 PM')).toBeInTheDocument();
    });
  });

  it('displays truncated query IDs', async () => {
    render(<AuditPage />);

    await waitFor(() => {
      expect(screen.getByText('query-12')).toBeInTheDocument(); // First 8 chars
      expect(screen.getByText('query-45')).toBeInTheDocument(); // First 8 chars
    });
  });

  it('changes items per page correctly', async () => {
    render(<AuditPage />);

    await waitFor(() => {
      expect(mockAuditApi.getAll).toHaveBeenCalledWith({
        limit: 10,
        offset: 0,
      });
    });

    const itemsPerPageSelect = screen.getByDisplayValue('10');
    fireEvent.change(itemsPerPageSelect, { target: { value: '25' } });

    await waitFor(() => {
      expect(mockAuditApi.getAll).toHaveBeenLastCalledWith({
        limit: 25,
        offset: 0,
      });
    });
  });
});