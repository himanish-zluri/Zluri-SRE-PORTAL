import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ApprovalDashboardPage } from '../ApprovalDashboardPage';
import { queriesApi } from '../../services/api';

// Mock the API
jest.mock('../../services/api', () => ({
  queriesApi: {
    getForApproval: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
  },
}));

const mockQueriesApi = queriesApi as jest.Mocked<typeof queriesApi>;

// Mock components that aren't essential for these tests
jest.mock('../../components/ui/StatusBadge', () => ({
  StatusBadge: ({ status }: { status: string }) => <span data-testid="status-badge">{status}</span>
}));

jest.mock('../../components/ui/Button', () => ({
  Button: ({ children, onClick, variant, isLoading }: any) => (
    <button onClick={onClick} data-variant={variant} disabled={isLoading}>
      {isLoading ? 'Loading...' : children}
    </button>
  )
}));

jest.mock('../../components/ui/Modal', () => ({
  Modal: ({ isOpen, onClose, title, children }: any) => 
    isOpen ? (
      <div data-testid="modal">
        <h2>{title}</h2>
        <button onClick={onClose}>Close</button>
        {children}
      </div>
    ) : null
}));

jest.mock('../../components/ui/TextArea', () => ({
  TextArea: ({ value, onChange, placeholder }: any) => (
    <textarea 
      value={value} 
      onChange={onChange} 
      placeholder={placeholder}
      data-testid="textarea"
    />
  )
}));

jest.mock('../../components/ui/ResultDisplay', () => ({
  ResultDisplay: ({ result }: any) => (
    <div data-testid="result-display">{JSON.stringify(result)}</div>
  )
}));

const mockQueries = [
  {
    id: '1',
    requester_name: 'John Doe',
    requester_email: 'john@test.com',
    instance_name: 'Test Instance',
    database_name: 'test_db',
    submission_type: 'QUERY' as const,
    pod_id: 'pod-1',
    created_at: '2024-01-15T10:00:00Z',
    status: 'PENDING' as const,
    query_text: 'SELECT * FROM users',
    comments: 'Test query',
    execution_result: null,
    rejection_reason: null,
    script_content: null
  },
  {
    id: '2',
    requester_name: 'Jane Smith',
    requester_email: 'jane@test.com',
    instance_name: 'Test Instance 2',
    database_name: 'test_db2',
    submission_type: 'SCRIPT' as const,
    pod_id: 'pod-2',
    created_at: '2024-01-16T11:00:00Z',
    status: 'EXECUTED' as const,
    query_text: null,
    comments: 'Test script',
    execution_result: { rows: [{ id: 1, name: 'Test' }] },
    rejection_reason: null,
    script_content: 'console.log("test");'
  }
];

