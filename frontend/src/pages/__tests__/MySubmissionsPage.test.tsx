import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { MySubmissionsPage } from '../MySubmissionsPage';

// Mock the API
jest.mock('../../services/api', () => ({
  queriesApi: {
    getMySubmissions: jest.fn(),
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
    <MemoryRouter initialEntries={['/submissions']}>
      <Routes>
        <Route path="/submissions" element={<MySubmissionsPage />} />
        <Route path="/dashboard" element={<div>Dashboard Page</div>} />
      </Routes>
    </MemoryRouter>
  );
};

describe('MySubmissionsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (queriesApi.getMySubmissions as jest.Mock).mockResolvedValue({ 
      data: mockPaginatedResponse 
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
    expect(screen.getByText('SCRIPT')).toBeInTheDocument();
  });

  it('displays status badges', async () => {
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('PENDING')).toBeInTheDocument();
    expect(screen.getByText('REJECTED')).toBeInTheDocument();
    expect(screen.getByText('EXECUTED')).toBeInTheDocument();
    expect(screen.getByText('FAILED')).toBeInTheDocument();
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
    
    const retryButtons = screen.getAllByText('🔄 Retry');
    const modifyButtons = screen.getAllByText('✏️ Modify');
    expect(retryButtons.length).toBe(2); // REJECTED and FAILED
    expect(modifyButtons.length).toBe(2);
  });

  it('opens detail modal when View Details is clicked', async () => {
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    const viewButtons = screen.getAllByText('👁️ View Details');
    await userEvent.click(viewButtons[0]);
    
    expect(screen.getByText('Query Details')).toBeInTheDocument();
  });

  it('shows query text in detail modal', async () => {
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    const viewButtons = screen.getAllByText('👁️ View Details');
    await userEvent.click(viewButtons[0]);
    
    expect(screen.getByText('SELECT * FROM users')).toBeInTheDocument();
  });

  it('shows rejection reason in detail modal for rejected queries', async () => {
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    // Click on the rejected query (second one)
    const viewButtons = screen.getAllByText('👁️ View Details');
    await userEvent.click(viewButtons[1]);
    
    expect(screen.getByText('Not approved')).toBeInTheDocument();
  });

  it('retries a query', async () => {
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    const retryButtons = screen.getAllByText('🔄 Retry');
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
    
    const modifyButtons = screen.getAllByText('✏️ Modify');
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
    
    const viewButtons = screen.getAllByText('👁️ View Details');
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
    const perPageSelect = selects[0];
    
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
    expect(screen.getByText('🔄 Retry (resubmit same query)')).toBeInTheDocument();
    expect(screen.getByText('✏️ Modify (edit before resubmitting)')).toBeInTheDocument();
  });

  it('shows error alert on retry failure', async () => {
    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});
    (queriesApi.submit as jest.Mock).mockRejectedValue({
      response: { data: { message: 'Retry failed' } },
    });
    
    renderMySubmissions();
    
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    
    const retryButtons = screen.getAllByText('🔄 Retry');
    await userEvent.click(retryButtons[0]);
    
    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith('Retry failed');
    });
    
    alertMock.mockRestore();
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
    const viewButtons = screen.getAllByText('👁️ View Details');
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
    const viewButtons = screen.getAllByText('👁️ View Details');
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
    const viewButtons = screen.getAllByText('👁️ View Details');
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
    const retryButtons = screen.getAllByText('🔄 Retry');
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
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load queries:', expect.any(Error));
    });
    
    consoleSpy.mockRestore();
  });
});
