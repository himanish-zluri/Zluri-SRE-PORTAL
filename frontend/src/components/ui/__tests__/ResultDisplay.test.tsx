import { render, screen, fireEvent } from '@testing-library/react';
import { ResultDisplay } from '../ResultDisplay';

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockCreateObjectURL = jest.fn(() => 'blob:test-url');
const mockRevokeObjectURL = jest.fn();
global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

describe('ResultDisplay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('table display', () => {
    it('renders table for array of objects', () => {
      const result = { rows: [{ id: 1, name: 'Test' }, { id: 2, name: 'Test2' }] };
      render(<ResultDisplay result={result} />);
      
      expect(screen.getByText('id')).toBeInTheDocument();
      expect(screen.getByText('name')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('Test')).toBeInTheDocument();
      expect(screen.getByText('2 rows returned')).toBeInTheDocument();
    });

    it('renders table for direct array', () => {
      const result = [{ id: 1 }, { id: 2 }];
      render(<ResultDisplay result={result} />);
      
      expect(screen.getByText('id')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  describe('text display', () => {
    it('renders "No result" for null', () => {
      render(<ResultDisplay result={null} />);
      expect(screen.getByText('No result')).toBeInTheDocument();
    });

    it('renders text for string result', () => {
      render(<ResultDisplay result="plain text output" />);
      expect(screen.getByText('plain text output')).toBeInTheDocument();
    });

    it('renders success message for empty rows', () => {
      const result = { rows: [], rowCount: 5 };
      render(<ResultDisplay result={result} />);
      expect(screen.getByText('Query executed successfully. 5 rows affected.')).toBeInTheDocument();
    });
  });

  describe('JSON display', () => {
    it('renders JSON for object result', () => {
      const result = { key: 'value', num: 42 };
      render(<ResultDisplay result={result} />);
      expect(screen.getByText(/"key": "value"/)).toBeInTheDocument();
    });
  });

  describe('action buttons', () => {
    it('shows view and download buttons when content exists', () => {
      const result = { rows: [{ id: 1 }] };
      render(<ResultDisplay result={result} />);
      
      expect(screen.getByText('🔍 View Full Result')).toBeInTheDocument();
      expect(screen.getByText('⬇️ Download')).toBeInTheDocument();
    });

    it('does not show buttons for empty result', () => {
      render(<ResultDisplay result={null} />);
      
      // "No result" text should be shown but no action buttons
      expect(screen.getByText('No result')).toBeInTheDocument();
    });

    it('opens modal when view button is clicked', () => {
      const result = { rows: [{ id: 1 }] };
      render(<ResultDisplay result={result} />);
      
      fireEvent.click(screen.getByText('🔍 View Full Result'));
      
      expect(screen.getByText('Full Execution Result')).toBeInTheDocument();
    });

    it('closes modal when close button is clicked', () => {
      const result = { rows: [{ id: 1 }] };
      render(<ResultDisplay result={result} />);
      
      fireEvent.click(screen.getByText('🔍 View Full Result'));
      expect(screen.getByText('Full Execution Result')).toBeInTheDocument();
      
      fireEvent.click(screen.getByText('Close'));
      expect(screen.queryByText('Full Execution Result')).not.toBeInTheDocument();
    });

    it('downloads CSV for table data', () => {
      const result = { rows: [{ id: 1, name: 'Test' }] };
      render(<ResultDisplay result={result} queryId="test-query-123" />);
      
      // Mock document.createElement and appendChild
      const mockLink = { href: '', download: '', click: jest.fn() };
      const createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      const appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
      const removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);
      
      fireEvent.click(screen.getByText('⬇️ Download'));
      
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockLink.download).toBe('result-test-que.csv');
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();
      
      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });

    it('downloads JSON for object data', () => {
      const result = { key: 'value' };
      render(<ResultDisplay result={result} queryId="test-query-123" />);
      
      const mockLink = { href: '', download: '', click: jest.fn() };
      const createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      const appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
      const removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);
      
      fireEvent.click(screen.getByText('⬇️ Download'));
      
      expect(mockLink.download).toBe('result-test-que.json');
      
      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });

    it('downloads TXT for text data', () => {
      render(<ResultDisplay result="plain text" queryId="test-query-123" />);
      
      const mockLink = { href: '', download: '', click: jest.fn() };
      const createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      const appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
      const removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);
      
      fireEvent.click(screen.getByText('⬇️ Download'));
      
      expect(mockLink.download).toBe('result-test-que.txt');
      
      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });

    it('uses default filename when no queryId', () => {
      render(<ResultDisplay result="plain text" />);
      
      const mockLink = { href: '', download: '', click: jest.fn() };
      const createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      const appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
      const removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);
      
      fireEvent.click(screen.getByText('⬇️ Download'));
      
      expect(mockLink.download).toBe('result-export.txt');
      
      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });
  });

  describe('CSV escaping', () => {
    it('escapes values with commas', () => {
      const result = { rows: [{ name: 'Test, with comma' }] };
      render(<ResultDisplay result={result} />);
      
      const mockLink = { href: '', download: '', click: jest.fn() };
      const createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      const appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
      const removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);
      
      fireEvent.click(screen.getByText('⬇️ Download'));
      
      // The Blob should contain escaped CSV
      expect(mockCreateObjectURL).toHaveBeenCalled();
      
      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });

    it('escapes values with quotes', () => {
      const result = { rows: [{ name: 'Test "with" quotes' }] };
      render(<ResultDisplay result={result} />);
      
      const mockLink = { href: '', download: '', click: jest.fn() };
      const createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      const appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
      const removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);
      
      fireEvent.click(screen.getByText('⬇️ Download'));
      
      expect(mockCreateObjectURL).toHaveBeenCalled();
      
      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });
  });

  describe('maxHeight prop', () => {
    it('applies custom maxHeight', () => {
      const result = { rows: [{ id: 1 }] };
      render(<ResultDisplay result={result} maxHeight="500px" />);
      
      const tableContainer = screen.getByRole('table').closest('div');
      expect(tableContainer).toHaveStyle({ maxHeight: '500px' });
    });
  });

  describe('modal download button', () => {
    it('downloads from modal button', () => {
      const result = { rows: [{ id: 1, name: 'Test' }] };
      render(<ResultDisplay result={result} queryId="test-query-123" />);
      
      // Open modal
      fireEvent.click(screen.getByText('🔍 View Full Result'));
      
      // Mock document.createElement and appendChild
      const mockLink = { href: '', download: '', click: jest.fn() };
      const createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      const appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
      const removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);
      
      // Click download button in modal
      const downloadButtons = screen.getAllByText('⬇️ Download');
      fireEvent.click(downloadButtons[1]); // Second download button is in modal
      
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockLink.click).toHaveBeenCalled();
      
      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });
  });

  describe('modal content rendering', () => {
    it('renders table content in modal', () => {
      const result = { rows: [{ id: 1, name: 'Test' }, { id: 2, name: 'Test2' }] };
      render(<ResultDisplay result={result} />);
      
      // Open modal
      fireEvent.click(screen.getByText('🔍 View Full Result'));
      
      // Modal should show the table content
      expect(screen.getByText('Full Execution Result')).toBeInTheDocument();
      // Table should be rendered in modal (there will be 2 tables now - one in main view, one in modal)
      const tables = screen.getAllByRole('table');
      expect(tables.length).toBe(2);
    });

    it('renders JSON content in modal', () => {
      const result = { key: 'value', nested: { a: 1 } };
      render(<ResultDisplay result={result} />);
      
      // Open modal
      fireEvent.click(screen.getByText('🔍 View Full Result'));
      
      // Modal should show the JSON content
      expect(screen.getByText('Full Execution Result')).toBeInTheDocument();
    });

    it('renders text content in modal', () => {
      render(<ResultDisplay result="plain text output" />);
      
      // Open modal
      fireEvent.click(screen.getByText('🔍 View Full Result'));
      
      // Modal should show the text content
      expect(screen.getByText('Full Execution Result')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles empty string result', () => {
      render(<ResultDisplay result="" />);
      
      // Empty string should not show action buttons
      expect(screen.queryByText('🔍 View Full Result')).not.toBeInTheDocument();
      expect(screen.queryByText('⬇️ Download')).not.toBeInTheDocument();
    });

    it('handles zero value result', () => {
      render(<ResultDisplay result={0} />);
      
      // Zero should show action buttons (it's meaningful content)
      expect(screen.getByText('🔍 View Full Result')).toBeInTheDocument();
      expect(screen.getByText('⬇️ Download')).toBeInTheDocument();
    });

    it('handles false value result', () => {
      render(<ResultDisplay result={false} />);
      
      // False should show action buttons (it's meaningful content)
      expect(screen.getByText('🔍 View Full Result')).toBeInTheDocument();
      expect(screen.getByText('⬇️ Download')).toBeInTheDocument();
    });

    it('handles undefined result in hasContent check', () => {
      render(<ResultDisplay result={undefined} />);
      
      // Undefined should not show action buttons
      expect(screen.queryByText('🔍 View Full Result')).not.toBeInTheDocument();
      expect(screen.queryByText('⬇️ Download')).not.toBeInTheDocument();
    });

    it('handles empty array result', () => {
      render(<ResultDisplay result={[]} />);
      
      // Empty array should not show action buttons
      expect(screen.queryByText('🔍 View Full Result')).not.toBeInTheDocument();
      expect(screen.queryByText('⬇️ Download')).not.toBeInTheDocument();
    });

    it('handles single row table', () => {
      const result = { rows: [{ id: 1 }] };
      render(<ResultDisplay result={result} />);
      
      expect(screen.getByText('1 row returned')).toBeInTheDocument();
    });
  });

});
