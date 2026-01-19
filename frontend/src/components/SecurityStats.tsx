import { useState, useEffect } from 'react';
import { securityApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface SecurityStatsData {
  message: string;
  timestamp: string;
  totalUniqueIPs: number;
  topRequesters: Array<{
    ip: string;
    requests: number;
    duration: number;
  }>;
}

export function SecurityStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<SecurityStatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Only show for admin users
  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await securityApi.getStats();
      setStats(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch security stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Security Statistics</h2>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}

      {stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-medium text-gray-900 mb-2">Total Unique IPs</h3>
              <p className="text-2xl font-bold text-blue-600">{stats.totalUniqueIPs}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-medium text-gray-900 mb-2">Last Updated</h3>
              <p className="text-sm text-gray-600">
                {new Date(stats.timestamp).toLocaleString()}
              </p>
            </div>
          </div>

          {stats.topRequesters && stats.topRequesters.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Top Requesters</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        IP Address
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Requests
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Duration (ms)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stats.topRequesters.map((requester, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                          {requester.ip}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {requester.requests}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {requester.duration.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}