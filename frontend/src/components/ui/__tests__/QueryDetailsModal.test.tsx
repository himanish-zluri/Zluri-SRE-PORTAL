import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryDetailsModal } from '../QueryDetailsModal';

// Mock the API
jest.mock('../../../services/api');

import { queriesApi } from '../../../services/api';

// Cast to jest.Mock for TypeScript
const mockQueriesApi = queriesApi as jest.Mocked<typeof queriesApi>;

const mockQuery = {
  id: 'query-123456789',
  requester_id: 'user-1',
  requester_name: 'John Doe',
  requester_email: 'john@example.com',
  pod_id: 'pod-1',
  pod_manager_name: 'Jane Smith',
  instance_id: 'inst-1',
  instance_name: 'Production DB',
  database_name: 'analytics_db',
  submission_type: 'QUERY' as const,
  query_text: 'SELECT * FROM users WHERE active = true',
  script_content: undefined,
  comments: 'Need to check active users for monthly report',
  status: 'EXECUTED' as const,
  approved_by: 'user-2',
  rejection_reason: undefined,
  execution_result: {
    rows: [
      { id: 1, name: 'John', active: true },
      { id: 2, name: 'Jane', active: true }
    ]
  },
  created_at: '2024-01-15T10:30:00Z',
  updated_at: '2024-01-15T11:00:00Z',
};

const mockScriptQuery = {
  ...mockQuery,
  id: 'query-987654321',
  submission_type: 'SCRIPT' as const,
  query_text: '',
  script_content: 'db.users.find({ active: true })',
  status: 'FAILED' as const,
  execution_result: {
    stderr: 'Connection timeout',
    stdout: ''
  }
};

const mockRejectedQuery = {
  ...mockQuery,
  id: 'query-111111111',
  status: 'REJECTED' as const,
  rejection_reason: 'Query too broad, please add more specific filters',
  execution_result: undefined
};

