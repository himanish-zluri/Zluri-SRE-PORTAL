import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from '../DashboardPage';
import { ErrorProvider } from '../../context/ErrorContext';

// Mock the API
jest.mock('../../services/api', () => ({
  instancesApi: {
    getAll: jest.fn(),
  },
  databasesApi: {
    getByInstance: jest.fn(),
  },
  podsApi: {
    getAll: jest.fn(),
  },
  queriesApi: {
    submit: jest.fn(),
  },
}));

import { instancesApi, databasesApi, podsApi, queriesApi } from '../../services/api';

const mockInstances = [
  { id: 'inst-1', name: 'Production DB', type: 'POSTGRES' },
  { id: 'inst-2', name: 'Dev DB', type: 'POSTGRES' },
];

const mockMongoInstances = [
  { id: 'mongo-1', name: 'Mongo Prod', type: 'MONGODB' },
];

const mockDatabases = [
  { database_name: 'users_db' },
  { database_name: 'orders_db' },
];

const mockPods = [
  { id: 'pod-1', name: 'Engineering', manager_id: 'm1', manager_name: 'Manager 1', created_at: '2024-01-01' },
  { id: 'pod-2', name: 'Data Team', manager_id: 'm2', manager_name: 'Manager 2', created_at: '2024-01-01' },
];

const renderDashboard = (locationState?: any) => {
  return render(
    <ErrorProvider>
      <MemoryRouter initialEntries={[{ pathname: '/dashboard', state: locationState }]}>
        <DashboardPage />
      </MemoryRouter>
    </ErrorProvider>
  );
};

// Helper to get database select element
const getDatabaseSelect = () => document.getElementById('database') as HTMLSelectElement;

