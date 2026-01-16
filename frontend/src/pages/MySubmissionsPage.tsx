import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { queriesApi } from '../services/api';
import type { Query } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ResultDisplay } from '../components/ui/ResultDisplay';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function MySubmissionsPage() {
  const navigate = useNavigate();
  const [queries, setQueries] = useState<Query[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuery, setSelectedQuery] = useState<Query | null>(null);
  const [retryLoading, setRetryLoading] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    loadQueries();
  }, [currentPage, itemsPerPage]);

  const loadQueries = async () => {
    setIsLoading(true);
    try {
      const offset = (currentPage - 1) * itemsPerPage;
      const response = await queriesApi.getMySubmissions({ 
        limit: itemsPerPage, 
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

  // Retry: Resubmit the exact same query automatically
  /* istanbul ignore next */
  const handleRetry = async (query: Query) => {
    setRetryLoading(query.id);
    try {
      if (query.submission_type === 'SCRIPT' && query.script_content) {
        // For scripts, create a File from the stored content
        const blob = new Blob([query.script_content], { type: 'application/javascript' });
        const file = new File([blob], 'script.js', { type: 'application/javascript' });
        
        const formData = new FormData();
        formData.append('instanceId', query.instance_id);
        formData.append('databaseName', query.database_name);
        formData.append('podId', query.pod_id);
        formData.append('comments', query.comments);
        formData.append('submissionType', 'SCRIPT');
        formData.append('script', file);
        await queriesApi.submit(formData);
      } else {
        await queriesApi.submit({
          instanceId: query.instance_id,
          databaseName: query.database_name,
          queryText: query.query_text,
          podId: query.pod_id,
          comments: query.comments,
          submissionType: query.submission_type,
        });
      }
      // Reload to show the new submission
      await loadQueries();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to retry query');
    } finally {
      setRetryLoading(null);
    }
  };

  // Modify: Navigate to dashboard with pre-filled data
  const handleModify = (query: Query) => {
    navigate('/dashboard', { 
      state: { 
        prefill: {
          instanceId: query.instance_id,
          databaseName: query.database_name,
          queryText: query.query_text,
          scriptContent: query.script_content,
          comments: query.comments,
          podId: query.pod_id,
          submissionType: query.submission_type,
        }
      }
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const canRetryOrModify = (status: string) => {
    return status === 'REJECTED' || status === 'FAILED';
  };

  /* istanbul ignore next */
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

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const handleItemsPerPageChange = (newLimit: number) => {
    setItemsPerPage(newLimit);
    setCurrentPage(1);
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
        My Submissions
      </h2>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800">
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Instance</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Database</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Type</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Submitted To</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Date</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {queries.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  No submissions yet
                </td>
              </tr>
            ) : (
              queries.map((query) => (
                <tr key={query.id} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {query.instance_name || '-'}
                  </td>
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
                    {query.pod_manager_name || query.pod_id}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={query.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(query.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedQuery(query)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                        title="View Details"
                      >
                        👁️ View Details
                      </button>
                      {canRetryOrModify(query.status) && (
                        <>
                          <button
                            onClick={() => handleRetry(query)}
                            disabled={retryLoading === query.id}
                            className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors cursor-pointer disabled:opacity-50"
                            title="Retry with same details"
                          >
                            {retryLoading === query.id ? '...' : '🔄 Retry'}
                          </button>
                          <button
                            onClick={() => handleModify(query)}
                            className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors cursor-pointer"
                            title="Modify and resubmit"
                          >
                            ✏️ Modify
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}
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
        {totalPages > 1 && (
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
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
        <span>👁️ View Details</span>
        <span>🔄 Retry (resubmit same query)</span>
        <span>✏️ Modify (edit before resubmitting)</span>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={!!selectedQuery}
        onClose={() => setSelectedQuery(null)}
        title="Query Details"
      >
        {selectedQuery && (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">Status</label>
              <div className="mt-1">
                <StatusBadge status={selectedQuery.status} />
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">Database</label>
              <p className="text-gray-900 dark:text-white">{selectedQuery.database_name}</p>
            </div>

            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">Type</label>
              <p className="text-gray-900 dark:text-white">{selectedQuery.submission_type}</p>
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
              <pre className="mt-1 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 overflow-x-auto font-mono max-h-48 whitespace-pre-wrap">
                {selectedQuery.submission_type === 'SCRIPT' 
                  ? selectedQuery.script_content || '[Script file not available]'
                  : selectedQuery.query_text}
              </pre>
            </div>

            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">Comments</label>
              <p className="text-gray-900 dark:text-white">{selectedQuery.comments}</p>
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
                  <ResultDisplay result={selectedQuery.execution_result} queryId={selectedQuery.id} />
                </div>
              </div>
            )}

            <div className="pt-4 flex justify-end gap-2">
              {canRetryOrModify(selectedQuery.status) && (
                <>
                  {/* istanbul ignore next */}
                  <Button 
                    onClick={() => {
                      handleRetry(selectedQuery);
                      setSelectedQuery(null);
                    }}
                    isLoading={retryLoading === selectedQuery.id}
                  >
                    🔄 Retry
                  </Button>
                  <Button 
                    variant="secondary"
                    onClick={() => {
                      handleModify(selectedQuery);
                      setSelectedQuery(null);
                    }}
                  >
                    ✏️ Modify
                  </Button>
                </>
              )}
              <Button variant="secondary" onClick={() => setSelectedQuery(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