describe('QueryDetailsModal', () => {
  const defaultProps = {
    queryId: 'query-123456789',
    isOpen: true,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to default successful response
    (mockQueriesApi.getById as any).mockResolvedValue({ data: mockQuery });
  });

  it('does not render when closed', () => {
    render(<QueryDetailsModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Query Details')).not.toBeInTheDocument();
  });

  it('shows loading spinner initially', () => {
    render(<QueryDetailsModal {...defaultProps} />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('loads and displays query details', async () => {
    // Ensure mock is set up correctly
    (mockQueriesApi.getById as any).mockResolvedValue({ data: mockQuery });
    
    render(<QueryDetailsModal {...defaultProps} />);
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Debug: check if error is shown
    const errorElement = screen.queryByText('Failed to load query details');
    if (errorElement) {
      console.log('Error shown, API call failed');
      console.log('Mock calls:', mockQueriesApi.getById.mock.calls);
    }
    
    expect(screen.getByText('Query Details')).toBeInTheDocument();
    expect(screen.getByText('query-123456789')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('analytics_db')).toBeInTheDocument();
    expect(screen.getByText('Production DB')).toBeInTheDocument();
    expect(screen.getByText('EXECUTED')).toBeInTheDocument();
  });

  it('displays query text for QUERY submission type', async () => {
    render(<QueryDetailsModal {...defaultProps} />);
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('Query Text')).toBeInTheDocument();
    expect(screen.getByText('SELECT * FROM users WHERE active = true')).toBeInTheDocument();
  });

  it('displays script content for SCRIPT submission type', async () => {
    (mockQueriesApi.getById as any).mockResolvedValue({ data: mockScriptQuery });
    
    render(<QueryDetailsModal {...defaultProps} queryId="query-987654321" />);
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('Script Content')).toBeInTheDocument();
    expect(screen.getByText('db.users.find({ active: true })')).toBeInTheDocument();
  });

  it('displays comments when present', async () => {
    render(<QueryDetailsModal {...defaultProps} />);
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('Comments')).toBeInTheDocument();
    expect(screen.getByText('Need to check active users for monthly report')).toBeInTheDocument();
  });

  it('displays execution result for successful queries', async () => {
    render(<QueryDetailsModal {...defaultProps} />);
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('Execution Result')).toBeInTheDocument();
    expect(screen.getByText('2 rows returned')).toBeInTheDocument();
  });

  it('displays error details for failed queries', async () => {
    (queriesApi.getById as jest.Mock).mockResolvedValue({ data: mockScriptQuery });
    
    render(<QueryDetailsModal {...defaultProps} queryId="query-987654321" />);
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('Error Details')).toBeInTheDocument();
    expect(screen.getByText('Error Output:')).toBeInTheDocument();
    expect(screen.getByText('Connection timeout')).toBeInTheDocument();
  });

  it('displays rejection reason for rejected queries', async () => {
    (queriesApi.getById as jest.Mock).mockResolvedValue({ data: mockRejectedQuery });
    
    render(<QueryDetailsModal {...defaultProps} queryId="query-111111111" />);
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('Rejection Reason')).toBeInTheDocument();
    expect(screen.getByText('Query too broad, please add more specific filters')).toBeInTheDocument();
  });

  it('displays status with correct styling', async () => {
    render(<QueryDetailsModal {...defaultProps} />);
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    const statusElement = screen.getByText('EXECUTED');
    expect(statusElement).toHaveClass('text-green-600');
  });

  it('formats dates correctly', async () => {
    render(<QueryDetailsModal {...defaultProps} />);
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Check that the date is formatted (exact format may vary by locale)
    expect(screen.getByText(/Jan 15, 2024/)).toBeInTheDocument();
  });

  it('handles API error gracefully', async () => {
    (queriesApi.getById as jest.Mock).mockRejectedValue(new Error('Not found'));
    
    render(<QueryDetailsModal {...defaultProps} />);
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('Failed to load query details')).toBeInTheDocument();
  });

  it('handles API error with response message', async () => {
    const error = {
      response: {
        data: {
          message: 'Query not found'
        }
      }
    };
    (queriesApi.getById as jest.Mock).mockRejectedValue(error);
    
    render(<QueryDetailsModal {...defaultProps} />);
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('Query not found')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = jest.fn();
    render(<QueryDetailsModal {...defaultProps} onClose={onClose} />);
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    await userEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when X button is clicked', async () => {
    const onClose = jest.fn();
    render(<QueryDetailsModal {...defaultProps} onClose={onClose} />);
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Find the X button (SVG close icon)
    const xButton = screen.getByRole('button', { name: '' }); // X button has no text
    await userEvent.click(xButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('reloads data when queryId changes', async () => {
    const { rerender } = render(<QueryDetailsModal {...defaultProps} />);
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    expect(queriesApi.getById).toHaveBeenCalledWith('query-123456789');
    
    // Change queryId
    rerender(<QueryDetailsModal {...defaultProps} queryId="query-987654321" />);
    
    await waitFor(() => {
      expect(queriesApi.getById).toHaveBeenCalledWith('query-987654321');
    });
    
    expect(queriesApi.getById).toHaveBeenCalledTimes(2);
  });

  it('does not load data when modal is closed', () => {
    render(<QueryDetailsModal {...defaultProps} isOpen={false} />);
    
    expect(queriesApi.getById).not.toHaveBeenCalled();
  });

  it('handles string execution result', async () => {
    const queryWithStringResult = {
      ...mockQuery,
      execution_result: 'Query executed successfully'
    };
    (queriesApi.getById as jest.Mock).mockResolvedValue({ data: queryWithStringResult });
    
    render(<QueryDetailsModal {...defaultProps} />);
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('Query executed successfully')).toBeInTheDocument();
  });

  it('handles complex JSON execution result', async () => {
    const queryWithJsonResult = {
      ...mockQuery,
      execution_result: { status: 'success', count: 42, data: { users: 10 } }
    };
    (queriesApi.getById as jest.Mock).mockResolvedValue({ data: queryWithJsonResult });
    
    render(<QueryDetailsModal {...defaultProps} />);
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Should display JSON formatted result
    expect(screen.getByText(/"status": "success"/)).toBeInTheDocument();
    expect(screen.getByText(/"count": 42/)).toBeInTheDocument();
  });
});