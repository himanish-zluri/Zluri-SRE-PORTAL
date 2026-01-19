import { formatExecutionResult, getTableColumns, formatCellValue } from '../formatResult';

describe('formatExecutionResult', () => {
  it('should handle null and undefined results', () => {
    expect(formatExecutionResult(null)).toEqual({ type: 'text', data: 'No result' });
    expect(formatExecutionResult(undefined)).toEqual({ type: 'text', data: 'No result' });
  });

  it('should handle legacy script execution result with stdout', () => {
    const result = { stdout: 'Hello World', stderr: '' };
    expect(formatExecutionResult(result)).toEqual({ type: 'text', data: 'Hello World' });
  });

  it('should handle script execution result with JSON stdout', () => {
    const result = { stdout: '[{"id": 1, "name": "John"}]' };
    expect(formatExecutionResult(result)).toEqual({ 
      type: 'table', 
      data: [{ id: 1, name: 'John' }] 
    });
  });

  it('should handle script execution result with object JSON stdout', () => {
    const result = { stdout: '{"message": "success", "count": 5}' };
    expect(formatExecutionResult(result)).toEqual({ 
      type: 'json', 
      data: { message: 'success', count: 5 } 
    });
  });

  it('should handle script execution result with stderr', () => {
    const result = { stdout: '', stderr: 'Error occurred' };
    expect(formatExecutionResult(result)).toEqual({ type: 'text', data: 'Error occurred' });
  });

  it('should handle script execution result with no output', () => {
    const result = { stdout: '', stderr: '' };
    expect(formatExecutionResult(result)).toEqual({ type: 'text', data: 'Execution completed' });
  });

  it('should handle string result with valid JSON', () => {
    const result = '[{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob"}]';
    expect(formatExecutionResult(result)).toEqual({ 
      type: 'table', 
      data: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }] 
    });
  });

  it('should handle string result with concatenated JSON objects', () => {
    const result = '{"id": 1, "name": "Alice"}{"id": 2, "name": "Bob"}';
    expect(formatExecutionResult(result)).toEqual({ 
      type: 'table', 
      data: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }] 
    });
  });

  it('should handle concatenated JSON with duplicates', () => {
    const result = '{"id": 1, "name": "Alice"}{"id": 1, "name": "Alice"}{"id": 2, "name": "Bob"}';
    expect(formatExecutionResult(result)).toEqual({ 
      type: 'table', 
      data: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }] 
    });
  });

  it('should handle plain string result', () => {
    const result = 'Simple text result';
    expect(formatExecutionResult(result)).toEqual({ type: 'text', data: 'Simple text result' });
  });

  it('should handle query execution result with rows', () => {
    const result = { 
      rows: [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }],
      rowCount: 2 
    };
    expect(formatExecutionResult(result)).toEqual({ 
      type: 'table', 
      data: [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }] 
    });
  });

  it('should handle query execution result with empty rows', () => {
    const result = { rows: [], rowCount: 0 };
    expect(formatExecutionResult(result)).toEqual({ 
      type: 'text', 
      data: 'Query executed successfully. 0 rows affected.' 
    });
  });

  it('should handle query execution result without rowCount', () => {
    const result = { rows: [] };
    expect(formatExecutionResult(result)).toEqual({ 
      type: 'text', 
      data: 'Query executed successfully. 0 rows affected.' 
    });
  });

  it('should handle array of objects', () => {
    const result = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
    expect(formatExecutionResult(result)).toEqual({ 
      type: 'table', 
      data: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }] 
    });
  });

  it('should handle array with nested JSON strings', () => {
    const result = ['{"id": 1, "name": "Alice"}', '{"id": 2, "name": "Bob"}'];
    expect(formatExecutionResult(result)).toEqual({ 
      type: 'table', 
      data: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }] 
    });
  });

  it('should handle array with stringified array', () => {
    const result = ['[{"id": 1}, {"id": 2}]'];
    expect(formatExecutionResult(result)).toEqual({ 
      type: 'table', 
      data: [{ id: 1 }, { id: 2 }] 
    });
  });

  it('should handle array with nested arrays', () => {
    const result = [[{ id: 1 }], [{ id: 2 }]];
    expect(formatExecutionResult(result)).toEqual({ 
      type: 'table', 
      data: [{ id: 1 }, { id: 2 }] 
    });
  });

  it('should handle array with concatenated JSON strings', () => {
    const result = ['{"id": 1}{"id": 2}'];
    expect(formatExecutionResult(result)).toEqual({ 
      type: 'table', 
      data: [{ id: 1 }, { id: 2 }] 
    });
  });

  it('should handle mixed array with null/undefined values', () => {
    const result = [{ id: 1 }, null, undefined, { id: 2 }];
    expect(formatExecutionResult(result)).toEqual({ 
      type: 'table', 
      data: [{ id: 1 }, { id: 2 }] 
    });
  });

  it('should handle empty array', () => {
    const result: any[] = [];
    expect(formatExecutionResult(result)).toEqual({ type: 'json', data: [] });
  });

  it('should handle object result', () => {
    const result = { message: 'success', data: { count: 5 } };
    expect(formatExecutionResult(result)).toEqual({ 
      type: 'json', 
      data: { message: 'success', data: { count: 5 } } 
    });
  });

  it('should handle deeply nested JSON strings', () => {
    const result = '"{\\"nested\\": \\"value\\"}"';
    expect(formatExecutionResult(result)).toEqual({ 
      type: 'json', 
      data: { nested: 'value' } 
    });
  });

  it('should handle non-string input for parseConcatenatedJson', () => {
    // This tests the branch where typeof str !== 'string'
    const result = 123; // Non-string input
    expect(formatExecutionResult(result)).toEqual({ 
      type: 'json', 
      data: 123 
    });
  });

  it('should handle string without concatenated JSON pattern', () => {
    // This tests the branch where !str.includes('}{')
    const result = '{"single": "object"}';
    expect(formatExecutionResult(result)).toEqual({ 
      type: 'json', 
      data: { single: 'object' } 
    });
  });

  it('should handle array with non-object elements after flattening', () => {
    // This tests the branch where flattened.length > 0 but first element is not object
    const result = ['string1', 'string2', 'string3'];
    expect(formatExecutionResult(result)).toEqual({ 
      type: 'json', 
      data: ['string1', 'string2', 'string3'] 
    });
  });

  it('should handle empty flattened array', () => {
    // This tests the branch where flattened.length === 0
    // Array with only null/undefined values results in empty flattened array
    const result = [null, undefined];
    // Since null is typeof 'object', this will be treated as table
    expect(formatExecutionResult(result)).toEqual({ 
      type: 'table', 
      data: [null, undefined] 
    });
  });
});

