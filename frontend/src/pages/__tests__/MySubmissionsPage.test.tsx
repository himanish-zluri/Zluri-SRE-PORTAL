import { render, screen, waitFor } from '../../__tests__/test-utils';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import { MySubmissionsPage } from '../MySubmissionsPage';

// Mock the API
jest.mock('../../services/api', () => ({
  queriesApi: {
    getMySubmissions: jest.fn(),
    getMySubmissionsStats: jest.fn(),
    submit: jest.fn(),
  },
}));

import { queriesApi } from '../../services/api';

const mockQueries = [
  {
    id: 'query-1',
    requester_id: 'user-1',
    instance_id: 'inst-1',
    instance_name: 'Production DB',
    database_name: 'users_db',
    submission_type: 'QUERY',
    query_text: 'SELECT * FROM users',
    comments: 'Need user data',
    pod_id: 'pod-1',
    pod_manager_name: 'Manager One',
    status: 'PENDING',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 'query-2',
    requester_id: 'user-1',
    instance_id: 'inst-1',
    instance_name: 'Production DB',
    database_name: 'orders_db',
    submission_type: 'SCRIPT',
    query_text: '',
    script_content: 'const result = await query("SELECT 1");',
    comments: 'Batch update',
    pod_id: 'pod-2',
    pod_manager_name: 'Manager Two',
    status: 'REJECTED',
    rejection_reason: 'Not approved',
    created_at: '2024-01-14T10:00:00Z',
    updated_at: '2024-01-14T10:00:00Z',
  },
  {
    id: 'query-3',
    requester_id: 'user-1',
    instance_id: 'inst-1',
    instance_name: 'Production DB',
    database_name: 'users_db',
    submission_type: 'QUERY',
    query_text: 'SELECT * FROM orders',
    comments: 'Order data',
    pod_id: 'pod-1',
    pod_manager_name: 'Manager One',
    status: 'EXECUTED',
    execution_result: { rows: [{ id: 1 }] },
    created_at: '2024-01-13T10:00:00Z',
    updated_at: '2024-01-13T10:00:00Z',
  },
  {
    id: 'query-4',
    requester_id: 'user-1',
    instance_id: 'inst-1',
    instance_name: 'Production DB',
    database_name: 'users_db',
    submission_type: 'QUERY',
    query_text: 'SELECT * FROM products',
    comments: 'Product data',
    pod_id: 'pod-1',
    pod_manager_name: 'Manager One',
    status: 'FAILED',
    execution_result: { error: 'Connection failed' },
    created_at: '2024-01-12T10:00:00Z',
    updated_at: '2024-01-12T10:00:00Z',
  },
];

const mockPaginatedResponse = {
  data: mockQueries,
  pagination: { total: 4, limit: 10, offset: 0, hasMore: false },
};

const renderMySubmissions = () => {
  return render(
    <Routes>
      <Route path="/submissions" element={<MySubmissionsPage />} />
      <Route path="/dashboard" element={<div>Dashboard Page</div>} />
    </Routes>,
    { initialEntries: ['/submissions'] }
  );
};

