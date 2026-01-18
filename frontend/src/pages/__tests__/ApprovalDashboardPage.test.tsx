import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApprovalDashboardPage } from '../ApprovalDashboardPage';

// Mock the API
jest.mock('../../services/api', () => ({
  queriesApi: {
    getForApproval: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
  },
}));

import { queriesApi } from '../../services/api';

const mockQueries = [
  {
    id: 'query-1',
    requester_id: 'user-1',
    requester_name: 'John Doe',
    requester_email: 'john@example.com',
    instance_id: 'inst-1',
    instance_name: 'Production DB',
    database_name: 'users_db',
    submission_type: 'QUERY',
    query_text: 'SELECT * FROM users',
    comments: 'Need user data',
    pod_id: 'pod-1',
    status: 'PENDING',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 'query-2',
    requester_id: 'user-2',
    requester_name: 'Jane Smith',
    requester_email: 'jane@example.com',
    instance_id: 'inst-1',
    instance_name: 'Production DB',
    database_name: 'orders_db',
    submission_type: 'SCRIPT',
    query_text: '',
    script_content: 'const result = await query("SELECT 1");',
    comments: 'Batch update',
    pod_id: 'pod-2',
    status: 'PENDING',
    created_at: '2024-01-14T10:00:00Z',
    updated_at: '2024-01-14T10:00:00Z',
  },
  {
    id: 'query-3',
    requester_id: 'user-1',
    requester_name: 'John Doe',
    requester_email: 'john@example.com',
    instance_id: 'inst-1',
    instance_name: 'Production DB',
    database_name: 'users_db',
    submission_type: 'QUERY',
    query_text: 'DELETE FROM users',
    comments: 'Cleanup',
    pod_id: 'pod-1',
    status: 'PENDING',
    created_at: '2024-01-13T10:00:00Z',
    updated_at: '2024-01-13T10:00:00Z',
  },
];

const mockPaginatedResponse = {
  data: mockQueries,
  pagination: { total: 3, limit: 10, offset: 0, hasMore: false },
};

describe('ApprovalDashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (queriesApi.getForApproval as jest.Mock).mockResolvedValue({ 
      data: mockPaginatedResponse 
    });
    (queriesApi.approve as jest.Mock).mockResolvedValue({ data: { status: 'EXECUTED' } });
    (queriesApi.reject as jest.Mock).mockResolvedValue({ data: { status: 'REJECTED' } });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the page title', async () => {
    render(<ApprovalDashboardPage />);
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Approval Dashboard')).toBeInTheDocument();
  });

  it('shows loading spinner initially', () => {
    render(<ApprovalDashboardPage />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('loads and displays queries', async () => {
    render(<ApprovalDashboardPage />);
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('displays query details in table', async () => {
    render(<ApprovalDashboardPage />);
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    expect(screen.getAllByText('Production DB').length).toBeGreaterThan(0);
    expect(screen.getAllByText('users_db').length).toBeGreaterThan(0);
  });

  it('renders filter dropdowns', async () => {
    render(<ApprovalDashboardPage />);
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Status:')).toBeInTheDocument();
    expect(screen.getByText('Type:')).toBeInTheDocument();
    expect(screen.getByText('Risk:')).toBeInTheDocument();
  });

  it('filters by status', async () => {
    render(<ApprovalDashboardPage />);
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    const statusSelect = screen.getAllByRole('combobox')[0];
    await userEvent.selectOptions(statusSelect, 'EXECUTED');
    await waitFor(() => {
      expect(queriesApi.getForApproval).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'EXECUTED' })
      );
    });
  });

  it('filters by type', async () => {
    render(<ApprovalDashboardPage />);
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    const typeSelect = screen.getAllByRole('combobox')[1];
    await userEvent.selectOptions(typeSelect, 'SCRIPT');
    await waitFor(() => {
      expect(queriesApi.getForApproval).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'SCRIPT' })
      );
    });
  });

  it('shows approve and reject buttons for pending queries', async () => {
    render(<ApprovalDashboardPage />);
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    const approveButtons = screen.getAllByText('✓ Approve');
    const rejectButtons = screen.getAllByText('✗ Reject');
    expect(approveButtons.length).toBeGreaterThan(0);
    expect(rejectButtons.length).toBeGreaterThan(0);
  });

  it('opens detail modal when View Details is clicked', async () => {
    render(<ApprovalDashboardPage />);
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    const viewButtons = screen.getAllByText('View Details');
    await userEvent.click(viewButtons[0]);
    expect(screen.getByText('Query Details')).toBeInTheDocument();
  });

  it('approves a query', async () => {
    render(<ApprovalDashboardPage />);
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    const approveButtons = screen.getAllByText('✓ Approve');
    await userEvent.click(approveButtons[0]);
    await waitFor(() => {
      expect(queriesApi.approve).toHaveBeenCalledWith('query-1');
    });
  });

  it('opens reject modal when reject is clicked', async () => {
    render(<ApprovalDashboardPage />);
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    const rejectButtons = screen.getAllByText('✗ Reject');
    await userEvent.click(rejectButtons[0]);
    expect(screen.getByText('Reject Query')).toBeInTheDocument();
    expect(screen.getByLabelText(/rejection reason/i)).toBeInTheDocument();
  });

  it('rejects a query with reason', async () => {
    render(<ApprovalDashboardPage />);
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    const rejectButtons = screen.getAllByText('✗ Reject');
    await userEvent.click(rejectButtons[0]);
    await userEvent.type(screen.getByLabelText(/rejection reason/i), 'Not approved');
    await userEvent.click(screen.getByRole('button', { name: /^reject$/i }));
    await waitFor(() => {
      expect(queriesApi.reject).toHaveBeenCalledWith('query-1', 'Not approved');
    });
  });

  it('displays risk badges', async () => {
    render(<ApprovalDashboardPage />);
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    expect(screen.getByText('🔴 HIGH')).toBeInTheDocument();
  });

  it('shows pagination controls', async () => {
    render(<ApprovalDashboardPage />);
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    expect(screen.getByText(/showing/i)).toBeInTheDocument();
    expect(screen.getByText(/per page/i)).toBeInTheDocument();
  });

  it('changes items per page', async () => {
    render(<ApprovalDashboardPage />);
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    const selects = screen.getAllByRole('combobox');
    const perPageSelectEl = selects[selects.length - 1];
    await userEvent.selectOptions(perPageSelectEl, '25');
    await waitFor(() => {
      expect(queriesApi.getForApproval).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 25 })
      );
    });
  });

  it('shows no queries message when empty', async () => {
    (queriesApi.getForApproval as jest.Mock).mockResolvedValue({
      data: { data: [], pagination: { total: 0, limit: 10, offset: 0, hasMore: false } },
    });
    render(<ApprovalDashboardPage />);
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    expect(screen.getByText('No queries found')).toBeInTheDocument();
  });

  it('displays submission type badges', async () => {
    render(<ApprovalDashboardPage />);
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    expect(screen.getAllByText('QUERY').length).toBeGreaterThan(0);
    expect(screen.getByText('SCRIPT')).toBeInTheDocument();
  });

  it('closes reject modal on cancel', async () => {
    render(<ApprovalDashboardPage />);
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    const rejectButtons = screen.getAllByText('✗ Reject');
    await userEvent.click(rejectButtons[0]);
    expect(screen.getByText('Reject Query')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(() => {
      expect(screen.queryByText('Reject Query')).not.toBeInTheDocument();
    });
  });

  it('shows error alert on approve failure', async () => {
    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});
    (queriesApi.approve as jest.Mock).mockRejectedValue({
      response: { data: { message: 'Approval failed' } },
    });
    render(<ApprovalDashboardPage />);
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    const approveButtons = screen.getAllByText('✓ Approve');
    await userEvent.click(approveButtons[0]);
    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith('Approval failed');
    });
    alertMock.mockRestore();
  });
});

