import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryDetailsModal } from '../QueryDetailsModal';

// Mock the API service directly
jest.mock('../../services/api', () => ({
  queriesApi: {
    getById: jest.fn(),
  },
}));

// Helper function to get the mocked API
const getMockQueriesApi = () => {
  const { queriesApi } = require('../../services/api');
  return queriesApi;
};

// Mock Button component
jest.mock('../Button', () => ({
  Button: ({ children, onClick, variant }: any) => (
    <button onClick={onClick} data-variant={variant}>
      {children}
    </button>
  )
}));

const mockQuery = {
  id: 'query-123',
  requester_name: 'John Doe',
  requester_email: 'john@test.com',
  instance_name: 'Test Instance',
  database_name: 'test_db',
  submission_type: 'QUERY' as const,
  pod_id: 'pod-1',
  pod_manager_name: 'Manager Name',
  created_at: '2024-01-15T10:30:00Z',
  status: 'PENDING' as const,
  query_text: 'SELECT * FROM users WHERE id = 1',
  comments: 'This is a test query for user lookup',
  execution_result: null,
  rejection_reason: null,
  script_content: null
};

describe('QueryDetailsModal', () => {
  const defaultProps = {
    queryId: 'query-123',
    isOpen: true,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getMockQueriesApi().getById.mockClear();
  });

  describe('Modal visibility', () => {
    it('should not render when isOpen is false', () => {
      render(<QueryDetailsModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('Query Details')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      getMockQueriesApi().getById.mockImplementation(() => new Promise(() => {})); // Never resolves
      render(<QueryDetailsModal {...defaultProps} />);
      expect(screen.getByText('Query Details')).toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    it('should show loading spinner while fetching query details', () => {
      getMockQueriesApi().getById.mockImplementation(() => new Promise(() => {})); // Never resolves
      render(<QueryDetailsModal {...defaultProps} />);
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should call API when modal opens with queryId', () => {
      getMockQueriesApi().getById.mockImplementation(() => new Promise(() => {}));
      render(<QueryDetailsModal {...defaultProps} />);
      expect(getMockQueriesApi().getById).toHaveBeenCalledWith('query-123');
    });

    it('should not call API when modal is closed', () => {
      render(<QueryDetailsModal {...defaultProps} isOpen={false} />);
      expect(getMockQueriesApi().getById).not.toHaveBeenCalled();
    });

    it('should not call API when queryId is empty', () => {
      render(<QueryDetailsModal {...defaultProps} queryId="" />);
      expect(getMockQueriesApi().getById).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should display error message when API call fails with response message', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Query not found'
          }
        }
      };
      getMockQueriesApi().getById.mockRejectedValue(mockError);
      
      render(<QueryDetailsModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Query not found')).toBeInTheDocument();
      });
    });

    it('should display default error message when API call fails without response message', async () => {
      getMockQueriesApi().getById.mockRejectedValue(new Error('Network error'));
      
      render(<QueryDetailsModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load query details')).toBeInTheDocument();
      });
    });

    it('should display default error message when error has no response', async () => {
      const mockError = { message: 'Some error' };
      getMockQueriesApi().getById.mockRejectedValue(mockError);
      
      render(<QueryDetailsModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load query details')).toBeInTheDocument();
      });
    });
  });

  describe('Query details display', () => {
    it('should display basic query information', async () => {
      getMockQueriesApi().getById.mockResolvedValue({ data: mockQuery });
      
      render(<QueryDetailsModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('query-123')).toBeInTheDocument();
      });
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@test.com')).toBeInTheDocument();
      expect(screen.getByText('test_db')).toBeInTheDocument();
      expect(screen.getByText('Test Instance')).toBeInTheDocument();
      expect(screen.getByText('pod-1')).toBeInTheDocument();
      expect(screen.getByText('Manager: Manager Name')).toBeInTheDocument();
      expect(screen.getByText('This is a test query for user lookup')).toBeInTheDocument();
      expect(screen.getByText('SELECT * FROM users WHERE id = 1')).toBeInTheDocument();
    });

    it('should format date correctly', async () => {
      getMockQueriesApi().getById.mockResolvedValue({ data: mockQuery });
      
      render(<QueryDetailsModal {...defaultProps} />);
      
      await waitFor(() => {
        // The date formatting depends on the system timezone, so we'll check for the date part
        expect(screen.getByText(/Jan 15, 2024/)).toBeInTheDocument();
      });
    });

    it('should not display pod manager when not available', async () => {
      const queryWithoutManager = { ...mockQuery, pod_manager_name: null };
      getMockQueriesApi().getById.mockResolvedValue({ data: queryWithoutManager });
      
      render(<QueryDetailsModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('pod-1')).toBeInTheDocument();
      });
      
      expect(screen.queryByText('Manager:')).not.toBeInTheDocument();
    });

    it('should not display comments section when comments is null', async () => {
      const queryWithoutComments = { ...mockQuery, comments: null };
      getMockQueriesApi().getById.mockResolvedValue({ data: queryWithoutComments });
      
      render(<QueryDetailsModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Query Details')).toBeInTheDocument();
      });
      
      expect(screen.queryByText('Comments')).not.toBeInTheDocument();
    });

    it('should not display comments section when comments is empty string', async () => {
      const queryWithoutComments = { ...mockQuery, comments: '' };
      getMockQueriesApi().getById.mockResolvedValue({ data: queryWithoutComments });
      
      render(<QueryDetailsModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Query Details')).toBeInTheDocument();
      });
      
      expect(screen.queryByText('Comments')).not.toBeInTheDocument();
    });
  });

  describe('Status colors', () => {
    it('should display PENDING status with correct color', async () => {
      const pendingQuery = { ...mockQuery, status: 'PENDING' as const };
      getMockQueriesApi().getById.mockResolvedValue({ data: pendingQuery });
      
      render(<QueryDetailsModal {...defaultProps} />);
      
      await waitFor(() => {
        const statusElement = screen.getByText('PENDING');
        expect(statusElement).toHaveClass('text-yellow-600');
      });
    });

    it('should display EXECUTED status with correct color', async () => {
      const executedQuery = { ...mockQuery, status: 'EXECUTED' as const };
      getMockQueriesApi().getById.mockResolvedValue({ data: executedQuery });
      
      render(<QueryDetailsModal {...defaultProps} />);
      
      await waitFor(() => {
        const statusElement = screen.getByText('EXECUTED');
        expect(statusElement).toHaveClass('text-green-600');
      });
    });

    it('should display REJECTED status with correct color', async () => {
      const rejectedQuery = { ...mockQuery, status: 'REJECTED' as const };
      getMockQueriesApi().getById.mockResolvedValue({ data: rejectedQuery });
      
      render(<QueryDetailsModal {...defaultProps} />);
      
      await waitFor(() => {
        const statusElement = screen.getByText('REJECTED');
        expect(statusElement).toHaveClass('text-red-600');
      });
    });

    it('should display FAILED status with correct color', async () => {
      const failedQuery = { ...mockQuery, status: 'FAILED' as const };
      getMockQueriesApi().getById.mockResolvedValue({ data: failedQuery });
      
      render(<QueryDetailsModal {...defaultProps} />);
      
      await waitFor(() => {
        const statusElement = screen.getByText('FAILED');
        expect(statusElement).toHaveClass('text-orange-600');
      });
    });

    it('should display unknown status with default color', async () => {
      const unknownQuery = { ...mockQuery, status: 'UNKNOWN' as any };
      getMockQueriesApi().getById.mockResolvedValue({ data: unknownQuery });
      
      render(<QueryDetailsModal {...defaultProps} />);
      
      await waitFor(() => {
        const statusElement = screen.getByText('UNKNOWN');
        expect(statusElement).toHaveClass('text-gray-600');
      });
    });
  });

  describe('Submission types', () => {
    it('should display Query Text label for QUERY submission type', async () => {
      const querySubmission = { ...mockQuery, submission_type: 'QUERY' as const };
      getMockQueriesApi().getById.mockResolvedValue({ data: querySubmission });
      
      render(<QueryDetailsModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Query Text')).toBeInTheDocument();
      });
    });

    it('should display Script Content label for SCRIPT submission type', async () => {
      const scriptSubmission = {
        ...mockQuery,
        submission_type: 'SCRIPT' as const,
        script_content: 'console.log("Hello World");',
        query_text: null
      };
      getMockQueriesApi().getById.mockResolvedValue({ data: scriptSubmission });
      
      render(<QueryDetailsModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Script Content')).toBeInTheDocument();
        expect(screen.getByText('console.log("Hello World");')).toBeInTheDocument();
      });
    });
  });

  describe('Rejection reason', () => {
    it('should display rejection reason for REJECTED status', async () => {
      const rejectedQuery = {
        ...mockQuery,
        status: 'REJECTED' as const,
        rejection_reason: 'Query is too broad and may impact performance'
      };
      getMockQueriesApi().getById.mockResolvedValue({ data: rejectedQuery });
      
      render(<QueryDetailsModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Rejection Reason')).toBeInTheDocument();
        expect(screen.getByText('Query is too broad and may impact performance')).toBeInTheDocument();
      });
    });

    it('should not display rejection reason for non-REJECTED status', async () => {
      const pendingQuery = {
        ...mockQuery,
        status: 'PENDING' as const,
        rejection_reason: 'Some reason'
      };
      getMockQueriesApi().getById.mockResolvedValue({ data: pendingQuery });
      
      render(<QueryDetailsModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('PENDING')).toBeInTheDocument();
      });
      
      expect(screen.queryByText('Rejection Reason')).not.toBeInTheDocument();
    });

    it('should not display rejection reason when reason is null', async () => {
      const rejectedQuery = {
        ...mockQuery,
        status: 'REJECTED' as const,
        rejection_reason: null
      };
      getMockQueriesApi().getById.mockResolvedValue({ data: rejectedQuery });
      
      render(<QueryDetailsModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('REJECTED')).toBeInTheDocument();
      });
      
      expect(screen.queryByText('Rejection Reason')).not.toBeInTheDocument();
    });
  });

  describe('Execution results', () => {
    it('should display execution result for EXECUTED status', async () => {
      const executedQuery = {
        ...mockQuery,
        status: 'EXECUTED' as const,
        execution_result: {
          rows: [
            { id: 1, name: 'John', email: 'john@test.com' },
            { id: 2, name: 'Jane', email: 'jane@test.com' }
          ]
        }
      };
      getMockQueriesApi().getById.mockResolvedValue({ data: executedQuery });
      
      render(<QueryDetailsModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Execution Result')).toBeInTheDocument();
        expect(screen.getByText('2 rows returned')).toBeInTheDocument();
      });
    });

    it('should display error details for FAILED status', async () => {
      const failedQuery = {
        ...mockQuery,
        status: 'FAILED' as const,
        execution_result: {
          stderr: 'Connection timeout error'
        }
      };
      getMockQueriesApi().getById.mockResolvedValue({ data: failedQuery });
      
      render(<QueryDetailsModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Error Details')).toBeInTheDocument();
        expect(screen.getByText('Connection timeout error')).toBeInTheDocument();
      });
    });

    it('should not display execution result for PENDING status', async () => {
      const pendingQuery = {
        ...mockQuery,
        status: 'PENDING' as const,
        execution_result: { rows: [] }
      };
      getMockQueriesApi().getById.mockResolvedValue({ data: pendingQuery });
      
      render(<QueryDetailsModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('PENDING')).toBeInTheDocument();
      });
      
      expect(screen.queryByText('Execution Result')).not.toBeInTheDocument();
      expect(screen.queryByText('Error Details')).not.toBeInTheDocument();
    });

    it('should not display execution result when result is null', async () => {
      const executedQuery = {
        ...mockQuery,
        status: 'EXECUTED' as const,
        execution_result: null
      };
      getMockQueriesApi().getById.mockResolvedValue({ data: executedQuery });
      
      render(<QueryDetailsModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('EXECUTED')).toBeInTheDocument();
      });
      
      expect(screen.queryByText('Execution Result')).not.toBeInTheDocument();
    });
  });

  describe('formatResult function branches', () => {
    it('should return null for null result', async () => {
      const executedQuery = {
        ...mockQuery,
        status: 'EXECUTED' as const,
        execution_result: null
      };
      getMockQueriesApi().getById.mockResolvedValue({ data: executedQuery });
      
      render(<QueryDetailsModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('EXECUTED')).toBeInTheDocument();
      });
      
      expect(screen.queryByText('Execution Result')).not.toBeInTheDocument();
    });

    it('should handle string result', async () => {
      const executedQuery = {
        ...mockQuery,
        status: 'EXECUTED' as const,
        execution_result: 'Simple string result'
      };
      getMockQueriesApi().getById.mockResolvedValue({ data: executedQuery });
      
      render(<QueryDetailsModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Execution Result')).toBeInTheDocument();
        expect(screen.getByText('Simple string result')).toBeInTheDocument();
      });
    });

    it('should handle result with rows (single row)', async () => {
      const executedQuery = {
        ...mockQuery,
        status: 'EXECUTED' as const,
        execution_result: {
          rows: [{ id: 1, name: 'John' }]
        }
      };
      getMockQueriesApi().getById.mockResolvedValue({ data: executedQuery });
      
      render(<QueryDetailsModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Execution Result')).toBeInTheDocument();
        expect(screen.getByText('1 row returned')).toBeInTheDocument();
      });
    });

    it('should handle result with stdout only', async () => {
      const executedQuery = {
        ...mockQuery,
        status: 'EXECUTED' as const,
        execution_result: {
          stdout: 'Command executed successfully'
        }
      };
      getMockQueriesApi().getById.mockResolvedValue({ data: executedQuery });
      
      render(<QueryDetailsModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Execution Result')).toBeInTheDocument();
        expect(screen.getByText('Output:')).toBeInTheDocument();
        expect(screen.getByText('Command executed successfully')).toBeInTheDocument();
      });
    });

    it('should handle result with stderr only', async () => {
      const failedQuery = {
        ...mockQuery,
        status: 'FAILED' as const,
        execution_result: {
          stderr: 'Error occurred during execution'
        }
      };
      getMockQueriesApi().getById.mockResolvedValue({ data: failedQuery });
      
      render(<QueryDetailsModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Error Details')).toBeInTheDocument();
        expect(screen.getByText('Error Output:')).toBeInTheDocument();
        expect(screen.getByText('Error occurred during execution')).toBeInTheDocument();
      });
    });

    it('should handle result with both stdout and stderr', async () => {
      const failedQuery = {
        ...mockQuery,
        status: 'FAILED' as const,
        execution_result: {
          stdout: 'Partial output',
          stderr: 'Error occurred'
        }
      };
      getMockQueriesApi().getById.mockResolvedValue({ data: failedQuery });
      
      render(<QueryDetailsModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Error Details')).toBeInTheDocument();
        expect(screen.getByText('Output:')).toBeInTheDocument();
        expect(screen.getByText('Partial output')).toBeInTheDocument();
        expect(screen.getByText('Error Output:')).toBeInTheDocument();
        expect(screen.getByText('Error occurred')).toBeInTheDocument();
      });
    });

    it('should handle complex object result (fallback case)', async () => {
      const executedQuery = {
        ...mockQuery,
        status: 'EXECUTED' as const,
        execution_result: {
          data: { key: 'value' },
          metadata: { count: 5 }
        }
      };
      getMockQueriesApi().getById.mockResolvedValue({ data: executedQuery });
      
      render(<QueryDetailsModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Execution Result')).toBeInTheDocument();
        // Should display JSON stringified version
        expect(screen.getByText(/"data": {/)).toBeInTheDocument();
        expect(screen.getByText(/"key": "value"/)).toBeInTheDocument();
      });
    });
  });

  describe('Modal interactions', () => {
    it('should call onClose when X button is clicked', async () => {
      const mockOnClose = jest.fn();
      getMockQueriesApi().getById.mockResolvedValue({ data: mockQuery });
      
      render(<QueryDetailsModal {...defaultProps} onClose={mockOnClose} />);
      
      await waitFor(() => {
        expect(screen.getByText('query-123')).toBeInTheDocument();
      });
      
      const xButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(xButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when Close button is clicked', async () => {
      const mockOnClose = jest.fn();
      getMockQueriesApi().getById.mockResolvedValue({ data: mockQuery });
      
      render(<QueryDetailsModal {...defaultProps} onClose={mockOnClose} />);
      
      await waitFor(() => {
        expect(screen.getByText('query-123')).toBeInTheDocument();
      });
      
      const closeButton = screen.getByText('Close');
      fireEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Effect dependencies', () => {
    it('should reload query when queryId changes', async () => {
      getMockQueriesApi().getById.mockResolvedValue({ data: mockQuery });
      
      const { rerender } = render(<QueryDetailsModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(getMockQueriesApi().getById).toHaveBeenCalledWith('query-123');
      });
      
      // Change queryId
      rerender(<QueryDetailsModal {...defaultProps} queryId="query-456" />);
      
      await waitFor(() => {
        expect(getMockQueriesApi().getById).toHaveBeenCalledWith('query-456');
      });
      
      expect(getMockQueriesApi().getById).toHaveBeenCalledTimes(2);
    });

    it('should reload query when modal reopens', async () => {
      getMockQueriesApi().getById.mockResolvedValue({ data: mockQuery });
      
      const { rerender } = render(<QueryDetailsModal {...defaultProps} isOpen={false} />);
      
      expect(getMockQueriesApi().getById).not.toHaveBeenCalled();
      
      // Open modal
      rerender(<QueryDetailsModal {...defaultProps} isOpen={true} />);
      
      await waitFor(() => {
        expect(getMockQueriesApi().getById).toHaveBeenCalledWith('query-123');
      });
    });
  });
});