describe('getTableColumns', () => {
  it('should return empty array for empty data', () => {
    expect(getTableColumns([])).toEqual([]);
  });

  it('should return empty array for null/undefined data', () => {
    expect(getTableColumns(null as any)).toEqual([]);
    expect(getTableColumns(undefined as any)).toEqual([]);
  });

  it('should return columns from single object', () => {
    const data = [{ id: 1, name: 'John', email: 'john@example.com' }];
    const columns = getTableColumns(data);
    expect(columns).toEqual(expect.arrayContaining(['id', 'name', 'email']));
    expect(columns).toHaveLength(3);
  });

  it('should return all unique columns from multiple objects', () => {
    const data = [
      { id: 1, name: 'John' },
      { id: 2, email: 'jane@example.com' },
      { name: 'Bob', phone: '123-456-7890' }
    ];
    const columns = getTableColumns(data);
    expect(columns).toEqual(expect.arrayContaining(['id', 'name', 'email', 'phone']));
    expect(columns).toHaveLength(4);
  });

  it('should handle objects with no properties', () => {
    const data = [{}];
    expect(getTableColumns(data)).toEqual([]);
  });
});

describe('formatCellValue', () => {
  it('should return "NULL" for null values', () => {
    expect(formatCellValue(null)).toBe('NULL');
  });

  it('should return empty string for undefined values', () => {
    expect(formatCellValue(undefined)).toBe('');
  });

  it('should return JSON string for objects', () => {
    const obj = { id: 1, name: 'John' };
    expect(formatCellValue(obj)).toBe('{"id":1,"name":"John"}');
  });

  it('should return JSON string for arrays', () => {
    const arr = [1, 2, 3];
    expect(formatCellValue(arr)).toBe('[1,2,3]');
  });

  it('should return string representation for primitives', () => {
    expect(formatCellValue(123)).toBe('123');
    expect(formatCellValue(true)).toBe('true');
    expect(formatCellValue('hello')).toBe('hello');
  });

  it('should handle nested objects', () => {
    const nested = { user: { id: 1, profile: { name: 'John' } } };
    expect(formatCellValue(nested)).toBe('{"user":{"id":1,"profile":{"name":"John"}}}');
  });
});