describe('DashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (podsApi.getAll as jest.Mock).mockResolvedValue({ data: mockPods });
    (instancesApi.getAll as jest.Mock).mockImplementation((type) => {
      if (type === 'POSTGRES') return Promise.resolve({ data: mockInstances });
      if (type === 'MONGODB') return Promise.resolve({ data: mockMongoInstances });
      return Promise.resolve({ data: [] });
    });
    (databasesApi.getByInstance as jest.Mock).mockResolvedValue({ data: mockDatabases });
    (queriesApi.submit as jest.Mock).mockResolvedValue({ data: { id: 'query-1' } });
  });

  it('renders the page title', async () => {
    renderDashboard();
    expect(screen.getByText('Submit Query Request')).toBeInTheDocument();
  });

  it('renders all form fields', async () => {
    renderDashboard();
    
    await waitFor(() => {
      expect(screen.getByLabelText(/database type/i)).toBeInTheDocument();
    });
    
    expect(screen.getByLabelText(/instance/i)).toBeInTheDocument();
    // Use id selector for database since label text includes required asterisk
    expect(document.getElementById('database')).toBeInTheDocument();
    expect(screen.getByLabelText(/pod/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/submission type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/comments/i)).toBeInTheDocument();
  });

  it('loads pods on mount', async () => {
    renderDashboard();
    
    await waitFor(() => {
      expect(podsApi.getAll).toHaveBeenCalled();
    });
  });

  it('loads instances when database type is selected', async () => {
    renderDashboard();
    
    const dbTypeSelect = screen.getByLabelText(/database type/i);
    await userEvent.selectOptions(dbTypeSelect, 'POSTGRES');
    
    await waitFor(() => {
      expect(instancesApi.getAll).toHaveBeenCalledWith('POSTGRES');
    });
  });

  it('loads databases when instance is selected', async () => {
    renderDashboard();
    
    // Select database type first
    await userEvent.selectOptions(screen.getByLabelText(/database type/i), 'POSTGRES');
    
    await waitFor(() => {
      expect(screen.getByLabelText(/instance/i)).not.toBeDisabled();
    });
    
    // Select instance
    await userEvent.selectOptions(screen.getByLabelText(/instance/i), 'inst-1');
    
    await waitFor(() => {
      expect(databasesApi.getByInstance).toHaveBeenCalledWith('inst-1');
    });
  });

  it('shows query textarea when submission type is QUERY', async () => {
    renderDashboard();
    
    await waitFor(() => {
      expect(screen.getByLabelText(/submission type/i)).toBeInTheDocument();
    });
    
    // Default is QUERY
    expect(screen.getByLabelText(/query/i)).toBeInTheDocument();
  });

  it('shows file upload when submission type is SCRIPT', async () => {
    renderDashboard();
    
    await waitFor(() => {
      expect(screen.getByLabelText(/submission type/i)).toBeInTheDocument();
    });
    
    await userEvent.selectOptions(screen.getByLabelText(/submission type/i), 'SCRIPT');
    
    // FileUpload component shows "Script File" label text
    expect(screen.getByText(/script file/i)).toBeInTheDocument();
    expect(screen.getByText(/click to upload/i)).toBeInTheDocument();
  });

  it('shows script documentation when SCRIPT type is selected', async () => {
    renderDashboard();
    
    // Select database type first to show documentation
    await userEvent.selectOptions(screen.getByLabelText(/database type/i), 'POSTGRES');
    await userEvent.selectOptions(screen.getByLabelText(/submission type/i), 'SCRIPT');
    
    await waitFor(() => {
      expect(screen.getByText(/How to Write Scripts/i)).toBeInTheDocument();
    });
  });

  it('shows PostgreSQL documentation for POSTGRES type', async () => {
    renderDashboard();
    
    await userEvent.selectOptions(screen.getByLabelText(/database type/i), 'POSTGRES');
    await userEvent.selectOptions(screen.getByLabelText(/submission type/i), 'SCRIPT');
    
    await waitFor(() => {
      // Look for the code element containing query()
      expect(screen.getByText('query()')).toBeInTheDocument();
    });
  });

  it('shows MongoDB documentation for MONGODB type', async () => {
    renderDashboard();
    
    await userEvent.selectOptions(screen.getByLabelText(/database type/i), 'MONGODB');
    await userEvent.selectOptions(screen.getByLabelText(/submission type/i), 'SCRIPT');
    
    await waitFor(() => {
      expect(screen.getByText(/db object is pre-injected/i)).toBeInTheDocument();
    });
  });

  it('submits query successfully', async () => {
    renderDashboard();
    
    // Fill out the form
    await userEvent.selectOptions(screen.getByLabelText(/database type/i), 'POSTGRES');
    
    await waitFor(() => {
      expect(screen.getByLabelText(/instance/i)).not.toBeDisabled();
    });
    
    await userEvent.selectOptions(screen.getByLabelText(/instance/i), 'inst-1');
    
    // Wait for databases to load
    await waitFor(() => {
      expect(databasesApi.getByInstance).toHaveBeenCalledWith('inst-1');
    });
    
    // Wait for database select to have options
    await waitFor(() => {
      const dbSelect = getDatabaseSelect();
      expect(dbSelect.options.length).toBeGreaterThan(1);
    });
    
    await userEvent.selectOptions(getDatabaseSelect(), 'users_db');
    await userEvent.selectOptions(screen.getByLabelText(/pod/i), 'pod-1');
    await userEvent.type(screen.getByLabelText(/query/i), 'SELECT * FROM users');
    await userEvent.type(screen.getByLabelText(/comments/i), 'Test query');
    
    await userEvent.click(screen.getByRole('button', { name: /submit for approval/i }));
    
    await waitFor(() => {
      expect(queriesApi.submit).toHaveBeenCalled();
    });
  });

  it('shows success message after successful submission', async () => {
    renderDashboard();
    
    // Fill out minimal form
    await userEvent.selectOptions(screen.getByLabelText(/database type/i), 'POSTGRES');
    await waitFor(() => expect(screen.getByLabelText(/instance/i)).not.toBeDisabled());
    await userEvent.selectOptions(screen.getByLabelText(/instance/i), 'inst-1');
    
    // Wait for databases to load
    await waitFor(() => {
      const dbSelect = getDatabaseSelect();
      expect(dbSelect.options.length).toBeGreaterThan(1);
    });
    
    await userEvent.selectOptions(getDatabaseSelect(), 'users_db');
    await userEvent.selectOptions(screen.getByLabelText(/pod/i), 'pod-1');
    await userEvent.type(screen.getByLabelText(/query/i), 'SELECT 1');
    await userEvent.type(screen.getByLabelText(/comments/i), 'Test');
    
    await userEvent.click(screen.getByRole('button', { name: /submit for approval/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/query submitted successfully/i)).toBeInTheDocument();
    });
  });

  it('shows error message on submission failure', async () => {
    (queriesApi.submit as jest.Mock).mockRejectedValue({
      response: { data: { message: 'Submission failed' } },
    });
    
    renderDashboard();
    
    await userEvent.selectOptions(screen.getByLabelText(/database type/i), 'POSTGRES');
    await waitFor(() => expect(screen.getByLabelText(/instance/i)).not.toBeDisabled());
    await userEvent.selectOptions(screen.getByLabelText(/instance/i), 'inst-1');
    
    // Wait for databases to load
    await waitFor(() => {
      const dbSelect = getDatabaseSelect();
      expect(dbSelect.options.length).toBeGreaterThan(1);
    });
    
    await userEvent.selectOptions(getDatabaseSelect(), 'users_db');
    await userEvent.selectOptions(screen.getByLabelText(/pod/i), 'pod-1');
    await userEvent.type(screen.getByLabelText(/query/i), 'SELECT 1');
    await userEvent.type(screen.getByLabelText(/comments/i), 'Test');
    
    await userEvent.click(screen.getByRole('button', { name: /submit for approval/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Submission failed')).toBeInTheDocument();
    });
  });

  it('shows error when submitting script without file', async () => {
    renderDashboard();
    
    await userEvent.selectOptions(screen.getByLabelText(/database type/i), 'POSTGRES');
    await waitFor(() => expect(screen.getByLabelText(/instance/i)).not.toBeDisabled());
    await userEvent.selectOptions(screen.getByLabelText(/instance/i), 'inst-1');
    
    // Wait for databases to load
    await waitFor(() => {
      const dbSelect = getDatabaseSelect();
      expect(dbSelect.options.length).toBeGreaterThan(1);
    });
    
    await userEvent.selectOptions(getDatabaseSelect(), 'users_db');
    await userEvent.selectOptions(screen.getByLabelText(/pod/i), 'pod-1');
    await userEvent.selectOptions(screen.getByLabelText(/submission type/i), 'SCRIPT');
    await userEvent.type(screen.getByLabelText(/comments/i), 'Test');
    
    await userEvent.click(screen.getByRole('button', { name: /submit for approval/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/please upload a script file/i)).toBeInTheDocument();
    });
  });

  it('resets form after successful submission', async () => {
    renderDashboard();
    
    await userEvent.selectOptions(screen.getByLabelText(/database type/i), 'POSTGRES');
    await waitFor(() => expect(screen.getByLabelText(/instance/i)).not.toBeDisabled());
    await userEvent.selectOptions(screen.getByLabelText(/instance/i), 'inst-1');
    
    // Wait for databases to load
    await waitFor(() => {
      const dbSelect = getDatabaseSelect();
      expect(dbSelect.options.length).toBeGreaterThan(1);
    });
    
    await userEvent.selectOptions(getDatabaseSelect(), 'users_db');
    await userEvent.selectOptions(screen.getByLabelText(/pod/i), 'pod-1');
    await userEvent.type(screen.getByLabelText(/query/i), 'SELECT 1');
    await userEvent.type(screen.getByLabelText(/comments/i), 'Test');
    
    await userEvent.click(screen.getByRole('button', { name: /submit for approval/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/query submitted successfully/i)).toBeInTheDocument();
    });
    
    // Form should be reset
    expect(screen.getByLabelText(/database type/i)).toHaveValue('');
  });

  it('disables instance select when no database type selected', async () => {
    renderDashboard();
    
    await waitFor(() => {
      expect(screen.getByText('Submit Query Request')).toBeInTheDocument();
    });
    
    // Find the instance select by its id
    const instanceSelect = document.getElementById('instance') as HTMLSelectElement;
    expect(instanceSelect).toBeDisabled();
  });

  it('disables database select when no instance selected', async () => {
    renderDashboard();
    
    await waitFor(() => {
      expect(screen.getByText('Submit Query Request')).toBeInTheDocument();
    });
    
    // The Database select has id "database"
    const databaseSelect = document.getElementById('database') as HTMLSelectElement;
    expect(databaseSelect).toBeDisabled();
  });
});