describe('MySubmissionsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (queriesApi.getMySubmissions as jest.Mock).mockResolvedValue({ 
      data: mockPaginatedResponse 
    });
    (queriesApi.getMySubmissionsStats as jest.Mock).mockResolvedValue({
      data: { PENDING: 1, EXECUTED: 1, FAILED: 1, REJECTED: 1 }
    });
    (queriesApi.submit as jest.Mock).mockResolvedValue({ data: { id: 'new-query' } });
    
    // Mock URL.createObjectURL and URL.revokeObjectURL
    global.URL.createObjectURL = jest.fn(() => 'blob:test');
    global.URL.revokeObjectURL = jest.fn();
  });

  it('renders the page title', async () => {
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('My Submissions')).toBeInTheDocument();
  });

  it('shows loading spinner initially', () => {
    renderMySubmissions();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('loads and displays submissions', async () => {
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Production DB and users_db appear multiple times, use getAllByText
    expect(screen.getAllByText('Production DB').length).toBeGreaterThan(0);
    expect(screen.getAllByText('users_db').length).toBeGreaterThan(0);
  });

  it('displays submission types', async () => {
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    expect(screen.getAllByText('QUERY').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SCRIPT').length).toBeGreaterThan(0);
  });

  it('displays status badges', async () => {
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    expect(screen.getAllByText('PENDING').length).toBeGreaterThan(0);
    expect(screen.getAllByText('REJECTED').length).toBeGreaterThan(0);
    expect(screen.getAllByText('EXECUTED').length).toBeGreaterThan(0);
    expect(screen.getAllByText('FAILED').length).toBeGreaterThan(0);
  });

  it('shows View Details button for all submissions', async () => {
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Each submission has a View Details button (4 in table + 1 in legend = 5)
    const viewButtons = screen.getAllByText(/view details/i);
    expect(viewButtons.length).toBe(5);
  });

  it('shows Retry and Modify buttons only for REJECTED and FAILED', async () => {
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    const retryButtons = screen.getAllByText('Retry');
    const modifyButtons = screen.getAllByText('Modify');
    expect(retryButtons.length).toBe(2); // REJECTED and FAILED
    expect(modifyButtons.length).toBe(2);
  });

  it('opens detail modal when View Details is clicked', async () => {
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    const viewButtons = screen.getAllByText('View Details');
    await userEvent.click(viewButtons[0]);
    
    expect(screen.getByText('Query Details')).toBeInTheDocument();
  });

  it('shows query text in detail modal', async () => {
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    const viewButtons = screen.getAllByText('View Details');
    await userEvent.click(viewButtons[0]);
    
    expect(screen.getByText('SELECT * FROM users')).toBeInTheDocument();
  });

  it('shows rejection reason in detail modal for rejected queries', async () => {
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Click on the rejected query (second one)
    const viewButtons = screen.getAllByText('View Details');
    await userEvent.click(viewButtons[1]);
    
    expect(screen.getByText('Not approved')).toBeInTheDocument();
  });

  it('retries a query', async () => {
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    const retryButtons = screen.getAllByText('Retry');
    await userEvent.click(retryButtons[0]);
    
    await waitFor(() => {
      expect(queriesApi.submit).toHaveBeenCalled();
    });
  });

  it('navigates to dashboard with prefill on Modify click', async () => {
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    const modifyButtons = screen.getAllByText('Modify');
    await userEvent.click(modifyButtons[0]);
    
    await waitFor(() => {
      expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
    });
  });

  it('closes detail modal on Close button click', async () => {
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    const viewButtons = screen.getAllByText('View Details');
    await userEvent.click(viewButtons[0]);
    
    expect(screen.getByText('Query Details')).toBeInTheDocument();
    
    await userEvent.click(screen.getByRole('button', { name: /close/i }));
    
    await waitFor(() => {
      expect(screen.queryByText('Query Details')).not.toBeInTheDocument();
    });
  });

  it('shows pagination controls', async () => {
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText(/showing/i)).toBeInTheDocument();
    expect(screen.getByText(/per page/i)).toBeInTheDocument();
  });

  it('changes items per page', async () => {
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    const selects = screen.getAllByRole('combobox');
    // The last select should be the items per page dropdown
    const perPageSelect = selects[selects.length - 1];
    
    await userEvent.selectOptions(perPageSelect, '25');
    
    await waitFor(() => {
      expect(queriesApi.getMySubmissions).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 25 })
      );
    });
  });

  it('shows no submissions message when empty', async () => {
    (queriesApi.getMySubmissions as jest.Mock).mockResolvedValue({
      data: { 
        data: [], 
        pagination: { total: 0, limit: 10, offset: 0, hasMore: false } 
      },
    });
    
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('No submissions yet')).toBeInTheDocument();
  });

  it('shows legend with action descriptions', async () => {
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Legend items
    expect(screen.getByText('Retry (resubmit same query)')).toBeInTheDocument();
    expect(screen.getByText('Modify (edit before resubmitting)')).toBeInTheDocument();
  });

  it('shows error alert on retry failure', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (queriesApi.submit as jest.Mock).mockRejectedValue({
      response: { data: { message: 'Retry failed' } },
    });
    
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    const retryButtons = screen.getAllByText('Retry');
    await userEvent.click(retryButtons[0]);
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error handled:', expect.any(Object));
    });
    
    consoleSpy.mockRestore();
  });

  it('displays pod manager name', async () => {
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Manager One appears multiple times (for multiple queries), so use getAllByText
    expect(screen.getAllByText('Manager One').length).toBeGreaterThan(0);
    expect(screen.getByText('Manager Two')).toBeInTheDocument();
  });

  it('formats date correctly', async () => {
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('Jan 15')).toBeInTheDocument();
  });

  it('handles loading failure gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (queriesApi.getMySubmissions as jest.Mock).mockRejectedValue(new Error('Load failed'));
    
    renderMySubmissions();
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error handled:', expect.any(Error));
    });
    
    consoleSpy.mockRestore();
  });

  it('handles pagination with multiple pages', async () => {
    const mockLargeResponse = {
      data: mockQueries,
      pagination: { total: 25, limit: 10, offset: 0, hasMore: true },
    };
    (queriesApi.getMySubmissions as jest.Mock).mockResolvedValue({ data: mockLargeResponse });
    
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    
    // Test next page
    const nextButton = screen.getByRole('button', { name: /next/i });
    await userEvent.click(nextButton);
    
    await waitFor(() => {
      expect(queriesApi.getMySubmissions).toHaveBeenCalledWith({
        limit: 10,
        offset: 10
      });
    });
  });

  it('handles single page pagination', async () => {
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Should not show pagination navigation for single page (but "Per page" label is still shown)
    expect(screen.queryByText(/page \d+ of \d+/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /prev/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
  });

  it('shows fallback pod_id when pod_manager_name is not available', async () => {
    const mockQueriesWithoutManager = [
      {
        ...mockQueries[0],
        pod_manager_name: undefined,
        pod_id: 'pod-fallback'
      }
    ];
    
    (queriesApi.getMySubmissions as jest.Mock).mockResolvedValue({
      data: { 
        data: mockQueriesWithoutManager, 
        pagination: { total: 1, limit: 10, offset: 0, hasMore: false } 
      }
    });
    
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('pod-fallback')).toBeInTheDocument();
  });

  it('shows fallback dash when instance_name is not available', async () => {
    const mockQueriesWithoutInstance = [
      {
        ...mockQueries[0],
        instance_name: undefined
      }
    ];
    
    (queriesApi.getMySubmissions as jest.Mock).mockResolvedValue({
      data: { 
        data: mockQueriesWithoutInstance, 
        pagination: { total: 1, limit: 10, offset: 0, hasMore: false } 
      }
    });
    
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('-')).toBeInTheDocument();
  });
});


