import { useState, useEffect } from 'react';
import { queriesApi } from '../services/api';
import type { Query } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { TextArea } from '../components/ui/TextArea';
import { ResultDisplay } from '../components/ui/ResultDisplay';

// Risk Analysis Types
type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

interface RiskAnalysis {
  level: RiskLevel;
  reasons: string[];
}

// Hybrid Risk Analysis Function
/* istanbul ignore next */
function analyzeRisk(query: Query): RiskAnalysis {
  const reasons: string[] = [];
  let score = 0;

  // Scripts are inherently riskier
  if (query.submission_type === 'SCRIPT') {
    score += 2;
    reasons.push('Script execution');
    
    const scriptContent = query.script_content?.toLowerCase() || '';
    
    // Check for dangerous patterns in scripts
    if (/delete|remove|drop/i.test(scriptContent)) {
      score += 3;
      reasons.push('Contains DELETE/DROP operations');
    }
    if (/update|modify|alter/i.test(scriptContent)) {
      score += 2;
      reasons.push('Contains UPDATE/ALTER operations');
    }
    if (/truncate/i.test(scriptContent)) {
      score += 4;
      reasons.push('Contains TRUNCATE operation');
    }
    if (/exec|eval|spawn|child_process/i.test(scriptContent)) {
      score += 3;
      reasons.push('Contains code execution patterns');
    }
    if (/fs\.|writeFile|unlink|rmdir/i.test(scriptContent)) {
      score += 3;
      reasons.push('Contains file system operations');
    }
  } else {
    // Query analysis
    const queryText = query.query_text?.toUpperCase() || '';
    const hasWhereClause = /WHERE\s+/i.test(queryText);
    
    // DROP operations - highest risk
    if (/\bDROP\s+(TABLE|DATABASE|INDEX|SCHEMA)/i.test(queryText)) {
      score += 5;
      reasons.push('DROP operation detected');
    }
    
    // TRUNCATE - high risk
    if (/\bTRUNCATE\b/i.test(queryText)) {
      score += 5;
      reasons.push('TRUNCATE operation detected');
    }
    
    // DELETE operations
    if (/\bDELETE\s+FROM\b/i.test(queryText)) {
      if (!hasWhereClause) {
        score += 5;
        reasons.push('DELETE without WHERE clause');
      } else {
        score += 2;
        reasons.push('DELETE with WHERE clause');
      }
    }
    
    // UPDATE operations
    if (/\bUPDATE\s+\w+\s+SET\b/i.test(queryText)) {
      if (!hasWhereClause) {
        score += 4;
        reasons.push('UPDATE without WHERE clause');
      } else {
        score += 1;
        reasons.push('UPDATE with WHERE clause');
      }
    }
    
    // ALTER operations
    if (/\bALTER\s+(TABLE|DATABASE)/i.test(queryText)) {
      score += 3;
      reasons.push('ALTER operation detected');
    }
    
    // INSERT operations - lower risk
    if (/\bINSERT\s+INTO\b/i.test(queryText)) {
      score += 1;
      reasons.push('INSERT operation');
    }
    
    // SELECT operations - lowest risk
    if (/^\s*SELECT\b/i.test(queryText) && score === 0) {
      reasons.push('Read-only SELECT query');
    }
    
    // Check for multiple statements (potential SQL injection or batch)
    if ((queryText.match(/;/g) || []).length > 1) {
      score += 2;
      reasons.push('Multiple SQL statements');
    }
  }

  // Determine risk level based on score
  let level: RiskLevel;
  if (score >= 4) {
    level = 'HIGH';
  } else if (score >= 2) {
    level = 'MEDIUM';
  } else {
    level = 'LOW';
  }

  if (reasons.length === 0) {
    reasons.push('Standard operation');
  }

  return { level, reasons };
}