describe('DashboardPage - Prefill functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (podsApi.getAll as jest.Mock).mockResolvedValue({ data: mockPods });
    (instancesApi.getAll as jest.Mock).mockImplementation((type) => {
      if (type === 'POSTGRES') return Promise.resolve({ data: mockInstances });
      if (type === 'MONGODB') return Promise.resolve({ data: mockMongoInstances });
      return Promise.resolve({ data: [] });
    });
    (databasesApi.getByInstance as jest.Mock).mockResolvedValue({ data: mockDatabases });
    (queriesApi.submit as jest.Mock).mockResolvedValue({ data: { id: 'query-1' } });
  });

  it('prefills form when navigated with prefill state for QUERY', async () => {
    const prefillData = {
      prefill: {
        instanceId: 'inst-1',
        databaseName: 'users_db',
        queryText: 'SELECT * FROM users',
        comments: 'Test comment',
        podId: 'pod-1',
        submissionType: 'QUERY' as const,
      }
    };
    
    renderDashboard(prefillData);
    
    // Wait for prefill to complete
    await waitFor(() => {
      expect(screen.getByLabelText(/database type/i)).toHaveValue('POSTGRES');
    }, { timeout: 3000 });
    
    expect(screen.getByLabelText(/instance/i)).toHaveValue('inst-1');
    expect(screen.getByLabelText(/comments/i)).toHaveValue('Test comment');
  });

  it('prefills form when navigated with prefill state for SCRIPT', async () => {
    const prefillData = {
      prefill: {
        instanceId: 'inst-1',
        databaseName: 'users_db',
        queryText: '',
        scriptContent: 'const result = await query("SELECT 1");',
        comments: 'Script test',
        podId: 'pod-1',
        submissionType: 'SCRIPT' as const,
      }
    };
    
    renderDashboard(prefillData);
    
    // Wait for prefill to complete
    await waitFor(() => {
      expect(screen.getByLabelText(/submission type/i)).toHaveValue('SCRIPT');
    }, { timeout: 3000 });
    
    expect(screen.getByText(/script file/i)).toBeInTheDocument();
  });

  it('shows loading spinner during prefill initialization', async () => {
    const prefillData = {
      prefill: {
        instanceId: 'inst-1',
        databaseName: 'users_db',
        queryText: 'SELECT 1',
        comments: 'Test',
        podId: 'pod-1',
        submissionType: 'QUERY' as const,
      }
    };
    
    renderDashboard(prefillData);
    
    // Should show loading initially
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    
    // Wait for loading to finish
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('handles prefill with unknown instance gracefully', async () => {
    const prefillData = {
      prefill: {
        instanceId: 'unknown-inst',
        databaseName: 'users_db',
        queryText: 'SELECT 1',
        comments: 'Test',
        podId: 'pod-1',
        submissionType: 'QUERY' as const,
      }
    };
    
    renderDashboard(prefillData);
    
    // Should finish loading even with unknown instance
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    }, { timeout: 3000 });
    
    // Form should be empty since instance wasn't found
    expect(screen.getByLabelText(/database type/i)).toHaveValue('');
  });
});