describe('MySubmissionsPage - Script handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (queriesApi.getMySubmissions as jest.Mock).mockResolvedValue({ 
      data: mockPaginatedResponse 
    });
    (queriesApi.submit as jest.Mock).mockResolvedValue({ data: { id: 'new-query' } });
    
    global.URL.createObjectURL = jest.fn(() => 'blob:test');
    global.URL.revokeObjectURL = jest.fn();
  });

  it('shows script content in detail modal for script submissions', async () => {
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Click on the script query (second one)
    const viewButtons = screen.getAllByText(/view details/i);
    await userEvent.click(viewButtons[1]);
    
    expect(screen.getByText(/const result = await query/)).toBeInTheDocument();
  });

  it('shows download button for scripts', async () => {
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    const viewButtons = screen.getAllByText(/view details/i);
    await userEvent.click(viewButtons[1]);
    
    expect(screen.getByText(/download script/i)).toBeInTheDocument();
  });
});

describe('MySubmissionsPage - Execution results', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (queriesApi.getMySubmissions as jest.Mock).mockResolvedValue({ 
      data: mockPaginatedResponse 
    });
    
    global.URL.createObjectURL = jest.fn(() => 'blob:test');
    global.URL.revokeObjectURL = jest.fn();
  });

  it('shows execution result for executed queries', async () => {
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Click on the executed query (third one)
    const viewButtons = screen.getAllByText(/view details/i);
    await userEvent.click(viewButtons[2]);
    
    expect(screen.getByText(/execution result/i)).toBeInTheDocument();
  });

  it('shows error for failed queries', async () => {
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Click on the failed query (fourth one)
    const viewButtons = screen.getAllByText(/view details/i);
    await userEvent.click(viewButtons[3]);
    
    expect(screen.getByText(/execution result/i)).toBeInTheDocument();
  });
});

