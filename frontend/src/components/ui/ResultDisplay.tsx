import { useState } from 'react';
import { formatExecutionResult, getTableColumns, formatCellValue } from '../../utils/formatResult';
import { Modal } from './Modal';
import { Button } from './Button';

interface ResultDisplayProps {
  result: any;
  maxHeight?: string;
  queryId?: string;
}

export function ResultDisplay({ result, maxHeight = '300px', queryId }: ResultDisplayProps) {
  const [showFullModal, setShowFullModal] = useState(false);
  const formatted = formatExecutionResult(result);

  // Check if there's any meaningful content to show buttons for
  const hasContent = () => {
    if (formatted.type === 'table') return formatted.data.length > 0;
    if (formatted.type === 'json') {
      if (formatted.data === null || formatted.data === undefined) return false;
      if (Array.isArray(formatted.data)) return formatted.data.length > 0;
      if (typeof formatted.data === 'string') return formatted.data.length > 0;
      return true; // Objects, numbers, booleans are meaningful
    }
    // For text type, check if it's the default "No result" message
    if (formatted.type === 'text') {
      return formatted.data !== 'No result' && String(formatted.data).length > 0;
    }
    
    // Handle primitive values that should show buttons (0, false are meaningful)
    if (result === 0 || result === false) return true;
    
    return String(formatted.data).length > 0;
  };

  const downloadResult = () => {
    let content: string;
    let filename: string;
    let mimeType: string;

    if (formatted.type === 'table') {
      // Export as CSV
      const columns = getTableColumns(formatted.data);
      const csvRows = [
        columns.join(','),
        ...formatted.data.map((row: Record<string, any>) =>
          columns.map(col => {
            const val = formatCellValue(row[col]);
            // Escape quotes and wrap in quotes if contains comma
            if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
              return `"${val.replace(/"/g, '""')}"`;
            }
            return val;
          }).join(',')
        )
      ];
      content = csvRows.join('\n');
      filename = `result-${queryId?.substring(0, 8) || 'export'}.csv`;
      mimeType = 'text/csv';
    } else if (formatted.type === 'json') {
      content = JSON.stringify(formatted.data, null, 2);
      filename = `result-${queryId?.substring(0, 8) || 'export'}.json`;
      mimeType = 'application/json';
    } else {
      content = String(formatted.data);
      filename = `result-${queryId?.substring(0, 8) || 'export'}.txt`;
      mimeType = 'text/plain';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderTable = (data: any[], isModal = false) => {
    const columns = getTableColumns(data);
    
    return (
      <div className={`overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg`} style={{ maxHeight: isModal ? '60vh' : maxHeight }}>
        <table className="w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0">
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row: Record<string, any>, idx: number) => (
              <tr
                key={idx}
                className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                {columns.map((col) => (
                  <td
                    key={col}
                    className="px-3 py-2 text-gray-700 dark:text-gray-300 font-mono text-xs"
                  >
                    {formatCellValue(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
          {data.length} row{data.length !== 1 ? 's' : ''} returned
        </div>
      </div>
    );
  };

  const renderJson = () => {
    const jsonStr = JSON.stringify(formatted.data, null, 2);
    
    return (
      <pre
        className={`p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 overflow-auto font-mono whitespace-pre-wrap`}
        style={{ maxHeight }}
      >
        {jsonStr}
      </pre>
    );
  };

  const renderText = () => {
    const text = String(formatted.data);
    
    return (
      <div 
        className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap overflow-auto"
        style={{ maxHeight }}
      >
        {text}
      </div>
    );
  };

  const renderContent = (isModal = false) => {
    if (formatted.type === 'table') {
      return renderTable(formatted.data, isModal);
    }
    if (formatted.type === 'json') {
      return renderJson();
    }
    return renderText();
  };

  return (
    <div>
      {renderContent(false)}
      
      {hasContent() && (
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={() => setShowFullModal(true)}
            className="text-xs text-blue-500 hover:text-blue-400 cursor-pointer flex items-center gap-1"
          >
            🔍 View Full Result
          </button>
          <button
            onClick={downloadResult}
            className="text-xs text-blue-500 hover:text-blue-400 cursor-pointer flex items-center gap-1"
          >
            ⬇️ Download
          </button>
        </div>
      )}

      <Modal
        isOpen={showFullModal}
        onClose={() => setShowFullModal(false)}
        title="Full Execution Result"
      >
        <div className="space-y-4">
          {renderContent(true)}
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <Button variant="secondary" onClick={downloadResult}>
              ⬇️ Download
            </Button>
            <Button variant="secondary" onClick={() => setShowFullModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
