import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { queriesApi } from '../services/api';
import type { Query } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ResultDisplay } from '../components/ui/ResultDisplay';

const ITEMS_PER_PAGE = 10;

export function MySubmissionsPage() {
  const navigate = useNavigate();
  const [queries, setQueries] = useState<Query[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuery, setSelectedQuery] = useState<Query | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    loadQueries();
  }, [currentPage]);

  const loadQueries = async () => {
    setIsLoading(true);
    try {
      const offset = (currentPage - 1) * ITEMS_PER_PAGE;
      const response = await queriesApi.getMySubmissions({ 
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

  const handleClone = (query: Query) => {
    navigate('/dashboard', { 
      state: { 
        clone: {
          instanceId: query.instance_id,
          databaseName: query.database_name,
          queryText: query.query_text,
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

  const truncateText = (text: string, maxLength: number = 30) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

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
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">ID</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Database</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Query Preview</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Date</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {queries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  No submissions yet
                </td>
              </tr>
            ) : (
              queries.map((query) => (
                <tr key={query.id} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 font-mono">
                    {query.id.substring(0, 8)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {query.database_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 font-mono">
                    {query.submission_type === 'SCRIPT' 
                      ? '[SCRIPT]' 
                      : truncateText(query.query_text)}
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
                        className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                        title="View Details"
                      >
                        👁️
                      </button>
                      {(query.status === 'REJECTED' || query.status === 'FAILED') && (
                        <button
                          onClick={() => handleClone(query)}
                          className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-blue-500 transition-colors"
                          title="Clone & Resubmit"
                        >
                          🔄
                        </button>
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

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
        <span>Legend: 👁️ = View Details | 🔄 = Clone & Resubmit</span>
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
              <label className="text-sm text-gray-500 dark:text-gray-400">
                {selectedQuery.submission_type === 'SCRIPT' ? 'Script Content' : 'Query'}
              </label>
              <pre className="mt-1 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 overflow-x-auto font-mono">
                {selectedQuery.submission_type === 'SCRIPT' 
                  ? selectedQuery.script_content || '[Script file]'
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
                  <ResultDisplay result={selectedQuery.execution_result} />
                </div>
              </div>
            )}

            <div className="pt-4 flex justify-end">
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
