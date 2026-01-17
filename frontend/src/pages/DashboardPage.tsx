import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { instancesApi, databasesApi, podsApi, queriesApi } from '../services/api';
import type { DbInstance, Pod } from '../types';
import { Select } from '../components/ui/Select';
import { TextArea } from '../components/ui/TextArea';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { FileUpload } from '../components/ui/FileUpload';

interface PrefillData {
  instanceId: string;
  databaseName: string;
  queryText: string;
  scriptContent?: string;
  comments: string;
  podId: string;
  submissionType: 'QUERY' | 'SCRIPT';
}

export function DashboardPage() {
  const location = useLocation();
  const prefillData = (location.state as { prefill?: PrefillData })?.prefill;
  const prefillProcessed = useRef(false);
  const skipNextDbTypeEffect = useRef(false);
  const skipNextInstanceEffect = useRef(false);

  // Form state
  const [dbType, setDbType] = useState('');
  const [instanceId, setInstanceId] = useState('');
  const [databaseName, setDatabaseName] = useState('');
  const [submissionType, setSubmissionType] = useState<'QUERY' | 'SCRIPT'>('QUERY');
  const [queryText, setQueryText] = useState('');
  const [scriptFile, setScriptFile] = useState<File | null>(null);
  const [comments, setComments] = useState('');
  const [podId, setPodId] = useState('');

  // Data state
  const [instances, setInstances] = useState<DbInstance[]>([]);
  const [databases, setDatabases] = useState<string[]>([]);
  const [pods, setPods] = useState<Pod[]>([]);
  const [allInstances, setAllInstances] = useState<DbInstance[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isInitializing, setIsInitializing] = useState(!!prefillData);

  // Load pods on mount
  useEffect(() => {
    podsApi.getAll()
      .then((res) => setPods(res.data))
      .catch((err) => console.error('Failed to load pods:', err));
  }, []);

  // Load all instances for prefill lookup
  useEffect(() => {
    Promise.all([
      instancesApi.getAll('POSTGRES'),
      instancesApi.getAll('MONGODB'),
    ]).then(([pg, mongo]) => {
      setAllInstances([...pg.data, ...mongo.data]);
    }).catch((err) => console.error('Failed to load instances:', err));
  }, []);

  // Handle prefill from navigation state (Modify button from My Submissions)
  useEffect(() => {
    if (prefillData && allInstances.length > 0 && !prefillProcessed.current) {
      prefillProcessed.current = true;
      
      const instance = allInstances.find(i => i.id === prefillData.instanceId);
      
      if (instance) {
        const detectedDbType = instance.type;
        
        // Load instances for this dbType, then set all values
        instancesApi.getAll(detectedDbType)
          .then((res) => {
            setInstances(res.data);
            return databasesApi.getByInstance(prefillData.instanceId);
          })
          .then((res) => {
            setDatabases(res.data.map(d => d.database_name));
            
            // Mark to skip the cascading effects
            skipNextDbTypeEffect.current = true;
            skipNextInstanceEffect.current = true;
            
            // Now set all form values
            setDbType(detectedDbType);
            setInstanceId(prefillData.instanceId);
            setDatabaseName(prefillData.databaseName);
            setPodId(prefillData.podId);
            setComments(prefillData.comments);
            setSubmissionType(prefillData.submissionType);
            
            if (prefillData.submissionType === 'SCRIPT' && prefillData.scriptContent) {
              const blob = new Blob([prefillData.scriptContent], { type: 'application/javascript' });
              const file = new File([blob], 'script.js', { type: 'application/javascript' });
              setScriptFile(file);
              setQueryText('');
            } else {
              setQueryText(prefillData.queryText);
              setScriptFile(null);
            }
            
            setIsInitializing(false);
          })
          .catch((err) => {
            console.error('Failed to prefill:', err);
            setIsInitializing(false);
          });
      } else {
        setIsInitializing(false);
      }
      
      // Clear location state to prevent re-prefill on refresh
      window.history.replaceState({}, document.title);
    }
  }, [prefillData, allInstances]);

  // Load instances when dbType changes
  useEffect(() => {
    if (isInitializing) return;
    
    // Skip if this was triggered by prefill
    if (skipNextDbTypeEffect.current) {
      skipNextDbTypeEffect.current = false;
      return;
    }
    
    if (dbType) {
      instancesApi.getAll(dbType)
        .then((res) => setInstances(res.data))
        .catch((err) => console.error('Failed to load instances:', err));
    } else {
      setInstances([]);
    }
    setInstanceId('');
    setDatabaseName('');
    setDatabases([]);
  }, [dbType, isInitializing]);

  // Load databases when instanceId changes
  useEffect(() => {
    if (isInitializing) return;
    
    // Skip if this was triggered by prefill
    if (skipNextInstanceEffect.current) {
      skipNextInstanceEffect.current = false;
      return;
    }
    
    if (instanceId) {
      databasesApi.getByInstance(instanceId)
        .then((res) => setDatabases(res.data.map(d => d.database_name)))
        .catch((err) => console.error('Failed to load databases:', err));
    } else {
      setDatabases([]);
    }
    setDatabaseName('');
  }, [instanceId, isInitializing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (submissionType === 'SCRIPT') {
        if (!scriptFile) {
          setError('Please upload a script file');
          setIsLoading(false);
          return;
        }
        const formData = new FormData();
        formData.append('instanceId', instanceId);
        formData.append('databaseName', databaseName);
        formData.append('podId', podId);
        formData.append('comments', comments);
        formData.append('submissionType', 'SCRIPT');
        formData.append('script', scriptFile);
        await queriesApi.submit(formData);
      } else {
        await queriesApi.submit({
          instanceId,
          databaseName,
          queryText,
          podId,
          comments,
          submissionType: 'QUERY',
        });
      }

      setSuccess('Query submitted successfully! Awaiting approval.');
      // Reset form
      setDbType('');
      setInstanceId('');
      setDatabaseName('');
      setQueryText('');
      setScriptFile(null);
      setComments('');
      setPodId('');
      setSubmissionType('QUERY');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit query');
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Submit Query Request
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg text-green-700 dark:text-green-400">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Database Type"
          value={dbType}
          onChange={(e) => setDbType(e.target.value)}
          options={[
            { value: 'POSTGRES', label: 'PostgreSQL' },
            { value: 'MONGODB', label: 'MongoDB' },
          ]}
          placeholder="Select database type"
          required
        />

        <Select
          label="Instance"
          value={instanceId}
          onChange={(e) => setInstanceId(e.target.value)}
          options={instances.map(i => ({ value: i.id, label: i.name }))}
          placeholder="Select instance"
          disabled={!dbType}
          required
        />

        <Select
          label="Database"
          value={databaseName}
          onChange={(e) => setDatabaseName(e.target.value)}
          options={databases.map(d => ({ value: d, label: d }))}
          placeholder="Select database"
          disabled={!instanceId}
          required
        />

        <Select
          label="Pod"
          value={podId}
          onChange={(e) => setPodId(e.target.value)}
          options={pods.map(p => ({ value: p.id, label: p.name }))}
          placeholder="Select pod"
          required
        />

        <Select
          label="Submission Type"
          value={submissionType}
          onChange={(e) => setSubmissionType(e.target.value as 'QUERY' | 'SCRIPT')}
          options={[
            { value: 'QUERY', label: 'Query' },
            { value: 'SCRIPT', label: 'Script (.js file)' },
          ]}
          required
        />

        {submissionType === 'QUERY' ? (
          <>
            <TextArea
              label="Query"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder={dbType === 'MONGODB' 
                ? "db.users.find({})"
                : "SELECT * FROM users WHERE active = true"}
              rows={6}
              required
            />
            
            {/* Query Documentation */}
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <h4 className="text-sm font-semibold text-green-800 dark:text-green-300 mb-2">
                🔍 How to Write Queries
              </h4>
              
              {dbType === 'POSTGRES' && (
                <div className="text-sm text-green-700 dark:text-green-400 space-y-2">
                  <p><strong>Single SQL query only</strong> - no semicolons needed:</p>
                  <pre className="bg-white dark:bg-gray-800 p-2 rounded text-xs overflow-x-auto">
{`SELECT * FROM users WHERE active = true

SELECT COUNT(*) FROM orders WHERE status = 'pending'

SELECT u.name, COUNT(o.id) as order_count 
FROM users u 
LEFT JOIN orders o ON u.id = o.user_id 
GROUP BY u.id, u.name`}
                  </pre>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    ⚠️ Query mode supports single expressions only. For multiple queries, use Script mode.
                  </p>
                </div>
              )}
              
              {dbType === 'MONGODB' && (
                <div className="text-sm text-green-700 dark:text-green-400 space-y-2">
                  <p><strong>Single MongoDB expression only</strong> - no semicolons needed:</p>
                  <pre className="bg-white dark:bg-gray-800 p-2 rounded text-xs overflow-x-auto">
{`db.users.find({})

db.users.find({ status: 'active' })

db.orders.countDocuments({ status: 'pending' })

db.users.aggregate([
  { $group: { _id: '$department', count: { $sum: 1 } } }
])

collection('users').find({ age: { $gte: 18 } })`}
                  </pre>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    ⚠️ Query mode supports single expressions only. For multiple queries, use Script mode.
                  </p>
                </div>
              )}
              
              {!dbType && (
                <p className="text-sm text-green-600 dark:text-green-400 italic">
                  Select a database type above to see query examples.
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <FileUpload
              label="Script File"
              accept=".js"
              value={scriptFile}
              onChange={setScriptFile}
            />
            
            {/* Script Documentation */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">
                📝 How to Write Scripts
              </h4>
              
              {dbType === 'POSTGRES' && (
                <div className="text-sm text-blue-700 dark:text-blue-400 space-y-2">
                  <p>For PostgreSQL, use the pre-injected <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">query()</code> function:</p>
                  <pre className="bg-white dark:bg-gray-800 p-2 rounded text-xs overflow-x-auto">
{`// query() function is pre-injected - use it to run SQL
const users = await query('SELECT * FROM users LIMIT 10');
console.log('Users:', users);

// With parameters (use $1, $2, etc.)
const orders = await query('SELECT * FROM orders WHERE status = $1', ['pending']);
console.log('Pending orders:', orders);

// Multiple queries in one script
const userCount = await query('SELECT COUNT(*) as total FROM users');
const activeUsers = await query('SELECT * FROM users WHERE active = true');

console.log('Total users:', userCount[0].total);
console.log('Active users:', activeUsers.length);

// Return final result (optional)
return {
  totalUsers: userCount[0].total,
  activeUsers: activeUsers.length,
  summary: \`Found \${activeUsers.length} active out of \${userCount[0].total} total users\`
};`}
                  </pre>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    💡 Scripts can run multiple queries, use variables, loops, and JavaScript logic.
                  </p>
                </div>
              )}
              
              {dbType === 'MONGODB' && (
                <div className="text-sm text-blue-700 dark:text-blue-400 space-y-2">
                  <p>For MongoDB, use the pre-injected <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">db</code> object and <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">collection()</code> helper:</p>
                  <pre className="bg-white dark:bg-gray-800 p-2 rounded text-xs overflow-x-auto">
{`// db object is pre-injected - use natural MongoDB syntax
const users = await db.users.find({});
console.log('All users:', users);

// Alternative: collection() helper function
const logs = await collection('logs').find({ level: 'error' });
console.log('Error logs:', logs);

// Multiple operations in one script
const userCount = await db.users.countDocuments({});
const activeUsers = await db.users.find({ status: 'active' });
const recentLogs = await db.logs.find({ 
  timestamp: { $gte: new Date(Date.now() - 24*60*60*1000) } 
});

console.log('User count:', userCount);
console.log('Active users:', activeUsers.length);
console.log('Recent logs:', recentLogs.length);

// Data processing with JavaScript
const usersByStatus = {};
for (const user of activeUsers) {
  usersByStatus[user.status] = (usersByStatus[user.status] || 0) + 1;
}

// Return final result (optional)
return {
  totalUsers: userCount,
  activeUsers: activeUsers.length,
  recentLogs: recentLogs.length,
  breakdown: usersByStatus
};`}
                  </pre>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    💡 Both <code>db.collectionName.method()</code> and <code>collection('name').method()</code> syntax work.
                  </p>
                </div>
              )}
              
              {!dbType && (
                <p className="text-sm text-blue-600 dark:text-blue-400 italic">
                  Select a database type above to see script examples.
                </p>
              )}
              
              <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  ⚠️ Scripts run in a sandboxed environment with restricted file system and network access.<br/>
                  📊 Results display as: <strong>Table</strong> (array of objects), <strong>JSON</strong> (single object), or <strong>Text</strong> (strings).
                </p>
              </div>
            </div>
          </>
        )}

        <Input
          label="Comments"
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder="Describe the purpose of this query"
          required
        />

        <Button type="submit" isLoading={isLoading} className="w-full">
          Submit for Approval
        </Button>
      </form>
    </div>
  );
}