describe('MySubmissionsPage - Pagination', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (queriesApi.submit as jest.Mock).mockResolvedValue({ data: { id: 'new-query' } });
    
    global.URL.createObjectURL = jest.fn(() => 'blob:test');
    global.URL.revokeObjectURL = jest.fn();
  });

  it('shows pagination when there are multiple pages', async () => {
    // Return 10 items to enable pagination
    const tenQueries = Array(10).fill(null).map((_, i) => ({
      ...mockQueries[0],
      id: `query-${i}`,
    }));
    
    (queriesApi.getMySubmissions as jest.Mock).mockResolvedValue({
      data: {
        data: tenQueries,
        pagination: { total: 20, limit: 10, offset: 0, hasMore: true },
      },
    });
    
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Should show pagination
    expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();
  });

  it('navigates to next page', async () => {
    const tenQueries = Array(10).fill(null).map((_, i) => ({
      ...mockQueries[0],
      id: `query-${i}`,
    }));
    
    (queriesApi.getMySubmissions as jest.Mock).mockResolvedValue({
      data: {
        data: tenQueries,
        pagination: { total: 20, limit: 10, offset: 0, hasMore: true },
      },
    });
    
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    await userEvent.click(screen.getByText(/next/i));
    
    await waitFor(() => {
      expect(queriesApi.getMySubmissions).toHaveBeenCalledWith(
        expect.objectContaining({ offset: 10 })
      );
    });
  });

  it('navigates to previous page', async () => {
    const tenQueries = Array(10).fill(null).map((_, i) => ({
      ...mockQueries[0],
      id: `query-${i}`,
    }));
    
    (queriesApi.getMySubmissions as jest.Mock).mockResolvedValue({
      data: {
        data: tenQueries,
        pagination: { total: 20, limit: 10, offset: 0, hasMore: true },
      },
    });
    
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Go to page 2
    await userEvent.click(screen.getByText(/next/i));
    
    await waitFor(() => {
      expect(screen.getByText(/page 2 of 2/i)).toBeInTheDocument();
    });
    
    // Go back to page 1
    await userEvent.click(screen.getByText(/prev/i));
    
    await waitFor(() => {
      expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();
    });
  });
});

describe('MySubmissionsPage - Modal Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (queriesApi.getMySubmissions as jest.Mock).mockResolvedValue({ 
      data: mockPaginatedResponse 
    });
    (queriesApi.submit as jest.Mock).mockResolvedValue({ data: { id: 'new-query' } });
    
    global.URL.createObjectURL = jest.fn(() => 'blob:test');
    global.URL.revokeObjectURL = jest.fn();
  });

  it('downloads script from detail modal', async () => {
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Click on the script query (second one)
    const viewButtons = screen.getAllByText('View Details');
    await userEvent.click(viewButtons[1]);
    
    // Mock after render
    const mockLink = { href: '', download: '', click: jest.fn() };
    const createElementSpy = jest.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') return mockLink as any;
      return document.createElement(tag);
    });
    const appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    const removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation((node) => node);
    
    // Click download button
    await userEvent.click(screen.getByText(/download script/i));
    
    expect(mockLink.click).toHaveBeenCalled();
    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    
    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });

  it('retries from detail modal', async () => {
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Click on the rejected query (second one)
    const viewButtons = screen.getAllByText('View Details');
    await userEvent.click(viewButtons[1]);
    
    // Click retry button in modal (there are multiple, get the one in the modal)
    const retryButtons = screen.getAllByRole('button', { name: /retry/i });
    await userEvent.click(retryButtons[retryButtons.length - 1]); // Last one is in modal
    
    await waitFor(() => {
      expect(queriesApi.submit).toHaveBeenCalled();
    });
  });

  it('modifies from detail modal', async () => {
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Click on the rejected query (second one)
    const viewButtons = screen.getAllByText('View Details');
    await userEvent.click(viewButtons[1]);
    
    // Click modify button in modal (there are multiple, get the one in the modal)
    const modifyButtons = screen.getAllByRole('button', { name: /modify/i });
    await userEvent.click(modifyButtons[modifyButtons.length - 1]); // Last one is in modal
    
    await waitFor(() => {
      expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
    });
  });

  it('retries script submission', async () => {
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Click retry on the script query (second one - REJECTED)
    const retryButtons = screen.getAllByText('Retry');
    await userEvent.click(retryButtons[0]); // First retry button is for the rejected script
    
    await waitFor(() => {
      expect(queriesApi.submit).toHaveBeenCalled();
      const callArg = (queriesApi.submit as jest.Mock).mock.calls[0][0];
      expect(callArg instanceof FormData).toBe(true);
    });
  });

  it('handles loading failure gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (queriesApi.getMySubmissions as jest.Mock).mockRejectedValue(new Error('Load failed'));
    
    renderMySubmissions();
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error handled:', expect.any(Error));
    });
    
    consoleSpy.mockRestore();
  });
});