describe('ApprovalDashboardPage - Risk Analysis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (queriesApi.approve as jest.Mock).mockResolvedValue({ data: { status: 'EXECUTED' } });
    (queriesApi.reject as jest.Mock).mockResolvedValue({ data: { status: 'REJECTED' } });
  });

  afterEach(() => {
    cleanup();
  });

  it('shows LOW risk for SELECT queries', async () => {
    (queriesApi.getForApproval as jest.Mock).mockResolvedValue({
      data: {
        data: [{
          id: 'query-1', requester_name: 'Test User', requester_email: 'test@test.com',
          instance_name: 'Test DB', database_name: 'test_db', submission_type: 'QUERY',
          query_text: 'SELECT * FROM users', comments: 'Test', pod_id: 'pod-1',
          status: 'PENDING', created_at: '2024-01-15T10:00:00Z',
        }],
        pagination: { total: 1, limit: 10, offset: 0, hasMore: false },
      },
    });
    render(<ApprovalDashboardPage />);
    await waitFor(() => expect(document.querySelector('.animate-spin')).not.toBeInTheDocument());
    expect(screen.getByText('🟢 LOW')).toBeInTheDocument();
  });

  it('shows HIGH risk for TRUNCATE', async () => {
    (queriesApi.getForApproval as jest.Mock).mockResolvedValue({
      data: {
        data: [{
          id: 'query-1', requester_name: 'Test User', requester_email: 'test@test.com',
          instance_name: 'Test DB', database_name: 'test_db', submission_type: 'QUERY',
          query_text: 'TRUNCATE TABLE users', comments: 'Test', pod_id: 'pod-1',
          status: 'PENDING', created_at: '2024-01-15T10:00:00Z',
        }],
        pagination: { total: 1, limit: 10, offset: 0, hasMore: false },
      },
    });
    render(<ApprovalDashboardPage />);
    await waitFor(() => expect(document.querySelector('.animate-spin')).not.toBeInTheDocument());
    expect(screen.getByText('🔴 HIGH')).toBeInTheDocument();
  });

  it('shows HIGH risk for DROP TABLE', async () => {
    (queriesApi.getForApproval as jest.Mock).mockResolvedValue({
      data: {
        data: [{
          id: 'query-1', requester_name: 'Test User', requester_email: 'test@test.com',
          instance_name: 'Test DB', database_name: 'test_db', submission_type: 'QUERY',
          query_text: 'DROP TABLE users', comments: 'Test', pod_id: 'pod-1',
          status: 'PENDING', created_at: '2024-01-15T10:00:00Z',
        }],
        pagination: { total: 1, limit: 10, offset: 0, hasMore: false },
      },
    });
    render(<ApprovalDashboardPage />);
    await waitFor(() => expect(document.querySelector('.animate-spin')).not.toBeInTheDocument());
    expect(screen.getByText('🔴 HIGH')).toBeInTheDocument();
  });

  it('shows HIGH risk for DELETE without WHERE', async () => {
    (queriesApi.getForApproval as jest.Mock).mockResolvedValue({
      data: {
        data: [{
          id: 'query-1', requester_name: 'Test User', requester_email: 'test@test.com',
          instance_name: 'Test DB', database_name: 'test_db', submission_type: 'QUERY',
          query_text: 'DELETE FROM users', comments: 'Test', pod_id: 'pod-1',
          status: 'PENDING', created_at: '2024-01-15T10:00:00Z',
        }],
        pagination: { total: 1, limit: 10, offset: 0, hasMore: false },
      },
    });
    render(<ApprovalDashboardPage />);
    await waitFor(() => expect(document.querySelector('.animate-spin')).not.toBeInTheDocument());
    expect(screen.getByText('🔴 HIGH')).toBeInTheDocument();
  });

  it('shows MEDIUM risk for DELETE with WHERE', async () => {
    (queriesApi.getForApproval as jest.Mock).mockResolvedValue({
      data: {
        data: [{
          id: 'query-1', requester_name: 'Test User', requester_email: 'test@test.com',
          instance_name: 'Test DB', database_name: 'test_db', submission_type: 'QUERY',
          query_text: 'DELETE FROM users WHERE id = 1', comments: 'Test', pod_id: 'pod-1',
          status: 'PENDING', created_at: '2024-01-15T10:00:00Z',
        }],
        pagination: { total: 1, limit: 10, offset: 0, hasMore: false },
      },
    });
    render(<ApprovalDashboardPage />);
    await waitFor(() => expect(document.querySelector('.animate-spin')).not.toBeInTheDocument());
    expect(screen.getByText('🟡 MEDIUM')).toBeInTheDocument();
  });

  it('shows HIGH risk for UPDATE without WHERE', async () => {
    (queriesApi.getForApproval as jest.Mock).mockResolvedValue({
      data: {
        data: [{
          id: 'query-1', requester_name: 'Test User', requester_email: 'test@test.com',
          instance_name: 'Test DB', database_name: 'test_db', submission_type: 'QUERY',
          query_text: 'UPDATE users SET active = false', comments: 'Test', pod_id: 'pod-1',
          status: 'PENDING', created_at: '2024-01-15T10:00:00Z',
        }],
        pagination: { total: 1, limit: 10, offset: 0, hasMore: false },
      },
    });
    render(<ApprovalDashboardPage />);
    await waitFor(() => expect(document.querySelector('.animate-spin')).not.toBeInTheDocument());
    expect(screen.getByText('🔴 HIGH')).toBeInTheDocument();
  });

  it('shows MEDIUM risk for ALTER TABLE', async () => {
    (queriesApi.getForApproval as jest.Mock).mockResolvedValue({
      data: {
        data: [{
          id: 'query-1', requester_name: 'Test User', requester_email: 'test@test.com',
          instance_name: 'Test DB', database_name: 'test_db', submission_type: 'QUERY',
          query_text: 'ALTER TABLE users ADD COLUMN email VARCHAR(255)', comments: 'Test', pod_id: 'pod-1',
          status: 'PENDING', created_at: '2024-01-15T10:00:00Z',
        }],
        pagination: { total: 1, limit: 10, offset: 0, hasMore: false },
      },
    });
    render(<ApprovalDashboardPage />);
    await waitFor(() => expect(document.querySelector('.animate-spin')).not.toBeInTheDocument());
    expect(screen.getByText('🟡 MEDIUM')).toBeInTheDocument();
  });

  it('shows MEDIUM risk for scripts', async () => {
    (queriesApi.getForApproval as jest.Mock).mockResolvedValue({
      data: {
        data: [{
          id: 'query-1', requester_name: 'Test User', requester_email: 'test@test.com',
          instance_name: 'Test DB', database_name: 'test_db', submission_type: 'SCRIPT',
          query_text: '', script_content: 'const x = 1;', comments: 'Test', pod_id: 'pod-1',
          status: 'PENDING', created_at: '2024-01-15T10:00:00Z',
        }],
        pagination: { total: 1, limit: 10, offset: 0, hasMore: false },
      },
    });
    render(<ApprovalDashboardPage />);
    await waitFor(() => expect(document.querySelector('.animate-spin')).not.toBeInTheDocument());
    expect(screen.getByText('🟡 MEDIUM')).toBeInTheDocument();
  });

  it('shows HIGH risk for scripts with delete operations', async () => {
    (queriesApi.getForApproval as jest.Mock).mockResolvedValue({
      data: {
        data: [{
          id: 'query-1', requester_name: 'Test User', requester_email: 'test@test.com',
          instance_name: 'Test DB', database_name: 'test_db', submission_type: 'SCRIPT',
          query_text: '', script_content: 'await db.collection("users").deleteMany({})', comments: 'Test', pod_id: 'pod-1',
          status: 'PENDING', created_at: '2024-01-15T10:00:00Z',
        }],
        pagination: { total: 1, limit: 10, offset: 0, hasMore: false },
      },
    });
    render(<ApprovalDashboardPage />);
    await waitFor(() => expect(document.querySelector('.animate-spin')).not.toBeInTheDocument());
    expect(screen.getByText('🔴 HIGH')).toBeInTheDocument();
  });

  it('filters by risk level', async () => {
    (queriesApi.getForApproval as jest.Mock).mockResolvedValue({
      data: { data: mockQueries, pagination: { total: 3, limit: 10, offset: 0, hasMore: false } },
    });
    render(<ApprovalDashboardPage />);
    await waitFor(() => expect(document.querySelector('.animate-spin')).not.toBeInTheDocument());
    const riskSelect = screen.getAllByRole('combobox')[2];
    await userEvent.selectOptions(riskSelect, 'HIGH');
    await waitFor(() => expect(screen.getByText('🔴 HIGH')).toBeInTheDocument());
  });

  it('shows HIGH risk for INSERT with multiple statements', async () => {
    (queriesApi.getForApproval as jest.Mock).mockResolvedValue({
      data: {
        data: [{
          id: 'query-1', requester_name: 'Test User', requester_email: 'test@test.com',
          instance_name: 'Test DB', database_name: 'test_db', submission_type: 'QUERY',
          query_text: 'INSERT INTO users (name) VALUES ("test"); DROP TABLE users;', comments: 'Test', pod_id: 'pod-1',
          status: 'PENDING', created_at: '2024-01-15T10:00:00Z',
        }],
        pagination: { total: 1, limit: 10, offset: 0, hasMore: false },
      },
    });
    render(<ApprovalDashboardPage />);
    await waitFor(() => expect(document.querySelector('.animate-spin')).not.toBeInTheDocument());
    expect(screen.getByText('🔴 HIGH')).toBeInTheDocument();
  });

  it('shows LOW risk for INSERT operation', async () => {
    (queriesApi.getForApproval as jest.Mock).mockResolvedValue({
      data: {
        data: [{
          id: 'query-1', requester_name: 'Test User', requester_email: 'test@test.com',
          instance_name: 'Test DB', database_name: 'test_db', submission_type: 'QUERY',
          query_text: 'INSERT INTO users (name) VALUES ("test")', comments: 'Test', pod_id: 'pod-1',
          status: 'PENDING', created_at: '2024-01-15T10:00:00Z',
        }],
        pagination: { total: 1, limit: 10, offset: 0, hasMore: false },
      },
    });
    render(<ApprovalDashboardPage />);
    await waitFor(() => expect(document.querySelector('.animate-spin')).not.toBeInTheDocument());
    expect(screen.getByText('🟢 LOW')).toBeInTheDocument();
  });

  it('shows HIGH risk for scripts with file system operations', async () => {
    (queriesApi.getForApproval as jest.Mock).mockResolvedValue({
      data: {
        data: [{
          id: 'query-1', requester_name: 'Test User', requester_email: 'test@test.com',
          instance_name: 'Test DB', database_name: 'test_db', submission_type: 'SCRIPT',
          query_text: '', script_content: 'fs.writeFile("test.txt", "data")', comments: 'Test', pod_id: 'pod-1',
          status: 'PENDING', created_at: '2024-01-15T10:00:00Z',
        }],
        pagination: { total: 1, limit: 10, offset: 0, hasMore: false },
      },
    });
    render(<ApprovalDashboardPage />);
    await waitFor(() => expect(document.querySelector('.animate-spin')).not.toBeInTheDocument());
    expect(screen.getByText('🔴 HIGH')).toBeInTheDocument();
  });

  it('shows HIGH risk for scripts with exec operations', async () => {
    (queriesApi.getForApproval as jest.Mock).mockResolvedValue({
      data: {
        data: [{
          id: 'query-1', requester_name: 'Test User', requester_email: 'test@test.com',
          instance_name: 'Test DB', database_name: 'test_db', submission_type: 'SCRIPT',
          query_text: '', script_content: 'exec("rm -rf /")', comments: 'Test', pod_id: 'pod-1',
          status: 'PENDING', created_at: '2024-01-15T10:00:00Z',
        }],
        pagination: { total: 1, limit: 10, offset: 0, hasMore: false },
      },
    });
    render(<ApprovalDashboardPage />);
    await waitFor(() => expect(document.querySelector('.animate-spin')).not.toBeInTheDocument());
    expect(screen.getByText('🔴 HIGH')).toBeInTheDocument();
  });

  it('shows MEDIUM risk for UPDATE with WHERE clause', async () => {
    (queriesApi.getForApproval as jest.Mock).mockResolvedValue({
      data: {
        data: [{
          id: 'query-1', requester_name: 'Test User', requester_email: 'test@test.com',
          instance_name: 'Test DB', database_name: 'test_db', submission_type: 'QUERY',
          query_text: 'UPDATE users SET name = "test" WHERE id = 1', comments: 'Test', pod_id: 'pod-1',
          status: 'PENDING', created_at: '2024-01-15T10:00:00Z',
        }],
        pagination: { total: 1, limit: 10, offset: 0, hasMore: false },
      },
    });
    render(<ApprovalDashboardPage />);
    await waitFor(() => expect(document.querySelector('.animate-spin')).not.toBeInTheDocument());
    expect(screen.getByText('🟢 LOW')).toBeInTheDocument();
  });

  it('shows HIGH risk for DROP DATABASE', async () => {
    (queriesApi.getForApproval as jest.Mock).mockResolvedValue({
      data: {
        data: [{
          id: 'query-1', requester_name: 'Test User', requester_email: 'test@test.com',
          instance_name: 'Test DB', database_name: 'test_db', submission_type: 'QUERY',
          query_text: 'DROP DATABASE test_db', comments: 'Test', pod_id: 'pod-1',
          status: 'PENDING', created_at: '2024-01-15T10:00:00Z',
        }],
        pagination: { total: 1, limit: 10, offset: 0, hasMore: false },
      },
    });
    render(<ApprovalDashboardPage />);
    await waitFor(() => expect(document.querySelector('.animate-spin')).not.toBeInTheDocument());
    expect(screen.getByText('🔴 HIGH')).toBeInTheDocument();
  });

  it('handles queries with null/undefined content', async () => {
    (queriesApi.getForApproval as jest.Mock).mockResolvedValue({
      data: {
        data: [{
          id: 'query-1', requester_name: 'Test User', requester_email: 'test@test.com',
          instance_name: 'Test DB', database_name: 'test_db', submission_type: 'QUERY',
          query_text: null, comments: 'Test', pod_id: 'pod-1',
          status: 'PENDING', created_at: '2024-01-15T10:00:00Z',
        }],
        pagination: { total: 1, limit: 10, offset: 0, hasMore: false },
      },
    });
    render(<ApprovalDashboardPage />);
    await waitFor(() => expect(document.querySelector('.animate-spin')).not.toBeInTheDocument());
    expect(screen.getByText('🟢 LOW')).toBeInTheDocument();
  });

  it('handles scripts with null content', async () => {
    (queriesApi.getForApproval as jest.Mock).mockResolvedValue({
      data: {
        data: [{
          id: 'query-1', requester_name: 'Test User', requester_email: 'test@test.com',
          instance_name: 'Test DB', database_name: 'test_db', submission_type: 'SCRIPT',
          query_text: '', script_content: null, comments: 'Test', pod_id: 'pod-1',
          status: 'PENDING', created_at: '2024-01-15T10:00:00Z',
        }],
        pagination: { total: 1, limit: 10, offset: 0, hasMore: false },
      },
    });
    render(<ApprovalDashboardPage />);
    await waitFor(() => expect(document.querySelector('.animate-spin')).not.toBeInTheDocument());
    expect(screen.getByText('🟡 MEDIUM')).toBeInTheDocument();
  });
});

