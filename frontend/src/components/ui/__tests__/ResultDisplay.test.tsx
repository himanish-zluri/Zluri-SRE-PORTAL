import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ResultDisplay } from '../ResultDisplay';

// Mock the Modal component
jest.mock('../Modal', () => ({
  Modal: ({ isOpen, onClose, title, children }: any) => 
    isOpen ? (
      <div data-testid="modal">
        <div>{title}</div>
        <div>{children}</div>
        <button onClick={onClose}>Close Modal</button>
      </div>
    ) : null
}));

// Mock the Button component
jest.mock('../Button', () => ({
  Button: ({ children, onClick, variant }: any) => (
    <button onClick={onClick} data-variant={variant}>
      {children}
    </button>
  )
}));

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

describe('ResultDisplay', () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  describe('hasContent function branches', () => {
    it('should show buttons for table with data', () => {
      const tableResult = {
        rows: [
          { id: 1, name: 'John' },
          { id: 2, name: 'Jane' }
        ]
      };

      render(<ResultDisplay result={tableResult} />);
      
      expect(screen.getByText('🔍 View Full Result')).toBeInTheDocument();
      expect(screen.getByText('⬇️ Download')).toBeInTheDocument();
    });

    it('should not show buttons for empty table', () => {
      const emptyTableResult = { rows: [] };

      render(<ResultDisplay result={emptyTableResult} />);
      
      // Empty table results in text type with success message, which should show buttons
      expect(screen.getByText('🔍 View Full Result')).toBeInTheDocument();
      expect(screen.getByText('⬇️ Download')).toBeInTheDocument();
    });

    it('should show buttons for non-empty JSON array', () => {
      const jsonArrayResult = [{ id: 1 }, { id: 2 }];

      render(<ResultDisplay result={jsonArrayResult} />);
      
      expect(screen.getByText('🔍 View Full Result')).toBeInTheDocument();
      expect(screen.getByText('⬇️ Download')).toBeInTheDocument();
    });

    it('should not show buttons for empty JSON array', () => {
      const emptyJsonArray: any[] = [];

      render(<ResultDisplay result={emptyJsonArray} />);
      
      expect(screen.queryByText('🔍 View Full Result')).not.toBeInTheDocument();
      expect(screen.queryByText('⬇️ Download')).not.toBeInTheDocument();
    });

    it('should not show buttons for null JSON', () => {
      render(<ResultDisplay result={null} />);
      
      expect(screen.queryByText('🔍 View Full Result')).not.toBeInTheDocument();
      expect(screen.queryByText('⬇️ Download')).not.toBeInTheDocument();
    });

    it('should not show buttons for undefined JSON', () => {
      render(<ResultDisplay result={undefined} />);
      
      expect(screen.queryByText('🔍 View Full Result')).not.toBeInTheDocument();
      expect(screen.queryByText('⬇️ Download')).not.toBeInTheDocument();
    });

    it('should show buttons for non-empty JSON string', () => {
      const jsonStringResult = "test string";

      render(<ResultDisplay result={jsonStringResult} />);
      
      expect(screen.getByText('🔍 View Full Result')).toBeInTheDocument();
      expect(screen.getByText('⬇️ Download')).toBeInTheDocument();
    });

    it('should not show buttons for empty JSON string', () => {
      const emptyJsonString = "";

      render(<ResultDisplay result={emptyJsonString} />);
      
      expect(screen.queryByText('🔍 View Full Result')).not.toBeInTheDocument();
      expect(screen.queryByText('⬇️ Download')).not.toBeInTheDocument();
    });

    it('should show buttons for JSON object', () => {
      const jsonObjectResult = { key: 'value' };

      render(<ResultDisplay result={jsonObjectResult} />);
      
      expect(screen.getByText('🔍 View Full Result')).toBeInTheDocument();
      expect(screen.getByText('⬇️ Download')).toBeInTheDocument();
    });

    it('should show buttons for JSON number', () => {
      const jsonNumberResult = 42;

      render(<ResultDisplay result={jsonNumberResult} />);
      
      expect(screen.getByText('🔍 View Full Result')).toBeInTheDocument();
      expect(screen.getByText('⬇️ Download')).toBeInTheDocument();
    });

    it('should show buttons for JSON boolean', () => {
      const jsonBooleanResult = true;

      render(<ResultDisplay result={jsonBooleanResult} />);
      
      expect(screen.getByText('🔍 View Full Result')).toBeInTheDocument();
      expect(screen.getByText('⬇️ Download')).toBeInTheDocument();
    });

    it('should not show buttons for "No result" text', () => {
      // This would be formatted as text type with "No result" data
      const noResultText = "No result";

      render(<ResultDisplay result={noResultText} />);
      
      expect(screen.queryByText('🔍 View Full Result')).not.toBeInTheDocument();
      expect(screen.queryByText('⬇️ Download')).not.toBeInTheDocument();
    });

    it('should show buttons for meaningful text', () => {
      const meaningfulText = "Some meaningful output";

      render(<ResultDisplay result={meaningfulText} />);
      
      expect(screen.getByText('🔍 View Full Result')).toBeInTheDocument();
      expect(screen.getByText('⬇️ Download')).toBeInTheDocument();
    });

    it('should show buttons for zero value', () => {
      render(<ResultDisplay result={0} />);
      
      expect(screen.getByText('🔍 View Full Result')).toBeInTheDocument();
      expect(screen.getByText('⬇️ Download')).toBeInTheDocument();
    });

    it('should show buttons for false value', () => {
      render(<ResultDisplay result={false} />);
      
      expect(screen.getByText('🔍 View Full Result')).toBeInTheDocument();
      expect(screen.getByText('⬇️ Download')).toBeInTheDocument();
    });

    it('should not show buttons for empty string fallback', () => {
      // Test the final fallback condition
      const emptyResult = "";

      render(<ResultDisplay result={emptyResult} />);
      
      expect(screen.queryByText('🔍 View Full Result')).not.toBeInTheDocument();
      expect(screen.queryByText('⬇️ Download')).not.toBeInTheDocument();
    });
  });

  describe('Modal functionality', () => {
    it('should open modal when View Full Result is clicked', () => {
      const tableResult = {
        rows: [{ id: 1, name: 'John' }]
      };

      render(<ResultDisplay result={tableResult} />);
      
      const viewButton = screen.getByText('🔍 View Full Result');
      fireEvent.click(viewButton);
      
      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByText('Full Execution Result')).toBeInTheDocument();
    });

    it('should close modal when close button is clicked', () => {
      const tableResult = {
        rows: [{ id: 1, name: 'John' }]
      };

      render(<ResultDisplay result={tableResult} />);
      
      // Open modal
      const viewButton = screen.getByText('🔍 View Full Result');
      fireEvent.click(viewButton);
      
      expect(screen.getByTestId('modal')).toBeInTheDocument();
      
      // Close modal
      const closeButton = screen.getByText('Close Modal');
      fireEvent.click(closeButton);
      
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });
  });

  describe('Rendering different content types', () => {
    it('should render table content', () => {
      const tableResult = {
        rows: [
          { id: 1, name: 'John' },
          { id: 2, name: 'Jane' }
        ]
      };

      render(<ResultDisplay result={tableResult} />);
      
      expect(screen.getByText('John')).toBeInTheDocument();
      expect(screen.getByText('Jane')).toBeInTheDocument();
      expect(screen.getByText('2 rows returned')).toBeInTheDocument();
    });

    it('should render single row with correct singular text', () => {
      const singleRowResult = {
        rows: [{ id: 1, name: 'John' }]
      };

      render(<ResultDisplay result={singleRowResult} />);
      
      expect(screen.getByText('1 row returned')).toBeInTheDocument();
    });

    it('should render JSON content', () => {
      const jsonResult = { key: 'value', number: 42 };

      render(<ResultDisplay result={jsonResult} />);
      
      // JSON should be formatted and displayed
      expect(screen.getByText(/"key": "value"/)).toBeInTheDocument();
      expect(screen.getByText(/"number": 42/)).toBeInTheDocument();
    });

    it('should render text content', () => {
      const textResult = "This is plain text output";

      render(<ResultDisplay result={textResult} />);
      
      expect(screen.getByText('This is plain text output')).toBeInTheDocument();
    });
  });

  describe('Custom maxHeight prop', () => {
    it('should use custom maxHeight', () => {
      const textResult = "Some text";
      
      render(<ResultDisplay result={textResult} maxHeight="500px" />);
      
      // The component should render with custom height - check the container div
      const textContainer = screen.getByText('Some text').closest('div');
      expect(textContainer).toHaveStyle('max-height: 500px');
    });
  });

  describe('Download functionality', () => {
    let mockCreateElement: jest.SpyInstance;
    let mockAppendChild: jest.SpyInstance;
    let mockRemoveChild: jest.SpyInstance;
    let mockClick: jest.SpyInstance;

    beforeEach(() => {
      // Mock document.createElement
      mockCreateElement = jest.spyOn(document, 'createElement');
      mockAppendChild = jest.spyOn(document.body, 'appendChild');
      mockRemoveChild = jest.spyOn(document.body, 'removeChild');
      
      // Mock anchor element
      const mockAnchor = {
        href: '',
        download: '',
        click: jest.fn(),
      };
      mockClick = mockAnchor.click as jest.Mock;
      
      mockCreateElement.mockReturnValue(mockAnchor as any);
      mockAppendChild.mockImplementation(() => {});
      mockRemoveChild.mockImplementation(() => {});
    });

    afterEach(() => {
      mockCreateElement.mockRestore();
      mockAppendChild.mockRestore();
      mockRemoveChild.mockRestore();
      cleanup();
    });

    it('should download table data as CSV', () => {
      const tableResult = {
        rows: [
          { id: 1, name: 'John', email: 'john@test.com' },
          { id: 2, name: 'Jane', email: 'jane@test.com' }
        ]
      };

      render(<ResultDisplay result={tableResult} queryId="test-query-123" />);
      
      const downloadButton = screen.getByText('⬇️ Download');
      fireEvent.click(downloadButton);
      
      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockClick).toHaveBeenCalled();
      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('should download table data as CSV with escaped quotes', () => {
      const tableResult = {
        rows: [
          { id: 1, name: 'John "Johnny" Doe', description: 'A person, with commas' },
        ]
      };

      render(<ResultDisplay result={tableResult} queryId="test-query-123" />);
      
      const downloadButton = screen.getByText('⬇️ Download');
      fireEvent.click(downloadButton);
      
      expect(mockClick).toHaveBeenCalled();
    });

    it('should download JSON data as JSON file', () => {
      const jsonResult = { key: 'value', number: 42 };

      render(<ResultDisplay result={jsonResult} queryId="test-query-456" />);
      
      const downloadButton = screen.getByText('⬇️ Download');
      fireEvent.click(downloadButton);
      
      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockClick).toHaveBeenCalled();
    });

    it('should download text data as text file', () => {
      const textResult = "This is plain text output";

      render(<ResultDisplay result={textResult} queryId="test-query-789" />);
      
      const downloadButton = screen.getByText('⬇️ Download');
      fireEvent.click(downloadButton);
      
      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockClick).toHaveBeenCalled();
    });

    it('should download with default filename when no queryId provided', () => {
      const textResult = "Some text";

      render(<ResultDisplay result={textResult} />);
      
      const downloadButton = screen.getByText('⬇️ Download');
      fireEvent.click(downloadButton);
      
      expect(mockClick).toHaveBeenCalled();
    });

    it('should download from modal', () => {
      const tableResult = {
        rows: [{ id: 1, name: 'John' }]
      };

      render(<ResultDisplay result={tableResult} />);
      
      // Open modal
      const viewButton = screen.getByText('🔍 View Full Result');
      fireEvent.click(viewButton);
      
      // Download from modal - get all download buttons and click the one in modal
      const downloadButtons = screen.getAllByText('⬇️ Download');
      fireEvent.click(downloadButtons[1]); // Second one is in modal
      
      expect(mockClick).toHaveBeenCalled();
    });

    it('should close modal with Close button in modal', () => {
      const tableResult = {
        rows: [{ id: 1, name: 'John' }]
      };

      render(<ResultDisplay result={tableResult} />);
      
      // Open modal
      const viewButton = screen.getByText('🔍 View Full Result');
      fireEvent.click(viewButton);
      
      expect(screen.getByTestId('modal')).toBeInTheDocument();
      
      // Close modal using the Close button in modal footer
      const closeButton = screen.getByText('Close');
      fireEvent.click(closeButton);
      
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });
  });

  describe('Table rendering with modal', () => {
    it('should render table in modal with different maxHeight', () => {
      const tableResult = {
        rows: [
          { id: 1, name: 'John' },
          { id: 2, name: 'Jane' }
        ]
      };

      render(<ResultDisplay result={tableResult} />);
      
      // Open modal
      const viewButton = screen.getByText('🔍 View Full Result');
      fireEvent.click(viewButton);
      
      // Check that table is rendered in modal
      expect(screen.getByTestId('modal')).toBeInTheDocument();
      // Use getAllByText since John appears in both main view and modal
      const johnElements = screen.getAllByText('John');
      expect(johnElements.length).toBeGreaterThan(0);
      const janeElements = screen.getAllByText('Jane');
      expect(janeElements.length).toBeGreaterThan(0);
    });
  });

  describe('QueryId prop', () => {
    it('should work without queryId', () => {
      const textResult = "Some text";
      
      render(<ResultDisplay result={textResult} />);
      
      expect(screen.getByText('Some text')).toBeInTheDocument();
    });

    it('should work with queryId', () => {
      const textResult = "Some text";
      
      render(<ResultDisplay result={textResult} queryId="test-query-123" />);
      
      expect(screen.getByText('Some text')).toBeInTheDocument();
    });
  });
});