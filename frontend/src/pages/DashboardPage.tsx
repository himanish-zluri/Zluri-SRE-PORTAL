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
          <TextArea
            label="Query"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder={dbType === 'MONGODB' 
              ? "return await db.collection('users').find({}).toArray();"
              : "SELECT * FROM users WHERE active = true;"}
            rows={6}
            required
          />
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
{`// query() is pre-injected - use it to run SQL
const users = await query('SELECT * FROM users LIMIT 10');
console.log(users);

// With parameters
const orders = await query('SELECT * FROM orders WHERE status = $1', ['pending']);

// Using loops
for (let i = 0; i < 5; i++) {
  const batch = await query('SELECT * FROM items WHERE batch_id = $1', [i]);
  console.log(batch);
}

// All console.log outputs are captured and returned as result
console.log({ users, orders });`}
                  </pre>
                </div>
              )}
              
              {dbType === 'MONGODB' && (
                <div className="text-sm text-blue-700 dark:text-blue-400 space-y-2">
                  <p>For MongoDB, use the pre-injected <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">db</code> object:</p>
                  <pre className="bg-white dark:bg-gray-800 p-2 rounded text-xs overflow-x-auto">
{`// db is pre-injected - use it to access collections
const users = await db.collection('users').find({}).limit(10).toArray();
console.log(users);

// Insert, update, delete
await db.collection('logs').insertOne({ action: 'test', timestamp: new Date() });

// Using loops
const collections = ['users', 'orders', 'products'];
for (const coll of collections) {
  const count = await db.collection(coll).countDocuments();
  console.log({ collection: coll, count });
}

// Aggregation
const stats = await db.collection('orders').aggregate([
  { $group: { _id: '$status', count: { $sum: 1 } } }
]).toArray();

// All console.log outputs are captured and returned as result
console.log(stats);`}
                  </pre>
                </div>
              )}
              
              {!dbType && (
                <p className="text-sm text-blue-600 dark:text-blue-400 italic">
                  Select a database type above to see script examples.
                </p>
              )}
              
              <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  ⚠️ Scripts run in a sandboxed environment. File system access and network calls are restricted.
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