describe('DashboardPage - Error handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (podsApi.getAll as jest.Mock).mockResolvedValue({ data: mockPods });
    (instancesApi.getAll as jest.Mock).mockImplementation((type) => {
      if (type === 'POSTGRES') return Promise.resolve({ data: mockInstances });
      if (type === 'MONGODB') return Promise.resolve({ data: mockMongoInstances });
      return Promise.resolve({ data: [] });
    });
    (databasesApi.getByInstance as jest.Mock).mockResolvedValue({ data: mockDatabases });
  });

  it('handles pods loading failure gracefully', async () => {
    (podsApi.getAll as jest.Mock).mockRejectedValue(new Error('Failed to load pods'));
    
    renderDashboard();
    
    // Wait for the error to be handled - it shows in the error toast
    await waitFor(() => {
      expect(screen.getByText('Network error. Please check your connection.')).toBeInTheDocument();
    });
  });

  it('handles instances loading failure gracefully', async () => {
    (instancesApi.getAll as jest.Mock).mockRejectedValue(new Error('Failed to load instances'));
    
    renderDashboard();
    
    await userEvent.selectOptions(screen.getByLabelText(/database type/i), 'POSTGRES');
    
    // Wait for the error to be handled - it shows in the error toast
    await waitFor(() => {
      expect(screen.getByText('Network error. Please check your connection.')).toBeInTheDocument();
    });
  });

  it('handles databases loading failure gracefully', async () => {
    (databasesApi.getByInstance as jest.Mock).mockRejectedValue(new Error('Failed to load databases'));
    
    renderDashboard();
    
    await userEvent.selectOptions(screen.getByLabelText(/database type/i), 'POSTGRES');
    await waitFor(() => expect(screen.getByLabelText(/instance/i)).not.toBeDisabled());
    await userEvent.selectOptions(screen.getByLabelText(/instance/i), 'inst-1');
    
    // Wait for the error to be handled - it shows in the error toast
    await waitFor(() => {
      expect(screen.getByText('Network error. Please check your connection.')).toBeInTheDocument();
    });
  });

  it('shows default error message when submission fails without message', async () => {
    (queriesApi.submit as jest.Mock).mockRejectedValue(new Error('Network error'));
    
    renderDashboard();
    
    await userEvent.selectOptions(screen.getByLabelText(/database type/i), 'POSTGRES');
    await waitFor(() => expect(screen.getByLabelText(/instance/i)).not.toBeDisabled());
    await userEvent.selectOptions(screen.getByLabelText(/instance/i), 'inst-1');
    
    await waitFor(() => {
      const dbSelect = getDatabaseSelect();
      expect(dbSelect.options.length).toBeGreaterThan(1);
    });
    
    await userEvent.selectOptions(getDatabaseSelect(), 'users_db');
    await userEvent.selectOptions(screen.getByLabelText(/pod/i), 'pod-1');
    await userEvent.type(screen.getByLabelText(/query/i), 'SELECT 1');
    await userEvent.type(screen.getByLabelText(/comments/i), 'Test');
    
    await userEvent.click(screen.getByRole('button', { name: /submit for approval/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Network error. Please check your connection.')).toBeInTheDocument();
    });
  });

  it('clears instances when database type is changed', async () => {
    renderDashboard();
    
    // Select database type
    await userEvent.selectOptions(screen.getByLabelText(/database type/i), 'POSTGRES');
    await waitFor(() => expect(screen.getByLabelText(/instance/i)).not.toBeDisabled());
    
    // Select an instance
    await userEvent.selectOptions(screen.getByLabelText(/instance/i), 'inst-1');
    
    // Change database type - this should reset instance
    await userEvent.selectOptions(screen.getByLabelText(/database type/i), 'MONGODB');
    
    // Instance should be reset to empty
    await waitFor(() => {
      expect(screen.getByLabelText(/instance/i)).toHaveValue('');
    });
  });

  it('clears databases when instance is cleared', async () => {
    renderDashboard();
    
    await userEvent.selectOptions(screen.getByLabelText(/database type/i), 'POSTGRES');
    await waitFor(() => expect(screen.getByLabelText(/instance/i)).not.toBeDisabled());
    await userEvent.selectOptions(screen.getByLabelText(/instance/i), 'inst-1');
    
    await waitFor(() => {
      const dbSelect = getDatabaseSelect();
      expect(dbSelect.options.length).toBeGreaterThan(1);
    });
    
    // Select a different database type to trigger reset
    await userEvent.selectOptions(screen.getByLabelText(/database type/i), 'MONGODB');
    
    // Instance should be reset
    await waitFor(() => {
      expect(screen.getByLabelText(/instance/i)).toHaveValue('');
    });
  });
});