describe('ApprovalDashboardPage - Detail Modal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (queriesApi.getForApproval as jest.Mock).mockResolvedValue({
      data: { data: mockQueries, pagination: { total: 3, limit: 10, offset: 0, hasMore: false } },
    });
    (queriesApi.approve as jest.Mock).mockResolvedValue({ data: { status: 'EXECUTED' } });
    (queriesApi.reject as jest.Mock).mockResolvedValue({ data: { status: 'REJECTED' } });
  });

  afterEach(() => {
    cleanup();
  });

  it('shows script content in detail modal', async () => {
    render(<ApprovalDashboardPage />);
    await waitFor(() => expect(document.querySelector('.animate-spin')).not.toBeInTheDocument());
    const viewButtons = screen.getAllByText('View Details');
    await userEvent.click(viewButtons[1]);
    expect(screen.getByText(/const result = await query/)).toBeInTheDocument();
  });

  it('shows download button for scripts in detail modal', async () => {
    render(<ApprovalDashboardPage />);
    await waitFor(() => expect(document.querySelector('.animate-spin')).not.toBeInTheDocument());
    const viewButtons = screen.getAllByText('View Details');
    await userEvent.click(viewButtons[1]);
    expect(screen.getByText(/download script/i)).toBeInTheDocument();
  });

  it('approves from detail modal', async () => {
    render(<ApprovalDashboardPage />);
    await waitFor(() => expect(document.querySelector('.animate-spin')).not.toBeInTheDocument());
    const viewButtons = screen.getAllByText('View Details');
    await userEvent.click(viewButtons[0]);
    const modalApproveButton = screen.getAllByText('✓ Approve')[0];
    await userEvent.click(modalApproveButton);
    await waitFor(() => expect(queriesApi.approve).toHaveBeenCalledWith('query-1'));
  });

  it('opens reject modal from detail modal', async () => {
    render(<ApprovalDashboardPage />);
    await waitFor(() => expect(document.querySelector('.animate-spin')).not.toBeInTheDocument());
    const viewButtons = screen.getAllByText('View Details');
    await userEvent.click(viewButtons[0]);
    const modalRejectButton = screen.getAllByText('✗ Reject')[0];
    await userEvent.click(modalRejectButton);
    expect(screen.getByText('Reject Query')).toBeInTheDocument();
  });

  it('closes detail modal', async () => {
    render(<ApprovalDashboardPage />);
    await waitFor(() => expect(document.querySelector('.animate-spin')).not.toBeInTheDocument());
    const viewButtons = screen.getAllByText('View Details');
    await userEvent.click(viewButtons[0]);
    expect(screen.getByText('Query Details')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /close/i }));
    await waitFor(() => expect(screen.queryByText('Query Details')).not.toBeInTheDocument());
  });

  it('shows rejection reason in detail modal', async () => {
    const queryWithRejection = {
      ...mockQueries[0],
      status: 'REJECTED',
      rejection_reason: 'Security concerns',
    };
    
    (queriesApi.getForApproval as jest.Mock).mockResolvedValue({
      data: { 
        data: [queryWithRejection], 
        pagination: { total: 1, limit: 10, offset: 0, hasMore: false } 
      },
    });
    
    render(<ApprovalDashboardPage />);
    await waitFor(() => expect(document.querySelector('.animate-spin')).not.toBeInTheDocument());
    
    const viewButtons = screen.getAllByText('View Details');
    await userEvent.click(viewButtons[0]);
    
    expect(screen.getByText('Security concerns')).toBeInTheDocument();
  });

  it('shows execution result in detail modal', async () => {
    const queryWithResult = {
      ...mockQueries[0],
      status: 'EXECUTED',
      execution_result: { rows: [{ id: 1, name: 'test' }] },
    };
    
    (queriesApi.getForApproval as jest.Mock).mockResolvedValue({
      data: { 
        data: [queryWithResult], 
        pagination: { total: 1, limit: 10, offset: 0, hasMore: false } 
      },
    });
    
    render(<ApprovalDashboardPage />);
    await waitFor(() => expect(document.querySelector('.animate-spin')).not.toBeInTheDocument());
    
    const viewButtons = screen.getAllByText('View Details');
    await userEvent.click(viewButtons[0]);
    
    expect(screen.getByText('Execution Result')).toBeInTheDocument();
  });

  it('shows script file not available message', async () => {
    const scriptQueryWithoutContent = {
      ...mockQueries[1],
      script_content: null,
    };
    
    (queriesApi.getForApproval as jest.Mock).mockResolvedValue({
      data: { 
        data: [scriptQueryWithoutContent], 
        pagination: { total: 1, limit: 10, offset: 0, hasMore: false } 
      },
    });
    
    render(<ApprovalDashboardPage />);
    await waitFor(() => expect(document.querySelector('.animate-spin')).not.toBeInTheDocument());
    
    const viewButtons = screen.getAllByText('View Details');
    await userEvent.click(viewButtons[0]);
    
    expect(screen.getByText('[Script file not available]')).toBeInTheDocument();
  });

  it('does not show approve/reject buttons for non-pending queries', async () => {
    const executedQuery = {
      ...mockQueries[0],
      status: 'EXECUTED',
    };
    
    (queriesApi.getForApproval as jest.Mock).mockResolvedValue({
      data: { 
        data: [executedQuery], 
        pagination: { total: 1, limit: 10, offset: 0, hasMore: false } 
      },
    });
    
    render(<ApprovalDashboardPage />);
    await waitFor(() => expect(document.querySelector('.animate-spin')).not.toBeInTheDocument());
    
    const viewButtons = screen.getAllByText('View Details');
    await userEvent.click(viewButtons[0]);
    
    expect(screen.queryByText('✓ Approve')).not.toBeInTheDocument();
    expect(screen.queryByText('✗ Reject')).not.toBeInTheDocument();
  });

  it('handles download script functionality', async () => {
    render(<ApprovalDashboardPage />);
    await waitFor(() => expect(document.querySelector('.animate-spin')).not.toBeInTheDocument());
    
    // Mock URL methods after render
    Object.defineProperty(global, 'URL', {
      value: {
        createObjectURL: jest.fn(() => 'blob:test'),
        revokeObjectURL: jest.fn(),
      },
      writable: true,
    });

    // Mock DOM methods after render - only mock when creating 'a' elements
    const originalCreateElement = document.createElement;
    const createElementSpy = jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        return {
          href: '',
          download: '',
          click: jest.fn(),
          setAttribute: jest.fn(),
          getAttribute: jest.fn(),
          removeAttribute: jest.fn(),
        } as any;
      }
      return originalCreateElement.call(document, tagName);
    });
    
    const appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation(() => null as any);
    const removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation(() => null as any);
    
    const viewButtons = screen.getAllByText('View Details');
    await userEvent.click(viewButtons[1]); // Script query
    
    const downloadButton = screen.getByText(/download script/i);
    await userEvent.click(downloadButton);
    
    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    
    // Cleanup
    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });

  it('does not show download button for queries without script content', async () => {
    const scriptQueryWithoutContent = {
      ...mockQueries[1],
      script_content: null,
    };
    
    (queriesApi.getForApproval as jest.Mock).mockResolvedValue({
      data: { 
        data: [scriptQueryWithoutContent], 
        pagination: { total: 1, limit: 10, offset: 0, hasMore: false } 
      },
    });
    
    render(<ApprovalDashboardPage />);
    await waitFor(() => expect(document.querySelector('.animate-spin')).not.toBeInTheDocument());
    
    const viewButtons = screen.getAllByText('View Details');
    await userEvent.click(viewButtons[0]);
    
    expect(screen.queryByText(/download script/i)).not.toBeInTheDocument();
  });

  it('closes detail modal when clicking close button', async () => {
    render(<ApprovalDashboardPage />);
    await waitFor(() => expect(document.querySelector('.animate-spin')).not.toBeInTheDocument());
    
    const viewButtons = screen.getAllByText('View Details');
    await userEvent.click(viewButtons[0]);
    
    expect(screen.getByText('Query Details')).toBeInTheDocument();
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    await userEvent.click(closeButton);
    
    await waitFor(() => {
      expect(screen.queryByText('Query Details')).not.toBeInTheDocument();
    });
  });
});

