import { useState, useEffect } from 'react';
import { queriesApi } from '../../services/api';
import type { Query } from '../../types';
import { Button } from './Button';

interface QueryDetailsModalProps {
  queryId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function QueryDetailsModal({ queryId, isOpen, onClose }: QueryDetailsModalProps) {
  const [query, setQuery] = useState<Query | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && queryId) {
      loadQueryDetails();
    }
  }, [isOpen, queryId]);

  const loadQueryDetails = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await queriesApi.getById(queryId);
      setQuery(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load query details');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
      case 'EXECUTED':
        return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
      case 'REJECTED':
        return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
      case 'FAILED':
        return 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30';
      default:
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30';
    }
  };

  const formatResult = (result: any) => {
    if (!result) return null;

    if (typeof result === 'string') {
      return result;
    }

    if (result.rows && Array.isArray(result.rows)) {
      return (
        <div className="space-y-2">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {result.rows.length} row{result.rows.length !== 1 ? 's' : ''} returned
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 max-h-64 overflow-auto">
            <pre className="text-xs text-gray-800 dark:text-gray-200">
              {JSON.stringify(result.rows, null, 2)}
            </pre>
          </div>
        </div>
      );
    }

    if (result.stdout || result.stderr) {
      return (
        <div className="space-y-2">
          {result.stdout && (
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Output:</div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 max-h-32 overflow-auto">
                <pre className="text-xs text-gray-800 dark:text-gray-200">{result.stdout}</pre>
              </div>
            </div>
          )}
          {result.stderr && (
            <div>
              <div className="text-sm text-red-600 dark:text-red-400 mb-1">Error Output:</div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 max-h-32 overflow-auto">
                <pre className="text-xs text-red-800 dark:text-red-200">{result.stderr}</pre>
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 max-h-64 overflow-auto">
        <pre className="text-xs text-gray-800 dark:text-gray-200">
          {JSON.stringify(result, null, 2)}
        </pre>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Query Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" data-testid="loading-spinner"></div>
            </div>
          ) : error ? (
            <div className="text-center text-red-600 dark:text-red-400 py-8">
              {error}
            </div>
          ) : query ? (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Query ID
                  </label>
                  <div className="text-sm text-gray-900 dark:text-white font-mono">
                    {query.id}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Status
                  </label>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(query.status)}`}>
                    {query.status}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Submitted By
                  </label>
                  <div className="text-sm text-gray-900 dark:text-white">
                    {query.requester_name}
                    <div className="text-xs text-gray-500">{query.requester_email}</div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Submitted At
                  </label>
                  <div className="text-sm text-gray-900 dark:text-white">
                    {formatDate(query.created_at)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Database
                  </label>
                  <div className="text-sm text-gray-900 dark:text-white">
                    {query.database_name}
                    <div className="text-xs text-gray-500">{query.instance_name}</div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    POD
                  </label>
                  <div className="text-sm text-gray-900 dark:text-white">
                    {query.pod_id}
                    {query.pod_manager_name && (
                      <div className="text-xs text-gray-500">Manager: {query.pod_manager_name}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Comments */}
              {query.comments && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Comments
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <div className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                      {query.comments}
                    </div>
                  </div>
                </div>
              )}

              {/* Query/Script Content */}
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  {query.submission_type === 'SCRIPT' ? 'Script Content' : 'Query Text'}
                </label>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 max-h-64 overflow-auto">
                  <pre className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                    {query.submission_type === 'SCRIPT' ? query.script_content : query.query_text}
                  </pre>
                </div>
              </div>

              {/* Rejection Reason */}
              {query.status === 'REJECTED' && query.rejection_reason && (
                <div>
                  <label className="block text-sm font-medium text-red-600 dark:text-red-400 mb-2">
                    Rejection Reason
                  </label>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 max-h-32 overflow-y-auto">
                    <div className="text-sm text-red-800 dark:text-red-200 whitespace-pre-wrap">
                      {query.rejection_reason}
                    </div>
                  </div>
                </div>
              )}

              {/* Execution Result */}
              {(query.status === 'EXECUTED' || query.status === 'FAILED') && query.execution_result && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    {query.status === 'EXECUTED' ? 'Execution Result' : 'Error Details'}
                  </label>
                  {formatResult(query.execution_result)}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-800">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}