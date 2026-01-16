import { useState, useEffect } from 'react';
import { auditApi, usersApi, instancesApi, databasesApi } from '../services/api';
import type { AuditLog, DbInstance } from '../types';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';

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
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Load filter options on mount
  useEffect(() => {
    loadFilterOptions();
  }, []);

  // Load logs when page or itemsPerPage changes
  useEffect(() => {
    loadLogs();
  }, [currentPage, itemsPerPage]);

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
      if (selectedUser) params.userId = selectedUser;
      if (selectedAction) params.action = selectedAction;

      const response = await auditApi.getAll(params);
      setLogs(response.data);
      setHasMore(response.data.length === itemsPerPage);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilter = () => {
    setCurrentPage(1);
    loadLogs();
  };

  const handleClearFilters = () => {
    setSelectedUser('');
    setSelectedInstance('');
    setSelectedDatabase('');
    setSelectedAction('');
    setCurrentPage(1);
    loadLogs();
  };

  const handleItemsPerPageChange = (newLimit: number) => {
    setItemsPerPage(newLimit);
    setCurrentPage(1);
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

  const formatDetails = (action: string, details: Record<string, any>) => {
    if (!details || Object.keys(details).length === 0) return '-';

    switch (action) {
      case 'SUBMITTED':
        return (
          <div className="space-y-0.5">
            {details.submissionType && (
              <div><span className="text-gray-500">Type:</span> {details.submissionType}</div>
            )}
            {details.podId && (
              <div><span className="text-gray-500">POD:</span> {details.podId}</div>
            )}
          </div>
        );
      case 'REJECTED':
        return (
          <div>
            <span className="text-gray-500">Reason:</span>{' '}
            <span className="text-red-500">{details.reason || 'No reason provided'}</span>
          </div>
        );
      case 'FAILED':
        return (
          <div>
            <span className="text-gray-500">Error:</span>{' '}
            <span className="text-orange-500 break-all">{details.error || 'Unknown error'}</span>
          </div>
        );
      case 'EXECUTED':
        return (
          <div>
            {details.instanceType && (
              <div><span className="text-gray-500">Instance:</span> {details.instanceType}</div>
            )}
          </div>
        );
      /* istanbul ignore next */
      default:
        return (
          <div className="text-xs">
            {Object.entries(details).map(([key, value]) => (
              <div key={key}>
                <span className="text-gray-500">{key}:</span> {String(value)}
              </div>
            ))}
          </div>
        );
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Audit Logs
      </h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6 items-end">
        <div className="w-56">
          <Select
            label="Filter by User"
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            options={users.map(u => ({ value: u.id, label: `${u.name} (${u.email})` }))}
            placeholder="All users"
          />
        </div>
        <div className="w-48">
          <Select
            label="Filter by Instance"
            value={selectedInstance}
            onChange={(e) => setSelectedInstance(e.target.value)}
            options={instances.map(i => ({ value: i.id, label: i.name }))}
            placeholder="All instances"
          />
        </div>
        <div className="w-48">
          <Select
            label="Filter by Database"
            value={selectedDatabase}
            onChange={(e) => setSelectedDatabase(e.target.value)}
            options={databases.map(d => ({ value: d, label: d }))}
            placeholder="All databases"
            disabled={!selectedInstance}
          />
        </div>
        <div className="w-40">
          <Select
            label="Filter by Action"
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            options={[
              { value: 'SUBMITTED', label: 'Submitted' },
              { value: 'EXECUTED', label: 'Executed' },
              { value: 'REJECTED', label: 'Rejected' },
              { value: 'FAILED', label: 'Failed' },
            ]}
            placeholder="All actions"
          />
        </div>
        <Button onClick={handleFilter}>Apply</Button>
        <Button variant="secondary" onClick={handleClearFilters}>Clear</Button>
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
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
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
                      {log.query_request_id.substring(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {formatDetails(log.action, log.details)}
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
    </div>
  );
}
