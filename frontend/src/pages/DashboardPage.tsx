import { useState, useEffect } from 'react';
import { instancesApi, databasesApi, podsApi, queriesApi } from '../services/api';
import type { DbInstance, Pod } from '../types';
import { Select } from '../components/ui/Select';
import { TextArea } from '../components/ui/TextArea';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { FileUpload } from '../components/ui/FileUpload';

export function DashboardPage() {
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

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load pods on mount
  useEffect(() => {
    podsApi.getAll()
      .then((res) => setPods(res.data))
      .catch((err) => console.error('Failed to load pods:', err));
  }, []);

  // Load instances when db type changes
  useEffect(() => {
    if (dbType) {
      instancesApi.getAll(dbType)
        .then((res) => setInstances(res.data))
        .catch((err) => {
          console.error('Failed to load instances:', err);
          setInstances([]);
        });
      setInstanceId('');
      setDatabaseName('');
      setDatabases([]);
    }
  }, [dbType]);

  // Load databases when instance changes
  useEffect(() => {
    if (instanceId) {
      databasesApi.getByInstance(instanceId)
        .then((res) => setDatabases(res.data.map(d => d.database_name)))
        .catch((err) => {
          console.error('Failed to load databases:', err);
          setDatabases([]);
        });
      setDatabaseName('');
    }
  }, [instanceId]);

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

  const handleCancel = () => {
    setDbType('');
    setInstanceId('');
    setDatabaseName('');
    setQueryText('');
    setScriptFile(null);
    setComments('');
    setPodId('');
    setSubmissionType('QUERY');
    setError('');
    setSuccess('');
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Submit Query / Script
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Database Type */}
          <Select
            label="Database Type"
            value={dbType}
            onChange={(e) => setDbType(e.target.value)}
            options={[
              { value: 'POSTGRES', label: 'PostgreSQL' },
              { value: 'MONGODB', label: 'MongoDB' },
            ]}
            placeholder="Select Type"
            required
          />

          {/* Instance Name */}
          <Select
            label="Instance Name"
            value={instanceId}
            onChange={(e) => setInstanceId(e.target.value)}
            options={instances.map((i) => ({ value: i.id, label: i.name }))}
            placeholder="Select Instance"
            disabled={!dbType}
            required
          />

          {/* Database Name */}
          <Select
            label="Database Name"
            value={databaseName}
            onChange={(e) => setDatabaseName(e.target.value)}
            options={databases.map((d) => ({ value: d, label: d }))}
            placeholder="Select Database"
            disabled={!instanceId}
            required
          />

          {/* Submission Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Submission Type <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="submissionType"
                  value="QUERY"
                  checked={submissionType === 'QUERY'}
                  onChange={() => setSubmissionType('QUERY')}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-gray-700 dark:text-gray-300">Query</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="submissionType"
                  value="SCRIPT"
                  checked={submissionType === 'SCRIPT'}
                  onChange={() => setSubmissionType('SCRIPT')}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-gray-700 dark:text-gray-300">Script</span>
              </label>
            </div>
          </div>

          {/* Query Text or Script Upload */}
          {submissionType === 'QUERY' ? (
            <TextArea
              label="Query"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder={dbType === 'MONGODB' 
                ? "return await db.collection('users').find({}).toArray();" 
                : "SELECT * FROM users WHERE status = 'active';"
              }
              rows={6}
              required
            />
          ) : (
            <FileUpload
              label="Upload Script"
              value={scriptFile}
              onChange={setScriptFile}
            />
          )}

          {/* Comments */}
          <Input
            label="Comments"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Describe what this query does..."
            required
          />

          {/* POD Name */}
          <Select
            label="POD Name"
            value={podId}
            onChange={(e) => setPodId(e.target.value)}
            options={pods.map((p) => ({ value: p.id, label: `${p.name} (${p.manager_name})` }))}
            placeholder="Select POD"
            required
          />

          {/* Error/Success Messages */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-sm text-green-500">{success}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <Button type="submit" isLoading={isLoading}>
              SUBMIT
            </Button>
            <Button type="button" variant="secondary" onClick={handleCancel}>
              CANCEL
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
