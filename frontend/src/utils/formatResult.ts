/**
 * Try to parse a value as JSON, recursively handling nested JSON strings
 */
function tryParseJSON(value: any): any {
  if (typeof value !== 'string') return value;
  try {
    const parsed = JSON.parse(value);
    // Recursively parse if the result is still a string (double-encoded JSON)
    if (typeof parsed === 'string') {
      return tryParseJSON(parsed);
    }
    return parsed;
  } catch {
    return value;
  }
}

/**
 * Formats execution result for display
 * Handles nested JSON strings and prettifies output
 */
export function formatExecutionResult(result: any): { type: 'table' | 'json' | 'text'; data: any } {
  if (!result) return { type: 'text', data: 'No result' };

  // Handle script execution result with stdout/stderr (legacy format)
  if (result.stdout !== undefined) {
    const parsed = tryParseJSON(result.stdout);
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
      return { type: 'table', data: parsed };
    }
    if (typeof parsed === 'object') {
      return { type: 'json', data: parsed };
    }
    return { type: 'text', data: result.stdout || result.stderr || 'Execution completed' };
  }

  // Handle string result (could be JSON string from script logs)
  if (typeof result === 'string') {
    const parsed = tryParseJSON(result);
    if (parsed !== result) {
      // Successfully parsed - recurse to handle the parsed result
      return formatExecutionResult(parsed);
    }
    return { type: 'text', data: result };
  }

  // Handle query execution result with rows
  if (result.rows && Array.isArray(result.rows)) {
    if (result.rows.length > 0) {
      return { type: 'table', data: result.rows };
    }
    return { type: 'text', data: `Query executed successfully. ${result.rowCount || 0} rows affected.` };
  }

  // Handle MongoDB results (usually arrays)
  if (Array.isArray(result)) {
    if (result.length > 0 && typeof result[0] === 'object') {
      return { type: 'table', data: result };
    }
    return { type: 'json', data: result };
  }

  // Default: show as JSON
  return { type: 'json', data: result };
}

/**
 * Get column headers from array of objects
 */
export function getTableColumns(data: Record<string, any>[]): string[] {
  if (!data || data.length === 0) return [];
  
  const allKeys = new Set<string>();
  data.forEach(row => {
    Object.keys(row).forEach(key => allKeys.add(key));
  });
  
  return Array.from(allKeys);
}

/**
 * Format cell value for display
 */
export function formatCellValue(value: any): string {
  if (value === null) return 'NULL';
  if (value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
