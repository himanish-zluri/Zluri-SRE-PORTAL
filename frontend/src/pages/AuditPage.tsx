import { useState, useEffect } from 'react';
import { auditApi, usersApi, instancesApi, databasesApi } from '../services/api';
import type { AuditLog, DbInstance } from '../types';
import { Button } from '../components/ui/Button';
import { QueryDetailsModal } from '../components/ui/QueryDetailsModal';
import { useDebounce } from '../hooks/useDebounce';

interface UserOption {
  id: string;
  name: string;
  email: string;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter options
  const [users, setUsers] = useState<UserOption[]>([]);
  const [instances, setInstances] = useState<DbInstance[]>([]);
  const [databases, setDatabases] = useState<string[]>([]);
  
  // Selected filters
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedInstance, setSelectedInstance] = useState('');
  const [selectedDatabase, setSelectedDatabase] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [querySearch, setQuerySearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Use custom debounce hook
  const debouncedQuerySearch = useDebounce(querySearch, 500);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modal state
  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load filter options on mount
  useEffect(() => {
    loadFilterOptions();
  }, []);

  // Load logs when page, itemsPerPage, or any filter changes
  useEffect(() => {
    loadLogs();
  }, [currentPage, itemsPerPage, selectedUser, selectedInstance, selectedDatabase, selectedAction, debouncedQuerySearch, startDate, endDate]);

  // Reset page to 1 when debounced search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedQuerySearch]);

  // Load databases when instance changes
  useEffect(() => {
    if (selectedInstance) {
      databasesApi.getByInstance(selectedInstance)
        .then(res => setDatabases(res.data.map(d => d.database_name)))
        .catch(err => console.error('Failed to load databases:', err));
    } else {
      setDatabases([]);
    }
    setSelectedDatabase('');
  }, [selectedInstance]);

  const loadFilterOptions = async () => {
    try {
      // Load instances
      const [pgRes, mongoRes] = await Promise.all([
        instancesApi.getAll('POSTGRES'),
        instancesApi.getAll('MONGODB'),
      ]);
      setInstances([...pgRes.data, ...mongoRes.data]);
      
      // Try to load users (may fail if not admin/manager)
      try {
        const usersRes = await usersApi.getAll();
        setUsers(usersRes.data);
      } catch (err) {
        console.log('Could not load users (may not have permission)');
      }
    } catch (error) {
      console.error('Failed to load filter options:', error);
    }
  };

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const params: any = {
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
      };
      
      if (selectedDatabase) params.databaseName = selectedDatabase;
      if (selectedInstance) params.instanceId = selectedInstance;
      if (selectedUser) params.userId = selectedUser;
      if (selectedAction) params.action = selectedAction;
      if (debouncedQuerySearch.trim()) params.querySearch = debouncedQuerySearch.trim();
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await auditApi.getAll(params);
      setLogs(response.data);
      setHasMore(response.data.length === itemsPerPage);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSelectedUser('');
    setSelectedInstance('');
    setSelectedDatabase('');
    setSelectedAction('');
    setQuerySearch('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (newLimit: number) => {
    setItemsPerPage(newLimit);
    setCurrentPage(1);
  };

  const handleViewDetails = (queryId: string) => {
    setSelectedQueryId(queryId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedQueryId(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'SUBMITTED':
        return 'text-blue-600 dark:text-blue-400';
      case 'EXECUTED':
        return 'text-green-600 dark:text-green-400';
      case 'REJECTED':
        return 'text-red-600 dark:text-red-400';
      case 'FAILED':
        return 'text-orange-600 dark:text-orange-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Audit Logs
        </h2>
      </div>

      {/* Filters - Automatic, No Apply Button */}
      <div className="space-y-4 mb-6">
        {/* First row - Search and Date Range */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2 flex-1 min-w-64">
            <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">Search Query ID:</label>
            <input
              type="text"
              value={querySearch}
              onChange={(e) => {
                setQuerySearch(e.target.value);
              }}
              placeholder="Search by query ID..."
              className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="start-date" className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">From:</label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="end-date" className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">To:</label>
            <input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
        </div>
        
        {/* Second row - Dropdowns */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">User:</label>
            <select
              value={selectedUser}
              onChange={(e) => {
                setSelectedUser(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-sm cursor-pointer"
            >
              <option value="">All users</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Instance:</label>
            <select
              value={selectedInstance}
              onChange={(e) => {
                setSelectedInstance(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-sm cursor-pointer"
            >
              <option value="">All instances</option>
              {instances.map(i => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Database:</label>
            <select
              value={selectedDatabase}
              onChange={(e) => {
                setSelectedDatabase(e.target.value);
                setCurrentPage(1);
              }}
              disabled={!selectedInstance}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-sm cursor-pointer disabled:opacity-50"
            >
              <option value="">All databases</option>
              {databases.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Action:</label>
            <select
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-sm cursor-pointer"
            >
              <option value="">All actions</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="EXECUTED">Executed</option>
              <option value="REJECTED">Rejected</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
          {(selectedUser || selectedInstance || selectedDatabase || selectedAction || querySearch || startDate || endDate) && (
            <Button variant="secondary" onClick={handleClearFilters}>Clear Filters</Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Timestamp</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Action</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Performed By</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Query ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(logs) && logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                (Array.isArray(logs) ? logs : []).map((log) => (
                  <tr key={log.id} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(log.created_at)}
                    </td>
                    <td className={`px-4 py-3 text-sm font-medium ${getActionColor(log.action)}`}>
                      {log.action}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      <div>{log.performed_by_name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-500">{log.performed_by_email}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 font-mono">
                      {log.query_request_id.substring(0, 8)}...
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleViewDetails(log.query_request_id)}
                      >
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Page {currentPage}
          </span>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500 dark:text-gray-400">Per page:</label>
            <select
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              className="px-2 py-1 rounded bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-sm cursor-pointer"
            >
              {PAGE_SIZE_OPTIONS.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setCurrentPage((p) => p + 1)}
            disabled={!hasMore}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Query Details Modal */}
      {selectedQueryId && (
        <QueryDetailsModal
          queryId={selectedQueryId}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