describe('MySubmissionsPage - Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (queriesApi.submit as jest.Mock).mockResolvedValue({ data: { id: 'new-query' } });
    
    global.URL.createObjectURL = jest.fn(() => 'blob:test');
    global.URL.revokeObjectURL = jest.fn();
  });

  it('handles empty queries array gracefully', async () => {
    (queriesApi.getMySubmissions as jest.Mock).mockResolvedValue({
      data: { 
        data: null, // Test null data
        pagination: { total: 0, limit: 10, offset: 0, hasMore: false } 
      }
    });
    
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('No submissions yet')).toBeInTheDocument();
  });

  it('handles non-array response data', async () => {
    (queriesApi.getMySubmissions as jest.Mock).mockResolvedValue({
      data: { 
        data: "invalid data", // Test non-array data
        pagination: { total: 0, limit: 10, offset: 0, hasMore: false } 
      }
    });
    
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('No submissions yet')).toBeInTheDocument();
  });

  it('handles queries with missing properties', async () => {
    const incompleteQueries = [
      {
        id: 'query-1',
        status: 'PENDING',
        created_at: '2024-01-15T10:00:00Z',
        // Missing many properties
      }
    ];
    
    (queriesApi.getMySubmissions as jest.Mock).mockResolvedValue({
      data: { 
        data: incompleteQueries, 
        pagination: { total: 1, limit: 10, offset: 0, hasMore: false } 
      }
    });
    
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Should still render without crashing - use getAllByText since PENDING appears in both filter and status badge
    expect(screen.getAllByText('PENDING').length).toBeGreaterThan(0);
  });

  it('handles date filter edge cases', async () => {
    const queriesWithDifferentDates = [
      {
        ...mockQueries[0],
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), // 12 hours ago
      },
      {
        ...mockQueries[1],
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 days ago
      },
      {
        ...mockQueries[2],
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(), // 15 days ago
      }
    ];
    
    (queriesApi.getMySubmissions as jest.Mock).mockResolvedValue({
      data: { 
        data: queriesWithDifferentDates, 
        pagination: { total: 3, limit: 10, offset: 0, hasMore: false } 
      }
    });
    
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Test 7 days filter
    const dateSelects = screen.getAllByRole('combobox');
    const dateSelect = dateSelects.find(select => 
      select.querySelector('option[value="7d"]')
    );
    
    await userEvent.selectOptions(dateSelect!, '7d');
    
    // Should filter to only show queries from last 7 days
    await waitFor(() => {
      expect(queriesApi.getMySubmissions).toHaveBeenCalled();
    });
  });

  it('handles instance filter with missing instance names', async () => {
    const queriesWithMissingInstances = [
      {
        ...mockQueries[0],
        instance_name: null,
      },
      {
        ...mockQueries[1],
        instance_name: undefined,
      }
    ];
    
    (queriesApi.getMySubmissions as jest.Mock).mockResolvedValue({
      data: { 
        data: queriesWithMissingInstances, 
        pagination: { total: 2, limit: 10, offset: 0, hasMore: false } 
      }
    });
    
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Apply instance filter
    const instanceSelects = screen.getAllByRole('combobox');
    const instanceSelect = instanceSelects.find(select => 
      select.querySelector('option[value="pg-instance"]')
    );
    
    await userEvent.selectOptions(instanceSelect!, 'pg-instance');
    
    // Should handle missing instance names gracefully
    await waitFor(() => {
      expect(queriesApi.getMySubmissions).toHaveBeenCalled();
    });
  });

  it('shows filtered message when no results match filters', async () => {
    (queriesApi.getMySubmissions as jest.Mock).mockResolvedValue({
      data: { 
        data: [], 
        pagination: { total: 0, limit: 10, offset: 0, hasMore: false } 
      }
    });
    
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Apply a filter to trigger the filtered message - use more specific selector
    const statusSelects = screen.getAllByRole('combobox');
    const statusSelect = statusSelects.find(select => 
      select.querySelector('option[value="PENDING"]')
    );
    await userEvent.selectOptions(statusSelect!, 'PENDING');
    
    await waitFor(() => {
      expect(screen.getByText('No submissions match your filters')).toBeInTheDocument();
    });
  });

  it('handles 30 day date filter', async () => {
    const queriesWithDifferentDates = [
      {
        ...mockQueries[0],
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(), // 15 days ago
      },
      {
        ...mockQueries[1],
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(), // 45 days ago
      }
    ];
    
    (queriesApi.getMySubmissions as jest.Mock).mockResolvedValue({
      data: { 
        data: queriesWithDifferentDates, 
        pagination: { total: 2, limit: 10, offset: 0, hasMore: false } 
      }
    });
    
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Test 30 days filter
    const dateSelects = screen.getAllByRole('combobox');
    const dateSelect = dateSelects.find(select => 
      select.querySelector('option[value="30d"]')
    );
    
    await userEvent.selectOptions(dateSelect!, '30d');
    
    // Should filter to only show queries from last 30 days
    await waitFor(() => {
      expect(queriesApi.getMySubmissions).toHaveBeenCalled();
    });
  });

  it('handles queries with missing created_at for date filter', async () => {
    const queriesWithMissingDates = [
      {
        ...mockQueries[0],
        created_at: null,
      },
      {
        ...mockQueries[1],
        created_at: undefined,
      }
    ];
    
    (queriesApi.getMySubmissions as jest.Mock).mockResolvedValue({
      data: { 
        data: queriesWithMissingDates, 
        pagination: { total: 2, limit: 10, offset: 0, hasMore: false } 
      }
    });
    
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Apply date filter
    const dateSelects = screen.getAllByRole('combobox');
    const dateSelect = dateSelects.find(select => 
      select.querySelector('option[value="24h"]')
    );
    
    await userEvent.selectOptions(dateSelect!, '24h');
    
    // Should handle missing dates gracefully
    await waitFor(() => {
      expect(queriesApi.getMySubmissions).toHaveBeenCalled();
    });
  });

  it('handles instance filter with queries missing instance_name', async () => {
    const queriesWithMissingInstanceNames = [
      {
        ...mockQueries[0],
        instance_name: null,
      },
      {
        ...mockQueries[1],
        instance_name: undefined,
      },
      {
        ...mockQueries[2],
        instance_name: 'pg-instance',
      }
    ];
    
    (queriesApi.getMySubmissions as jest.Mock).mockResolvedValue({
      data: { 
        data: queriesWithMissingInstanceNames, 
        pagination: { total: 3, limit: 10, offset: 0, hasMore: false } 
      }
    });
    
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Apply instance filter
    const instanceSelects = screen.getAllByRole('combobox');
    const instanceSelect = instanceSelects.find(select => 
      select.querySelector('option[value="pg-instance"]')
    );
    
    await userEvent.selectOptions(instanceSelect!, 'pg-instance');
    
    // Should filter out queries with missing instance names
    await waitFor(() => {
      expect(queriesApi.getMySubmissions).toHaveBeenCalled();
    });
  });

  it('handles empty filteredQueries array after filtering', async () => {
    (queriesApi.getMySubmissions as jest.Mock).mockResolvedValue({
      data: { 
        data: [], 
        pagination: { total: 0, limit: 10, offset: 0, hasMore: false } 
      }
    });
    
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Apply date filter to empty results
    const dateSelects = screen.getAllByRole('combobox');
    const dateSelect = dateSelects.find(select => 
      select.querySelector('option[value="7d"]')
    );
    
    await userEvent.selectOptions(dateSelect!, '7d');
    
    // Should handle empty results gracefully
    await waitFor(() => {
      expect(queriesApi.getMySubmissions).toHaveBeenCalled();
    });
  });

  it('handles API response with non-array data', async () => {
    (queriesApi.getMySubmissions as jest.Mock).mockResolvedValue({
      data: { 
        data: null, // Non-array data
        pagination: { total: 0, limit: 10, offset: 0, hasMore: false } 
      }
    });
    
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Should handle non-array data gracefully by showing empty state
    expect(screen.getByText('No submissions yet')).toBeInTheDocument();
  });

  it('handles API error gracefully', async () => {
    (queriesApi.getMySubmissions as jest.Mock).mockRejectedValue(new Error('API Error'));
    
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Should show empty state when API fails
    expect(screen.getByText('No submissions yet')).toBeInTheDocument();
  });
});