describe('DashboardPage - Script submission', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (podsApi.getAll as jest.Mock).mockResolvedValue({ data: mockPods });
    (instancesApi.getAll as jest.Mock).mockImplementation((type) => {
      if (type === 'POSTGRES') return Promise.resolve({ data: mockInstances });
      if (type === 'MONGODB') return Promise.resolve({ data: mockMongoInstances });
      return Promise.resolve({ data: [] });
    });
    (databasesApi.getByInstance as jest.Mock).mockResolvedValue({ data: mockDatabases });
    (queriesApi.submit as jest.Mock).mockResolvedValue({ data: { id: 'query-1' } });
  });

  it('submits script with file successfully', async () => {
    renderDashboard();
    
    await userEvent.selectOptions(screen.getByLabelText(/database type/i), 'POSTGRES');
    await waitFor(() => expect(screen.getByLabelText(/instance/i)).not.toBeDisabled());
    await userEvent.selectOptions(screen.getByLabelText(/instance/i), 'inst-1');
    
    await waitFor(() => {
      const dbSelect = getDatabaseSelect();
      expect(dbSelect.options.length).toBeGreaterThan(1);
    });
    
    await userEvent.selectOptions(getDatabaseSelect(), 'users_db');
    await userEvent.selectOptions(screen.getByLabelText(/pod/i), 'pod-1');
    await userEvent.selectOptions(screen.getByLabelText(/submission type/i), 'SCRIPT');
    await userEvent.type(screen.getByLabelText(/comments/i), 'Script test');
    
    // Create and upload a file
    const file = new File(['const x = 1;'], 'test.js', { type: 'application/javascript' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    await userEvent.upload(fileInput, file);
    
    await userEvent.click(screen.getByRole('button', { name: /submit for approval/i }));
    
    await waitFor(() => {
      expect(queriesApi.submit).toHaveBeenCalled();
      const callArg = (queriesApi.submit as jest.Mock).mock.calls[0][0];
      expect(callArg instanceof FormData).toBe(true);
    });
  });

  it('shows no documentation when no database type selected for SCRIPT', async () => {
    renderDashboard();
    
    await userEvent.selectOptions(screen.getByLabelText(/submission type/i), 'SCRIPT');
    
    await waitFor(() => {
      expect(screen.getByText(/select a database type above/i)).toBeInTheDocument();
    });
  });

  describe('Inline validation', () => {
    it('shows inline error for empty comments', async () => {
      renderDashboard();
      
      await userEvent.selectOptions(screen.getByLabelText(/database type/i), 'POSTGRES');
      await waitFor(() => expect(screen.getByLabelText(/instance/i)).not.toBeDisabled());
      await userEvent.selectOptions(screen.getByLabelText(/instance/i), 'inst-1');
      
      await waitFor(() => {
        const dbSelect = getDatabaseSelect();
        expect(dbSelect.options.length).toBeGreaterThan(1);
      });
      
      await userEvent.selectOptions(getDatabaseSelect(), 'users_db');
      await userEvent.selectOptions(screen.getByLabelText(/pod/i), 'pod-1');
      await userEvent.type(screen.getByLabelText(/query/i), 'SELECT * FROM users');
      // Leave comments empty
      
      await userEvent.click(screen.getByRole('button', { name: /submit for approval/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Please fill this field. Comments cannot be empty or only spaces.')).toBeInTheDocument();
      });
      
      // Verify the API was not called
      expect(queriesApi.submit).not.toHaveBeenCalled();
    });

    it('shows inline error for empty query text', async () => {
      renderDashboard();
      
      await userEvent.selectOptions(screen.getByLabelText(/database type/i), 'POSTGRES');
      await waitFor(() => expect(screen.getByLabelText(/instance/i)).not.toBeDisabled());
      await userEvent.selectOptions(screen.getByLabelText(/instance/i), 'inst-1');
      
      await waitFor(() => {
        const dbSelect = getDatabaseSelect();
        expect(dbSelect.options.length).toBeGreaterThan(1);
      });
      
      await userEvent.selectOptions(getDatabaseSelect(), 'users_db');
      await userEvent.selectOptions(screen.getByLabelText(/pod/i), 'pod-1');
      await userEvent.type(screen.getByLabelText(/comments/i), 'Test comment');
      // Leave query text empty
      
      await userEvent.click(screen.getByRole('button', { name: /submit for approval/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Please fill this field. Query text cannot be empty or only spaces.')).toBeInTheDocument();
      });
      
      // Verify the API was not called
      expect(queriesApi.submit).not.toHaveBeenCalled();
    });

    it('shows inline error for whitespace-only comments', async () => {
      renderDashboard();
      
      await userEvent.selectOptions(screen.getByLabelText(/database type/i), 'POSTGRES');
      await waitFor(() => expect(screen.getByLabelText(/instance/i)).not.toBeDisabled());
      await userEvent.selectOptions(screen.getByLabelText(/instance/i), 'inst-1');
      
      await waitFor(() => {
        const dbSelect = getDatabaseSelect();
        expect(dbSelect.options.length).toBeGreaterThan(1);
      });
      
      await userEvent.selectOptions(getDatabaseSelect(), 'users_db');
      await userEvent.selectOptions(screen.getByLabelText(/pod/i), 'pod-1');
      await userEvent.type(screen.getByLabelText(/query/i), 'SELECT * FROM users');
      // Type only spaces in comments
      await userEvent.type(screen.getByLabelText(/comments/i), '   ');
      
      await userEvent.click(screen.getByRole('button', { name: /submit for approval/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Please fill this field. Comments cannot be empty or only spaces.')).toBeInTheDocument();
      });
      
      // Verify the API was not called
      expect(queriesApi.submit).not.toHaveBeenCalled();
    });

    it('shows inline error for whitespace-only query text', async () => {
      renderDashboard();
      
      await userEvent.selectOptions(screen.getByLabelText(/database type/i), 'POSTGRES');
      await waitFor(() => expect(screen.getByLabelText(/instance/i)).not.toBeDisabled());
      await userEvent.selectOptions(screen.getByLabelText(/instance/i), 'inst-1');
      
      await waitFor(() => {
        const dbSelect = getDatabaseSelect();
        expect(dbSelect.options.length).toBeGreaterThan(1);
      });
      
      await userEvent.selectOptions(getDatabaseSelect(), 'users_db');
      await userEvent.selectOptions(screen.getByLabelText(/pod/i), 'pod-1');
      await userEvent.type(screen.getByLabelText(/comments/i), 'Test comment');
      // Type only spaces in query text
      await userEvent.type(screen.getByLabelText(/query/i), '   ');
      
      await userEvent.click(screen.getByRole('button', { name: /submit for approval/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Please fill this field. Query text cannot be empty or only spaces.')).toBeInTheDocument();
      });
      
      // Verify the API was not called
      expect(queriesApi.submit).not.toHaveBeenCalled();
    });

    it('shows inline error for whitespace-only script file', async () => {
      renderDashboard();
      
      await userEvent.selectOptions(screen.getByLabelText(/database type/i), 'POSTGRES');
      await waitFor(() => expect(screen.getByLabelText(/instance/i)).not.toBeDisabled());
      await userEvent.selectOptions(screen.getByLabelText(/instance/i), 'inst-1');
      
      await waitFor(() => {
        const dbSelect = getDatabaseSelect();
        expect(dbSelect.options.length).toBeGreaterThan(1);
      });
      
      await userEvent.selectOptions(getDatabaseSelect(), 'users_db');
      await userEvent.selectOptions(screen.getByLabelText(/pod/i), 'pod-1');
      await userEvent.selectOptions(screen.getByLabelText(/submission type/i), 'SCRIPT');
      await userEvent.type(screen.getByLabelText(/comments/i), 'Test comment');
      
      // Create and upload a file with only whitespace
      const file = new File(['   \n  \t  '], 'whitespace.js', { type: 'application/javascript' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      await userEvent.upload(fileInput, file);
      
      await userEvent.click(screen.getByRole('button', { name: /submit for approval/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Script file cannot be empty or only spaces.')).toBeInTheDocument();
      }, { timeout: 5000 });
      
      // Verify the API was not called
      expect(queriesApi.submit).not.toHaveBeenCalled();
    });

    it('clears inline error when user starts typing', async () => {
      renderDashboard();
      
      await userEvent.selectOptions(screen.getByLabelText(/database type/i), 'POSTGRES');
      await waitFor(() => expect(screen.getByLabelText(/instance/i)).not.toBeDisabled());
      await userEvent.selectOptions(screen.getByLabelText(/instance/i), 'inst-1');
      
      await waitFor(() => {
        const dbSelect = getDatabaseSelect();
        expect(dbSelect.options.length).toBeGreaterThan(1);
      });
      
      await userEvent.selectOptions(getDatabaseSelect(), 'users_db');
      await userEvent.selectOptions(screen.getByLabelText(/pod/i), 'pod-1');
      await userEvent.type(screen.getByLabelText(/query/i), 'SELECT * FROM users');
      // Leave comments empty and submit to trigger error
      
      await userEvent.click(screen.getByRole('button', { name: /submit for approval/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Please fill this field. Comments cannot be empty or only spaces.')).toBeInTheDocument();
      });
      
      // Now type in comments field - error should clear
      await userEvent.type(screen.getByLabelText(/comments/i), 'Test comment');
      
      await waitFor(() => {
        expect(screen.queryByText('Please fill this field. Comments cannot be empty or only spaces.')).not.toBeInTheDocument();
      });
    });

    it('shows inline error for multiple SQL statements', async () => {
      renderDashboard();
      
      await userEvent.selectOptions(screen.getByLabelText(/database type/i), 'POSTGRES');
      await waitFor(() => expect(screen.getByLabelText(/instance/i)).not.toBeDisabled());
      await userEvent.selectOptions(screen.getByLabelText(/instance/i), 'inst-1');
      
      await waitFor(() => {
        const dbSelect = getDatabaseSelect();
        expect(dbSelect.options.length).toBeGreaterThan(1);
      });
      
      await userEvent.selectOptions(getDatabaseSelect(), 'users_db');
      await userEvent.selectOptions(screen.getByLabelText(/pod/i), 'pod-1');
      await userEvent.type(screen.getByLabelText(/comments/i), 'Test comment');
      
      // Type query with multiple statements
      await userEvent.type(screen.getByLabelText(/query/i), 'SELECT * FROM users; SELECT * FROM orders;');
      
      await userEvent.click(screen.getByRole('button', { name: /submit for approval/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Query mode supports single statements only. For multiple queries, use Script mode.')).toBeInTheDocument();
      });
      
      // Verify the API was not called
      expect(queriesApi.submit).not.toHaveBeenCalled();
    });

    it('shows inline error for semicolon in middle of query', async () => {
      renderDashboard();
      
      await userEvent.selectOptions(screen.getByLabelText(/database type/i), 'POSTGRES');
      await waitFor(() => expect(screen.getByLabelText(/instance/i)).not.toBeDisabled());
      await userEvent.selectOptions(screen.getByLabelText(/instance/i), 'inst-1');
      
      await waitFor(() => {
        const dbSelect = getDatabaseSelect();
        expect(dbSelect.options.length).toBeGreaterThan(1);
      });
      
      await userEvent.selectOptions(getDatabaseSelect(), 'users_db');
      await userEvent.selectOptions(screen.getByLabelText(/pod/i), 'pod-1');
      await userEvent.type(screen.getByLabelText(/comments/i), 'Test comment');
      
      // Type query with semicolon in middle
      await userEvent.type(screen.getByLabelText(/query/i), 'SELECT *; FROM users');
      
      await userEvent.click(screen.getByRole('button', { name: /submit for approval/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Query mode supports single statements only. For multiple queries, use Script mode.')).toBeInTheDocument();
      });
      
      // Verify the API was not called
      expect(queriesApi.submit).not.toHaveBeenCalled();
    });

    it('allows single query with trailing semicolon', async () => {
      renderDashboard();
      
      await userEvent.selectOptions(screen.getByLabelText(/database type/i), 'POSTGRES');
      await waitFor(() => expect(screen.getByLabelText(/instance/i)).not.toBeDisabled());
      await userEvent.selectOptions(screen.getByLabelText(/instance/i), 'inst-1');
      
      await waitFor(() => {
        const dbSelect = getDatabaseSelect();
        expect(dbSelect.options.length).toBeGreaterThan(1);
      });
      
      await userEvent.selectOptions(getDatabaseSelect(), 'users_db');
      await userEvent.selectOptions(screen.getByLabelText(/pod/i), 'pod-1');
      await userEvent.type(screen.getByLabelText(/comments/i), 'Test comment');
      
      // Type query with trailing semicolon (should be allowed)
      await userEvent.type(screen.getByLabelText(/query/i), 'SELECT * FROM users;');
      
      await userEvent.click(screen.getByRole('button', { name: /submit for approval/i }));
      
      await waitFor(() => {
        expect(queriesApi.submit).toHaveBeenCalled();
      });
    });

    it('shows inline error for query exceeding size limit', async () => {
      renderDashboard();
      
      await userEvent.selectOptions(screen.getByLabelText(/database type/i), 'POSTGRES');
      await waitFor(() => expect(screen.getByLabelText(/instance/i)).not.toBeDisabled());
      await userEvent.selectOptions(screen.getByLabelText(/instance/i), 'inst-1');
      
      await waitFor(() => {
        const dbSelect = getDatabaseSelect();
        expect(dbSelect.options.length).toBeGreaterThan(1);
      });
      
      await userEvent.selectOptions(getDatabaseSelect(), 'users_db');
      await userEvent.selectOptions(screen.getByLabelText(/pod/i), 'pod-1');
      await userEvent.type(screen.getByLabelText(/comments/i), 'Test comment');
      
      // Type very long query (exceeding 50KB limit) - use fireEvent for performance
      const longQuery = 'SELECT * FROM users WHERE id = ' + 'x'.repeat(50001);
      const queryTextarea = screen.getByLabelText(/query/i);
      fireEvent.change(queryTextarea, { target: { value: longQuery } });
      
      await userEvent.click(screen.getByRole('button', { name: /submit for approval/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/Query text cannot exceed 50000 characters/)).toBeInTheDocument();
      });
      
      // Verify the API was not called
      expect(queriesApi.submit).not.toHaveBeenCalled();
    }, 10000);

    it('shows inline error for comments exceeding size limit', async () => {
      renderDashboard();
      
      await userEvent.selectOptions(screen.getByLabelText(/database type/i), 'POSTGRES');
      await waitFor(() => expect(screen.getByLabelText(/instance/i)).not.toBeDisabled());
      await userEvent.selectOptions(screen.getByLabelText(/instance/i), 'inst-1');
      
      await waitFor(() => {
        const dbSelect = getDatabaseSelect();
        expect(dbSelect.options.length).toBeGreaterThan(1);
      });
      
      await userEvent.selectOptions(getDatabaseSelect(), 'users_db');
      await userEvent.selectOptions(screen.getByLabelText(/pod/i), 'pod-1');
      await userEvent.type(screen.getByLabelText(/query/i), 'SELECT * FROM users');
      
      // Type very long comments (exceeding 2KB limit) - use fireEvent for performance
      const longComments = 'x'.repeat(2001);
      const commentsInput = screen.getByLabelText(/comments/i);
      fireEvent.change(commentsInput, { target: { value: longComments } });
      
      await userEvent.click(screen.getByRole('button', { name: /submit for approval/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/Comments cannot exceed 2000 characters/)).toBeInTheDocument();
      });
      
      // Verify the API was not called
      expect(queriesApi.submit).not.toHaveBeenCalled();
    }, 10000);

    it('shows inline error for empty script file', async () => {
      renderDashboard();
      
      await userEvent.selectOptions(screen.getByLabelText(/database type/i), 'POSTGRES');
      await waitFor(() => expect(screen.getByLabelText(/instance/i)).not.toBeDisabled());
      await userEvent.selectOptions(screen.getByLabelText(/instance/i), 'inst-1');
      
      await waitFor(() => {
        const dbSelect = getDatabaseSelect();
        expect(dbSelect.options.length).toBeGreaterThan(1);
      });
      
      await userEvent.selectOptions(getDatabaseSelect(), 'users_db');
      await userEvent.selectOptions(screen.getByLabelText(/pod/i), 'pod-1');
      await userEvent.selectOptions(screen.getByLabelText(/submission type/i), 'SCRIPT');
      await userEvent.type(screen.getByLabelText(/comments/i), 'Test comment');
      
      // Create and upload an empty file
      const file = new File([''], 'empty.js', { type: 'application/javascript' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      await userEvent.upload(fileInput, file);
      
      await userEvent.click(screen.getByRole('button', { name: /submit for approval/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Script file cannot be empty.')).toBeInTheDocument();
      });
      
      // Verify the API was not called
      expect(queriesApi.submit).not.toHaveBeenCalled();
    });

    it('shows inline error for script file exceeding size limit', async () => {
      renderDashboard();
      
      await userEvent.selectOptions(screen.getByLabelText(/database type/i), 'POSTGRES');
      await waitFor(() => expect(screen.getByLabelText(/instance/i)).not.toBeDisabled());
      await userEvent.selectOptions(screen.getByLabelText(/instance/i), 'inst-1');
      
      await waitFor(() => {
        const dbSelect = getDatabaseSelect();
        expect(dbSelect.options.length).toBeGreaterThan(1);
      });
      
      await userEvent.selectOptions(getDatabaseSelect(), 'users_db');
      await userEvent.selectOptions(screen.getByLabelText(/pod/i), 'pod-1');
      await userEvent.selectOptions(screen.getByLabelText(/submission type/i), 'SCRIPT');
      await userEvent.type(screen.getByLabelText(/comments/i), 'Test comment');
      
      // Create a file larger than 5MB
      const largeContent = 'x'.repeat(6 * 1024 * 1024); // 6MB
      const file = new File([largeContent], 'large.js', { type: 'application/javascript' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      await userEvent.upload(fileInput, file);
      
      await userEvent.click(screen.getByRole('button', { name: /submit for approval/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Script file cannot exceed 5MB.')).toBeInTheDocument();
      });
      
      // Verify the API was not called
      expect(queriesApi.submit).not.toHaveBeenCalled();
    });

    it('shows inline error for script content exceeding character limit', async () => {
      renderDashboard();
      
      await userEvent.selectOptions(screen.getByLabelText(/database type/i), 'POSTGRES');
      await waitFor(() => expect(screen.getByLabelText(/instance/i)).not.toBeDisabled());
      await userEvent.selectOptions(screen.getByLabelText(/instance/i), 'inst-1');
      
      await waitFor(() => {
        const dbSelect = getDatabaseSelect();
        expect(dbSelect.options.length).toBeGreaterThan(1);
      });
      
      await userEvent.selectOptions(getDatabaseSelect(), 'users_db');
      await userEvent.selectOptions(screen.getByLabelText(/pod/i), 'pod-1');
      await userEvent.selectOptions(screen.getByLabelText(/submission type/i), 'SCRIPT');
      await userEvent.type(screen.getByLabelText(/comments/i), 'Test comment');
      
      // Create a file with content exceeding 5MB character limit
      const largeContent = 'x'.repeat(5000001); // 5MB + 1 character
      const file = new File([largeContent], 'large.js', { type: 'application/javascript' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      await userEvent.upload(fileInput, file);
      
      await userEvent.click(screen.getByRole('button', { name: /submit for approval/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/Script content cannot exceed 5000000 characters/)).toBeInTheDocument();
      }, { timeout: 5000 });
      
      // Verify the API was not called
      expect(queriesApi.submit).not.toHaveBeenCalled();
    });

    it('shows inline error for file read error', async () => {
      renderDashboard();
      
      await userEvent.selectOptions(screen.getByLabelText(/database type/i), 'POSTGRES');
      await waitFor(() => expect(screen.getByLabelText(/instance/i)).not.toBeDisabled());
      await userEvent.selectOptions(screen.getByLabelText(/instance/i), 'inst-1');
      
      await waitFor(() => {
        const dbSelect = getDatabaseSelect();
        expect(dbSelect.options.length).toBeGreaterThan(1);
      });
      
      await userEvent.selectOptions(getDatabaseSelect(), 'users_db');
      await userEvent.selectOptions(screen.getByLabelText(/pod/i), 'pod-1');
      await userEvent.selectOptions(screen.getByLabelText(/submission type/i), 'SCRIPT');
      await userEvent.type(screen.getByLabelText(/comments/i), 'Test comment');
      
      // Mock FileReader to simulate error
      const originalFileReader = window.FileReader;
      const mockFileReader = jest.fn(() => ({
        readAsText: jest.fn(function() {
          // Simulate error during file reading
          setTimeout(() => {
            if (this.onerror) {
              this.onerror(new Error('File read error'));
            }
          }, 0);
        }),
        onload: null,
        onerror: null,
        result: null
      }));
      window.FileReader = mockFileReader as any;
      
      const file = new File(['const x = 1;'], 'test.js', { type: 'application/javascript' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      await userEvent.upload(fileInput, file);
      
      await userEvent.click(screen.getByRole('button', { name: /submit for approval/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Error reading script file.')).toBeInTheDocument();
      }, { timeout: 5000 });
      
      // Restore original FileReader
      window.FileReader = originalFileReader;
      
      // Verify the API was not called
      expect(queriesApi.submit).not.toHaveBeenCalled();
    });

    it('shows validation errors for missing required fields', async () => {
      renderDashboard();
      
      // Try to submit without filling any fields
      await userEvent.click(screen.getByRole('button', { name: /submit for approval/i }));
      
      await waitFor(() => {
        // The form shows the last validation error that occurs
        expect(screen.getByText('Please select a pod.')).toBeInTheDocument();
      });
      
      // Verify the API was not called
      expect(queriesApi.submit).not.toHaveBeenCalled();
    });

    it('shows validation error for missing instance', async () => {
      renderDashboard();
      
      await userEvent.selectOptions(screen.getByLabelText(/database type/i), 'POSTGRES');
      await userEvent.selectOptions(screen.getByLabelText(/pod/i), 'pod-1');
      
      // Try to submit without selecting instance
      await userEvent.click(screen.getByRole('button', { name: /submit for approval/i }));
      
      await waitFor(() => {
        // The form shows the last validation error that occurs - database comes after instance
        expect(screen.getByText('Please select a database.')).toBeInTheDocument();
      });
      
      // Verify the API was not called
      expect(queriesApi.submit).not.toHaveBeenCalled();
    });

    it('shows validation error for missing database', async () => {
      renderDashboard();
      
      await userEvent.selectOptions(screen.getByLabelText(/database type/i), 'POSTGRES');
      await waitFor(() => expect(screen.getByLabelText(/instance/i)).not.toBeDisabled());
      await userEvent.selectOptions(screen.getByLabelText(/instance/i), 'inst-1');
      await userEvent.selectOptions(screen.getByLabelText(/pod/i), 'pod-1');
      
      // Try to submit without selecting database
      await userEvent.click(screen.getByRole('button', { name: /submit for approval/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Please select a database.')).toBeInTheDocument();
      });
      
      // Verify the API was not called
      expect(queriesApi.submit).not.toHaveBeenCalled();
    });

    it('shows validation error for missing pod', async () => {
      renderDashboard();
      
      await userEvent.selectOptions(screen.getByLabelText(/database type/i), 'POSTGRES');
      await waitFor(() => expect(screen.getByLabelText(/instance/i)).not.toBeDisabled());
      await userEvent.selectOptions(screen.getByLabelText(/instance/i), 'inst-1');
      
      await waitFor(() => {
        const dbSelect = getDatabaseSelect();
        expect(dbSelect.options.length).toBeGreaterThan(1);
      });
      
      await userEvent.selectOptions(getDatabaseSelect(), 'users_db');
      
      // Try to submit without selecting pod
      await userEvent.click(screen.getByRole('button', { name: /submit for approval/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Please select a pod.')).toBeInTheDocument();
      });
      
      // Verify the API was not called
      expect(queriesApi.submit).not.toHaveBeenCalled();
    });
  });
});