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
 * Try to parse concatenated JSON objects like: {"a":1}{"b":2}{"c":3}
 * Returns array of parsed objects, or null if not in this format
 */
function parseConcatenatedJson(str: string): any[] | null {
  /* istanbul ignore if */
  if (typeof str !== 'string') return null;
  
  // Check if it looks like concatenated JSON objects
  if (!str.includes('}{')) return null;
  
  try {
    // Split on }{ and reconstruct individual JSON objects
    const parts = str.split(/\}\s*\{/).map((part, i, arr) => {
      if (i === 0) return part + '}';
      if (i === arr.length - 1) return '{' + part;
      return '{' + part + '}';
    });
    
    const parsed = parts.map(p => JSON.parse(p));
    return parsed;
  /* istanbul ignore next */
  } catch {
    return null;
  }
}

/**
 * Formats execution result for display
 * Handles nested JSON strings and prettifies output
 */
export function formatExecutionResult(result: any): { type: 'table' | 'json' | 'text'; data: any } {
  if (result === null || result === undefined) return { type: 'text', data: 'No result' };

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

  // Handle string result (could be JSON string or concatenated JSON)
  if (typeof result === 'string') {
    // First try to parse concatenated JSON objects like {"a":1}{"b":2}
    const concatenated = parseConcatenatedJson(result);
    if (concatenated) {
      // Dedupe if there are repeated objects
      const seen = new Set<string>();
      const unique = concatenated.filter(item => {
        const key = JSON.stringify(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return { type: 'table', data: unique };
    }
    
    // Try regular JSON parse
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

  // Handle arrays (MongoDB results, script logs, etc.)
  if (Array.isArray(result)) {
    // First flatten any nested arrays and parse any JSON strings
    const flattened: any[] = [];
    
    for (const item of result) {
      if (typeof item === 'string') {
        // Try to parse as JSON
        const parsed = tryParseJSON(item);
        if (Array.isArray(parsed)) {
          // Stringified array - flatten it
          flattened.push(...parsed);
        } else if (typeof parsed === 'object' && parsed !== null) {
          flattened.push(parsed);
        } else {
          // Check if it's concatenated JSON
          const concatenated = parseConcatenatedJson(item);
          /* istanbul ignore else */
          if (concatenated) {
            flattened.push(...concatenated);
          } else {
            flattened.push(item);
          }
        }
      } else if (Array.isArray(item)) {
        // Nested array - flatten it
        flattened.push(...item);
      } else if (item !== null && item !== undefined) {
        flattened.push(item);
      }
    }
    
    if (flattened.length > 0 && typeof flattened[0] === 'object') {
      return { type: 'table', data: flattened };
    }
    /* istanbul ignore if */
    if (flattened.length > 0) {
      return { type: 'json', data: flattened };
    }
    
    // Original array handling
    /* istanbul ignore if */
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