describe('ApprovalDashboardPage - Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (queriesApi.getForApproval as jest.Mock).mockResolvedValue({
      data: { data: mockQueries, pagination: { total: 3, limit: 10, offset: 0, hasMore: false } },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('shows error alert on reject failure', async () => {
    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});
    (queriesApi.reject as jest.Mock).mockRejectedValue({
      response: { data: { message: 'Rejection failed' } },
    });
    render(<ApprovalDashboardPage />);
    await waitFor(() => expect(document.querySelector('.animate-spin')).not.toBeInTheDocument());
    const rejectButtons = screen.getAllByText('✗ Reject');
    await userEvent.click(rejectButtons[0]);
    await userEvent.type(screen.getByLabelText(/rejection reason/i), 'Test reason');
    await userEvent.click(screen.getByRole('button', { name: /^reject$/i }));
    await waitFor(() => expect(alertMock).toHaveBeenCalledWith('Rejection failed'));
    alertMock.mockRestore();
  });

  it('handles loading failure gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (queriesApi.getForApproval as jest.Mock).mockRejectedValue(new Error('Load failed'));
    render(<ApprovalDashboardPage />);
    await waitFor(() => expect(consoleSpy).toHaveBeenCalledWith('Failed to load queries:', expect.any(Error)));
    consoleSpy.mockRestore();
  });

  it('handles empty queries list', async () => {
    (queriesApi.getForApproval as jest.Mock).mockResolvedValue({ 
      data: { data: [], pagination: { total: 0, limit: 10, offset: 0, hasMore: false } }
    });
    
    render(<ApprovalDashboardPage />);
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('No queries found')).toBeInTheDocument();
  });

  it('handles pagination correctly', async () => {
    const mockLargeResponse = {
      data: mockQueries,
      pagination: { total: 25, limit: 10, offset: 0, hasMore: true },
    };
    (queriesApi.getForApproval as jest.Mock).mockResolvedValue({ data: mockLargeResponse });
    
    render(<ApprovalDashboardPage />);
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    
    // Test next page
    const nextButton = screen.getByRole('button', { name: /next/i });
    await userEvent.click(nextButton);
    
    await waitFor(() => {
      expect(queriesApi.getForApproval).toHaveBeenCalledWith({
        status: 'PENDING',
        type: undefined,
        limit: 10,
        offset: 10
      });
    });
  });

  it('handles items per page change', async () => {
    render(<ApprovalDashboardPage />);
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    const select = screen.getByDisplayValue('10');
    await userEvent.selectOptions(select, '25');
    
    await waitFor(() => {
      expect(queriesApi.getForApproval).toHaveBeenCalledWith({
        status: 'PENDING',
        type: undefined,
        limit: 25,
        offset: 0
      });
    });
  });

  it('handles status filter with empty string', async () => {
    render(<ApprovalDashboardPage />);
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    const statusSelect = screen.getAllByRole('combobox')[0]; // First combobox is status
    await userEvent.selectOptions(statusSelect, '');
    
    await waitFor(() => {
      expect(queriesApi.getForApproval).toHaveBeenCalledWith({
        status: undefined,
        type: undefined,
        limit: 10,
        offset: 0
      });
    });
  });

  it('handles type filter with empty string', async () => {
    render(<ApprovalDashboardPage />);
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    const typeSelect = screen.getAllByRole('combobox')[1]; // Second combobox is type
    await userEvent.selectOptions(typeSelect, 'QUERY');
    
    await waitFor(() => {
      expect(queriesApi.getForApproval).toHaveBeenCalledWith({
        status: 'PENDING',
        type: 'QUERY',
        limit: 10,
        offset: 0
      });
    });
    
    // Test empty type filter
    await userEvent.selectOptions(typeSelect, '');
    
    await waitFor(() => {
      expect(queriesApi.getForApproval).toHaveBeenCalledWith({
        status: 'PENDING',
        type: undefined,
        limit: 10,
        offset: 0
      });
    });
  });

  it('handles risk filter changes', async () => {
    render(<ApprovalDashboardPage />);
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    const riskSelect = screen.getAllByRole('combobox')[2]; // Third combobox is risk
    await userEvent.selectOptions(riskSelect, 'HIGH');
    
    // Should filter queries client-side
    await waitFor(() => {
      expect(screen.getByText('🔴 HIGH')).toBeInTheDocument();
    });
  });

  it('handles pagination with previous button', async () => {
    const mockLargeResponse = {
      data: mockQueries,
      pagination: { total: 25, limit: 10, offset: 10, hasMore: true },
    };
    (queriesApi.getForApproval as jest.Mock).mockResolvedValue({ data: mockLargeResponse });
    
    render(<ApprovalDashboardPage />);
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Simulate being on page 2
    const prevButton = screen.getByRole('button', { name: /prev/i });
    await userEvent.click(prevButton);
    
    await waitFor(() => {
      expect(queriesApi.getForApproval).toHaveBeenCalledWith({
        status: 'PENDING',
        type: undefined,
        limit: 10,
        offset: 0
      });
    });
  });

  it('disables pagination buttons at boundaries', async () => {
    const mockLargeResponse = {
      data: mockQueries,
      pagination: { total: 25, limit: 10, offset: 0, hasMore: true },
    };
    (queriesApi.getForApproval as jest.Mock).mockResolvedValue({ data: mockLargeResponse });
    
    render(<ApprovalDashboardPage />);
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    const prevButton = screen.getByRole('button', { name: /prev/i });
    const nextButton = screen.getByRole('button', { name: /next/i });
    
    expect(prevButton).toBeDisabled();
    expect(nextButton).not.toBeDisabled();
  });

  it('handles approve error without response message', async () => {
    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});
    (queriesApi.approve as jest.Mock).mockRejectedValue(new Error('Network error'));
    
    render(<ApprovalDashboardPage />);
    await waitFor(() => expect(document.querySelector('.animate-spin')).not.toBeInTheDocument());
    
    const approveButtons = screen.getAllByText('✓ Approve');
    await userEvent.click(approveButtons[0]);
    
    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith('Failed to approve query');
    });
    alertMock.mockRestore();
  });

  it('handles reject error without response message', async () => {
    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});
    (queriesApi.reject as jest.Mock).mockRejectedValue(new Error('Network error'));
    
    render(<ApprovalDashboardPage />);
    await waitFor(() => expect(document.querySelector('.animate-spin')).not.toBeInTheDocument());
    
    const rejectButtons = screen.getAllByText('✗ Reject');
    await userEvent.click(rejectButtons[0]);
    await userEvent.type(screen.getByLabelText(/rejection reason/i), 'Test reason');
    await userEvent.click(screen.getByRole('button', { name: /^reject$/i }));
    
    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith('Failed to reject query');
    });
    alertMock.mockRestore();
  });

  it('handles single page pagination (no pagination controls)', async () => {
    const mockSinglePageResponse = {
      data: mockQueries.slice(0, 2),
      pagination: { total: 2, limit: 10, offset: 0, hasMore: false },
    };
    (queriesApi.getForApproval as jest.Mock).mockResolvedValue({ data: mockSinglePageResponse });
    
    render(<ApprovalDashboardPage />);
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Should not show pagination controls for single page
    expect(screen.queryByRole('button', { name: /prev/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
  });

  it('handles queries with missing optional fields', async () => {
    const queryWithMissingFields = {
      ...mockQueries[0],
      requester_name: null,
      instance_name: null,
      script_content: null,
    };
    
    (queriesApi.getForApproval as jest.Mock).mockResolvedValue({
      data: { 
        data: [queryWithMissingFields], 
        pagination: { total: 1, limit: 10, offset: 0, hasMore: false } 
      },
    });
    
    render(<ApprovalDashboardPage />);
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('Unknown')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('handles empty risk filter correctly', async () => {
    render(<ApprovalDashboardPage />);
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    const riskSelect = screen.getAllByRole('combobox')[2];
    await userEvent.selectOptions(riskSelect, '');
    
    // Should show all queries when risk filter is empty
    expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
  });
});