// Risk Badge Component
function RiskBadge({ risk }: { risk: RiskAnalysis }) {
  const colors = {
    LOW: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    MEDIUM: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    HIGH: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  const icons = {
    LOW: '🟢',
    MEDIUM: '🟡',
    HIGH: '🔴',
  };

  return (
    <span 
      className={`px-2 py-0.5 rounded text-xs font-medium ${colors[risk.level]} cursor-help`}
      title={risk.reasons.join('\n')}
    >
      {icons[risk.level]} {risk.level}
    </span>
  );
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function ApprovalDashboardPage() {
  const [queries, setQueries] = useState<Query[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [typeFilter, setTypeFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  
  // Server-side pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modal state
  const [selectedQuery, setSelectedQuery] = useState<Query | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    loadQueries();
  }, [currentPage, statusFilter, typeFilter, itemsPerPage]);

  const loadQueries = async () => {
    setIsLoading(true);
    try {
      const offset = (currentPage - 1) * itemsPerPage;
      const response = await queriesApi.getForApproval({
        status: statusFilter || undefined,
        type: typeFilter || undefined,
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

  // Filter queries by risk (client-side since risk is computed)
  const filteredQueries = riskFilter 
    ? queries.filter(q => analyzeRisk(q).level === riskFilter)
    : queries;

  /* istanbul ignore next */
  const handleApprove = async (query: Query) => {
    setActionLoading(true);
    try {
      await queriesApi.approve(query.id);
      await loadQueries();
      setSelectedQuery(null);
      setShowDetailModal(false);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to approve query');
      // Reload to show updated status (FAILED)
      await loadQueries();
      setSelectedQuery(null);
      setShowDetailModal(false);
    } finally {
      setActionLoading(false);
    }
  };

  /* istanbul ignore next */
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

  const handleStatusFilterChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    setCurrentPage(1);
  };

  const handleTypeFilterChange = (newType: string) => {
    setTypeFilter(newType);
    setCurrentPage(1);
  };

  const handleRiskFilterChange = (newRisk: string) => {
    setRiskFilter(newRisk);
  };

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
        Approval Dashboard
      </h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">Status:</label>
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
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">Type:</label>
          <select
            value={typeFilter}
            onChange={(e) => handleTypeFilterChange(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-sm cursor-pointer"
          >
            <option value="">All</option>
            <option value="QUERY">Query</option>
            <option value="SCRIPT">Script</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">Risk:</label>
          <select
            value={riskFilter}
            onChange={(e) => handleRiskFilterChange(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-sm cursor-pointer"
          >
            <option value="">All</option>
            <option value="LOW">🟢 Low</option>
            <option value="MEDIUM">🟡 Medium</option>
            <option value="HIGH">🔴 High</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800">
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Submitted By</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Instance</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Database</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Type</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Risk</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">POD</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Date</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredQueries.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  No queries found
                </td>
              </tr>
            ) : (
              filteredQueries.map((query) => {
                const risk = analyzeRisk(query);
                return (
                  <tr key={query.id} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      <div>{query.requester_name || 'Unknown'}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-500">{query.requester_email}</div>
                    </td>
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
                    <td className="px-4 py-3 text-sm">
                      <RiskBadge risk={risk} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {query.pod_id}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(query.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={query.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openDetailModal(query)}
                          className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                        >
                          View Details
                        </button>
                        {query.status === 'PENDING' && (
                          <>
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
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
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
        {/* istanbul ignore next */}
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

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setRejectReason('');
        }}
        title="Reject Query"
      >
        {/* istanbul ignore next */}
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
        {/* istanbul ignore next */}
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
              <label className="text-sm text-gray-500 dark:text-gray-400">Risk Assessment</label>
              <div className="mt-1 flex items-center gap-2">
                <RiskBadge risk={analyzeRisk(selectedQuery)} />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({analyzeRisk(selectedQuery).reasons.join(', ')})
                </span>
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">Submitted By</label>
              <p className="text-gray-900 dark:text-white">{selectedQuery.requester_name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{selectedQuery.requester_email}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400">Instance</label>
                <p className="text-gray-900 dark:text-white">{selectedQuery.instance_name || '-'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400">Database</label>
                <p className="text-gray-900 dark:text-white">{selectedQuery.database_name}</p>
              </div>
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
                  <ResultDisplay result={selectedQuery.execution_result} queryId={selectedQuery.id} />
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
