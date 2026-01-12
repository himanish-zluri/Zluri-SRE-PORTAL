import { formatExecutionResult, getTableColumns, formatCellValue } from '../../utils/formatResult';

interface ResultDisplayProps {
  result: any;
  maxHeight?: string;
}

export function ResultDisplay({ result, maxHeight = '300px' }: ResultDisplayProps) {
  const formatted = formatExecutionResult(result);

  if (formatted.type === 'table') {
    const columns = getTableColumns(formatted.data);
    
    return (
      <div className={`overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg`} style={{ maxHeight }}>
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
            {formatted.data.map((row: Record<string, any>, idx: number) => (
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
          {formatted.data.length} row{formatted.data.length !== 1 ? 's' : ''} returned
        </div>
      </div>
    );
  }

  if (formatted.type === 'json') {
    return (
      <pre
        className={`p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 overflow-auto font-mono`}
        style={{ maxHeight }}
      >
        {JSON.stringify(formatted.data, null, 2)}
      </pre>
    );
  }

  // Text type
  return (
    <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300">
      {formatted.data}
    </div>
  );
}
