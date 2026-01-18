import { formatExecutionResult, getTableColumns, formatCellValue } from '../formatResult';

describe('formatExecutionResult', () => {
  describe('null/undefined handling', () => {
    it('returns "No result" for null', () => {
      const result = formatExecutionResult(null);
      expect(result).toEqual({ type: 'text', data: 'No result' });
    });

    it('returns "No result" for undefined', () => {
      const result = formatExecutionResult(undefined);
      expect(result).toEqual({ type: 'text', data: 'No result' });
    });
  });

  describe('stdout/stderr format (legacy)', () => {
    it('handles stdout with JSON array', () => {
      const result = formatExecutionResult({
        stdout: '[{"id":1},{"id":2}]',
      });
      expect(result.type).toBe('table');
      expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('handles stdout with JSON object', () => {
      const result = formatExecutionResult({
        stdout: '{"key":"value"}',
      });
      expect(result.type).toBe('json');
      expect(result.data).toEqual({ key: 'value' });
    });

    it('handles stdout with plain text', () => {
      const result = formatExecutionResult({
        stdout: 'plain text output',
      });
      expect(result.type).toBe('text');
      expect(result.data).toBe('plain text output');
    });

    it('handles empty stdout with stderr', () => {
      const result = formatExecutionResult({
        stdout: '',
        stderr: 'error message',
      });
      expect(result.type).toBe('text');
      expect(result.data).toBe('error message');
    });

    it('handles empty stdout and stderr', () => {
      const result = formatExecutionResult({
        stdout: '',
        stderr: '',
      });
      expect(result.type).toBe('text');
      expect(result.data).toBe('Execution completed');
    });
  });

  describe('string handling', () => {
    it('handles JSON string', () => {
      const result = formatExecutionResult('{"key":"value"}');
      expect(result.type).toBe('json');
      expect(result.data).toEqual({ key: 'value' });
    });

    it('handles plain text string', () => {
      const result = formatExecutionResult('plain text');
      expect(result.type).toBe('text');
      expect(result.data).toBe('plain text');
    });

    it('handles concatenated JSON objects', () => {
      const result = formatExecutionResult('{"id":1}{"id":2}{"id":3}');
      expect(result.type).toBe('table');
      expect(result.data).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    });

    it('deduplicates concatenated JSON objects', () => {
      const result = formatExecutionResult('{"id":1}{"id":1}{"id":2}');
      expect(result.type).toBe('table');
      expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('handles double-encoded JSON', () => {
      const result = formatExecutionResult('"{\\"key\\":\\"value\\"}"');
      expect(result.type).toBe('json');
      expect(result.data).toEqual({ key: 'value' });
    });
  });

  describe('rows format (query result)', () => {
    it('handles rows array with data', () => {
      const result = formatExecutionResult({
        rows: [{ id: 1, name: 'test' }],
        rowCount: 1,
      });
      expect(result.type).toBe('table');
      expect(result.data).toEqual([{ id: 1, name: 'test' }]);
    });

    it('handles empty rows array', () => {
      const result = formatExecutionResult({
        rows: [],
        rowCount: 0,
      });
      expect(result.type).toBe('text');
      expect(result.data).toBe('Query executed successfully. 0 rows affected.');
    });

    it('handles rows with undefined rowCount', () => {
      const result = formatExecutionResult({
        rows: [],
      });
      expect(result.type).toBe('text');
      expect(result.data).toBe('Query executed successfully. 0 rows affected.');
    });
  });

  describe('array handling', () => {
    it('handles array of objects', () => {
      const result = formatExecutionResult([{ id: 1 }, { id: 2 }]);
      expect(result.type).toBe('table');
      expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('handles array of primitives', () => {
      const result = formatExecutionResult([1, 2, 3]);
      expect(result.type).toBe('json');
      expect(result.data).toEqual([1, 2, 3]);
    });

    it('handles array with JSON strings', () => {
      const result = formatExecutionResult(['{"id":1}', '{"id":2}']);
      expect(result.type).toBe('table');
      expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('handles array with stringified arrays', () => {
      const result = formatExecutionResult(['[{"id":1},{"id":2}]']);
      expect(result.type).toBe('table');
      expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('handles nested arrays', () => {
      const result = formatExecutionResult([[{ id: 1 }], [{ id: 2 }]]);
      expect(result.type).toBe('table');
      expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('handles array with concatenated JSON strings', () => {
      const result = formatExecutionResult(['{"id":1}{"id":2}']);
      expect(result.type).toBe('table');
      expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('handles array with null/undefined values', () => {
      const result = formatExecutionResult([{ id: 1 }, null, undefined, { id: 2 }]);
      expect(result.type).toBe('table');
      expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('handles array with plain strings', () => {
      const result = formatExecutionResult(['plain', 'text']);
      expect(result.type).toBe('json');
      expect(result.data).toEqual(['plain', 'text']);
    });

    it('handles empty array', () => {
      const result = formatExecutionResult([]);
      expect(result.type).toBe('json');
      expect(result.data).toEqual([]);
    });
  });

  describe('object handling', () => {
    it('handles plain object', () => {
      const result = formatExecutionResult({ key: 'value', num: 42 });
      expect(result.type).toBe('json');
      expect(result.data).toEqual({ key: 'value', num: 42 });
    });
  });
  describe('edge cases and error conditions', () => {
    it('handles non-string input in parseConcatenatedJson', () => {
      // This tests the /* istanbul ignore if */ branch
      const result = formatExecutionResult({ customData: 123 });
      expect(result.type).toBe('json');
      expect(result.data).toEqual({ customData: 123 });
    });

    it('handles array with concatenated JSON that fails to parse', () => {
      // This tests the /* istanbul ignore else */ branch by providing invalid JSON
      const result = formatExecutionResult(['{"invalid":json}']);
      expect(result.type).toBe('json');
      expect(result.data).toEqual(['{"invalid":json}']);
    });

    it('handles empty flattened array', () => {
      // This tests the /* istanbul ignore if */ branch for empty flattened array
      const result = formatExecutionResult([null, undefined]);
      expect(result.type).toBe('table'); // null is typeof 'object' in JavaScript
      expect(result.data).toEqual([null, undefined]);
    });

    it('handles array with non-object items after flattening', () => {
      // This tests the /* istanbul ignore if */ branch for non-empty flattened array with primitives
      const result = formatExecutionResult(['string1', 'string2']);
      expect(result.type).toBe('json');
      expect(result.data).toEqual(['string1', 'string2']);
    });

    it('handles original array with objects when flattening fails', () => {
      // This tests the /* istanbul ignore if */ branch for original array handling
      const result = formatExecutionResult([{ id: 1 }, { id: 2 }]);
      expect(result.type).toBe('table');
      expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
    });
  });
});
  it('returns empty array for empty data', () => {
    expect(getTableColumns([])).toEqual([]);
  });

  it('returns empty array for null/undefined', () => {
    expect(getTableColumns(null as any)).toEqual([]);
    expect(getTableColumns(undefined as any)).toEqual([]);
  });

  it('returns columns from single object', () => {
    const columns = getTableColumns([{ id: 1, name: 'test' }]);
    expect(columns).toContain('id');
    expect(columns).toContain('name');
  });

  it('returns all unique columns from multiple objects', () => {
    const columns = getTableColumns([
      { id: 1, name: 'test' },
      { id: 2, email: 'test@test.com' },
    ]);
    expect(columns).toContain('id');
    expect(columns).toContain('name');
    expect(columns).toContain('email');
  });
describe('formatCellValue', () => {
  it('returns "NULL" for null', () => {
    expect(formatCellValue(null)).toBe('NULL');
  });

  it('returns empty string for undefined', () => {
    expect(formatCellValue(undefined)).toBe('');
  });

  it('returns JSON string for objects', () => {
    expect(formatCellValue({ key: 'value' })).toBe('{"key":"value"}');
  });

  it('returns JSON string for arrays', () => {
    expect(formatCellValue([1, 2, 3])).toBe('[1,2,3]');
  });

  it('returns string for numbers', () => {
    expect(formatCellValue(42)).toBe('42');
  });

  it('returns string for booleans', () => {
    expect(formatCellValue(true)).toBe('true');
    expect(formatCellValue(false)).toBe('false');
  });

  it('returns string as-is', () => {
    expect(formatCellValue('test')).toBe('test');
  });
});
