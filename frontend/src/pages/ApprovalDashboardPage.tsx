import { useState, useEffect } from 'react';
import { queriesApi } from '../services/api';
import type { Query } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { TextArea } from '../components/ui/TextArea';
import { ResultDisplay } from '../components/ui/ResultDisplay';

const ITEMS_PER_PAGE = 10;

export function ApprovalDashboardPage() {
  const [queries, setQueries] = useState<Query[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Server-side pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modal state
  const [selectedQuery, setSelectedQuery] = useState<Query | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    loadQueries();
  }, [currentPage, statusFilter]);

  const loadQueries = async () => {
    setIsLoading(true);
    try {
      const offset = (currentPage - 1) * ITEMS_PER_PAGE;
      const response = await queriesApi.getForApproval({
        status: statusFilter || undefined,
        limit: ITEMS_PER_PAGE,
        offset
      });
      setQueries(response.data.data);
      setTotalItems(response.data.pagination.total);
    } catch (error) {
      console.error('Failed to load queries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Client-side search filtering (on current page data)
  const filteredQueries = searchTerm
    ? queries.filter(
        (q) =>
          q.database_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          q.query_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
          q.comments.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : queries;

  const handleApprove = async (query: Query) => {
    setActionLoading(true);
    try {
      await queriesApi.approve(query.id);
      await loadQueries();
      setSelectedQuery(null);
      setShowDetailModal(false);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to approve query');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedQuery) return;
    setActionLoading(true);
    try {
      await queriesApi.reject(selectedQuery.id, rejectReason);
      await loadQueries();
      setSelectedQuery(null);
      setShowRejectModal(false);
      setRejectReason('');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to reject query');
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectModal = (query: Query) => {
    setSelectedQuery(query);
    setShowRejectModal(true);
  };

  const openDetailModal = (query: Query) => {
    setSelectedQuery(query);
    setShowDetailModal(true);
  };

  const downloadScript = (query: Query) => {
    if (!query.script_content) return;
    const blob = new Blob([query.script_content], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `script-${query.id.substring(0, 8)}.js`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  const truncateText = (text: string, maxLength: number = 40) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const handleStatusFilterChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Approval Dashboard
      </h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">Filter by Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-sm cursor-pointer"
          >
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="EXECUTED">Executed</option>
            <option value="REJECTED">Rejected</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>

        <div className="flex-1 max-w-xs">
          <Input
            placeholder="Search current page..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800">
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Database</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Type</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Query/Script</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">POD</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Comments</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredQueries.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  No queries found
                </td>
              </tr>
            ) : (
              filteredQueries.map((query) => (
                <tr key={query.id} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {query.database_name}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      query.submission_type === 'SCRIPT' 
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                      {query.submission_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    <button
                      onClick={() => openDetailModal(query)}
                      className="font-mono text-left hover:text-blue-500 cursor-pointer transition-colors"
                      title="Click to view full query"
                    >
                      {query.submission_type === 'SCRIPT'
                        ? '📄 View Script'
                        : truncateText(query.query_text)}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {query.pod_id}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={query.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    <button
                      onClick={() => openDetailModal(query)}
                      className="text-left hover:text-blue-500 cursor-pointer transition-colors"
                      title="Click to view full comments"
                    >
                      {truncateText(query.comments, 20)}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    {query.status === 'PENDING' ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApprove(query)}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => openRejectModal(query)}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                        >
                          ✗ Reject
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => openDetailModal(query)}
                        className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                      >
                        View Details
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of {totalItems}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              &lt; Prev
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              Next &gt;
            </button>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setRejectReason('');
        }}
        title="Reject Query"
      >
        <div className="space-y-4">
          <TextArea
            label="Rejection Reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Enter reason for rejection..."
            rows={3}
          />
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setShowRejectModal(false);
                setRejectReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleReject}
              isLoading={actionLoading}
            >
              Reject
            </Button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal && !!selectedQuery}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedQuery(null);
        }}
        title="Query Details"
      >
        {selectedQuery && (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400">Status</label>
                <div className="mt-1">
                  <StatusBadge status={selectedQuery.status} />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400">Type</label>
                <p className="text-gray-900 dark:text-white">{selectedQuery.submission_type}</p>
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">Database</label>
              <p className="text-gray-900 dark:text-white">{selectedQuery.database_name}</p>
            </div>

            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">POD</label>
              <p className="text-gray-900 dark:text-white">{selectedQuery.pod_id}</p>
            </div>

            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">Comments</label>
              <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{selectedQuery.comments}</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedQuery.submission_type === 'SCRIPT' ? 'Script Content' : 'Query'}
                </label>
                {selectedQuery.submission_type === 'SCRIPT' && selectedQuery.script_content && (
                  <button
                    onClick={() => downloadScript(selectedQuery)}
                    className="text-xs text-blue-500 hover:text-blue-400 cursor-pointer flex items-center gap-1"
                  >
                    ⬇️ Download Script
                  </button>
                )}
              </div>
              <pre className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 overflow-x-auto font-mono max-h-48 whitespace-pre-wrap">
                {selectedQuery.submission_type === 'SCRIPT'
                  ? selectedQuery.script_content || '[Script file not available]'
                  : selectedQuery.query_text}
              </pre>
            </div>

            {selectedQuery.rejection_reason && (
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400">Rejection Reason</label>
                <p className="text-red-500">{selectedQuery.rejection_reason}</p>
              </div>
            )}

            {selectedQuery.execution_result && (
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400">Execution Result</label>
                <div className="mt-1">
                  <ResultDisplay result={selectedQuery.execution_result} />
                </div>
              </div>
            )}

            <div className="pt-4 flex justify-end gap-3 border-t border-gray-200 dark:border-gray-700">
              {selectedQuery.status === 'PENDING' && (
                <>
                  <button
                    onClick={() => handleApprove(selectedQuery)}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      setShowRejectModal(true);
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
                  >
                    ✗ Reject
                  </button>
                </>
              )}
              <Button variant="secondary" onClick={() => {
                setShowDetailModal(false);
                setSelectedQuery(null);
              }}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