describe('ApprovalDashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQueriesApi.getForApproval.mockResolvedValue({
      data: {
        data: mockQueries,
        pagination: {
          total: 2,
          limit: 10,
          offset: 0,
          hasMore: false
        }
      }
    } as any);
  });

  it('renders the approval dashboard with queries', async () => {
    render(<ApprovalDashboardPage />);

    expect(screen.getByText('Approval Dashboard')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('shows loading spinner initially', () => {
    render(<ApprovalDashboardPage />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('displays status overview counters', async () => {
    render(<ApprovalDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/Pending: 1/)).toBeInTheDocument();
      expect(screen.getByText(/Executed: 1/)).toBeInTheDocument();
      expect(screen.getByText(/Failed: 0/)).toBeInTheDocument();
      expect(screen.getByText(/Rejected: 0/)).toBeInTheDocument();
    });
  });

  it('filters queries by status', async () => {
    render(<ApprovalDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Change status filter to EXECUTED - use the select element directly
    const statusSelects = screen.getAllByRole('combobox');
    const statusSelect = statusSelects[0]; // First select is status filter
    fireEvent.change(statusSelect, { target: { value: 'EXECUTED' } });

    await waitFor(() => {
      expect(mockQueriesApi.getForApproval).toHaveBeenCalledWith({
        status: 'EXECUTED',
        type: undefined,
        limit: 10,
        offset: 0
      });
    });
  });

  it('filters queries by type', async () => {
    render(<ApprovalDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Change type filter to SCRIPT - use the select element directly
    const selects = screen.getAllByRole('combobox');
    const typeSelect = selects[1]; // Second select is type filter
    fireEvent.change(typeSelect, { target: { value: 'SCRIPT' } });

    await waitFor(() => {
      expect(mockQueriesApi.getForApproval).toHaveBeenCalledWith({
        status: 'PENDING',
        type: 'SCRIPT',
        limit: 10,
        offset: 0
      });
    });
  });

  it('changes items per page', async () => {
    render(<ApprovalDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Change items per page to 25 - use the select element directly
    const selects = screen.getAllByRole('combobox');
    const itemsPerPageSelect = selects[2]; // Third select is items per page
    fireEvent.change(itemsPerPageSelect, { target: { value: '25' } });

    await waitFor(() => {
      expect(mockQueriesApi.getForApproval).toHaveBeenCalledWith({
        status: 'PENDING',
        type: undefined,
        limit: 25,
        offset: 0
      });
    });
  });

  it('opens detail modal when View Details is clicked', async () => {
    render(<ApprovalDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const viewDetailsButtons = screen.getAllByText('View Details');
    fireEvent.click(viewDetailsButtons[0]);

    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByText('Query Details')).toBeInTheDocument();
  });

  it('opens reject modal when Reject is clicked', async () => {
    render(<ApprovalDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const rejectButtons = screen.getAllByText('✗ Reject');
    fireEvent.click(rejectButtons[0]);

    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByText('Reject Query')).toBeInTheDocument();
  });

  it('shows no queries message when no data', async () => {
    mockQueriesApi.getForApproval.mockResolvedValue({
      data: {
        data: [],
        pagination: {
          total: 0,
          limit: 10,
          offset: 0,
          hasMore: false
        }
      }
    } as any);

    render(<ApprovalDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('No queries found')).toBeInTheDocument();
    });
  });

  it('displays pagination information', async () => {
    render(<ApprovalDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Showing 1 - 2 of 2')).toBeInTheDocument();
    });
  });

  it('handles API error gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockQueriesApi.getForApproval.mockRejectedValue(new Error('API Error'));

    render(<ApprovalDashboardPage />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load queries:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('displays query information correctly', async () => {
    render(<ApprovalDashboardPage />);

    await waitFor(() => {
      // Check first query (QUERY type)
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@test.com')).toBeInTheDocument();
      expect(screen.getByText('Test Instance')).toBeInTheDocument();
      expect(screen.getByText('test_db')).toBeInTheDocument();
      expect(screen.getByText('pod-1')).toBeInTheDocument();

      // Check second query (SCRIPT type)
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('jane@test.com')).toBeInTheDocument();
      expect(screen.getByText('Test Instance 2')).toBeInTheDocument();
      expect(screen.getByText('test_db2')).toBeInTheDocument();
      expect(screen.getByText('pod-2')).toBeInTheDocument();
    });
  });

  it('shows approve and reject buttons only for pending queries', async () => {
    render(<ApprovalDashboardPage />);

    await waitFor(() => {
      const approveButtons = screen.getAllByText('✓ Approve');
      const rejectButtons = screen.getAllByText('✗ Reject');
      
      // Only one pending query should have approve/reject buttons
      expect(approveButtons).toHaveLength(1);
      expect(rejectButtons).toHaveLength(1);
    });
  });

  it('formats dates correctly', async () => {
    render(<ApprovalDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Jan 15')).toBeInTheDocument();
      expect(screen.getByText('Jan 16')).toBeInTheDocument();
    });
  });

  it('displays submission type badges correctly', async () => {
    render(<ApprovalDashboardPage />);

    await waitFor(() => {
      const queryBadges = screen.getAllByText('QUERY');
      const scriptBadges = screen.getAllByText('SCRIPT');
      
      expect(queryBadges).toHaveLength(1);
      expect(scriptBadges).toHaveLength(1);
    });
  });

  it('closes modals when close button is clicked', async () => {
    render(<ApprovalDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Open detail modal
    const viewDetailsButtons = screen.getAllByText('View Details');
    fireEvent.click(viewDetailsButtons[0]);

    expect(screen.getByTestId('modal')).toBeInTheDocument();

    // Close modal
    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });
  });

  it('handles filter changes and resets pagination', async () => {
    render(<ApprovalDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Change status filter - should reset to page 1
    const selects = screen.getAllByRole('combobox');
    const statusSelect = selects[0]; // First select is status filter
    fireEvent.change(statusSelect, { target: { value: 'EXECUTED' } });

    await waitFor(() => {
      expect(mockQueriesApi.getForApproval).toHaveBeenCalledWith({
        status: 'EXECUTED',
        type: undefined,
        limit: 10,
        offset: 0 // Should be reset to 0 (page 1)
      });
    });
  });
});