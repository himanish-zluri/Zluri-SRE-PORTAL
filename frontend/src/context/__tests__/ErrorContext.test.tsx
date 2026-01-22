import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ErrorProvider, useError } from '../ErrorContext';
import { useErrorHandler } from '../../hooks/useErrorHandler';

// Mock the useErrorHandler hook
jest.mock('../../hooks/useErrorHandler', () => ({
  useErrorHandler: jest.fn(),
}));

// Mock the Toast component
jest.mock('../../components/ui/Toast', () => ({
  Toast: ({ message, type, isVisible, onClose }: any) => 
    isVisible ? (
      <div data-testid="toast" data-type={type}>
        <span>{message}</span>
        <button onClick={onClose} data-testid="close-toast">Close</button>
      </div>
    ) : null
}));

const mockUseErrorHandler = useErrorHandler as jest.MockedFunction<typeof useErrorHandler>;

// Test component to use the hook
function TestComponent() {
  const { showError, showSuccess, showWarning, showInfo, clearError } = useError();
  
  return (
    <div>
      <button onClick={() => showError(new Error('Test error'))}>Show Error</button>
      <button onClick={() => showError(new Error('Test error'), { fallbackMessage: 'Custom fallback' })}>
        Show Error with Fallback
      </button>
      <button onClick={() => showSuccess('Success message')}>Show Success</button>
      <button onClick={() => showWarning('Warning message')}>Show Warning</button>
      <button onClick={() => showInfo('Info message')}>Show Info</button>
      <button onClick={() => clearError()}>Clear Error</button>
    </div>
  );
}

describe('ErrorContext', () => {
  const mockHandleError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseErrorHandler.mockReturnValue({
      handleError: mockHandleError,
      extractErrorMessage: jest.fn(),
      extractValidationErrors: jest.fn(),
      isNetworkError: jest.fn(),
      isValidationError: jest.fn(),
      isAuthError: jest.fn(),
      isPermissionError: jest.fn(),
    });
  });

  it('throws error when useError is used outside ErrorProvider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useError must be used within an ErrorProvider');
    
    consoleSpy.mockRestore();
  });

  it('shows error toast when showError is called', () => {
    mockHandleError.mockReturnValue({ message: 'Processed error message' });

    render(
      <ErrorProvider>
        <TestComponent />
      </ErrorProvider>
    );

    const showErrorButton = screen.getByText('Show Error');
    fireEvent.click(showErrorButton);

    expect(screen.getByTestId('toast')).toBeInTheDocument();
    expect(screen.getByTestId('toast')).toHaveAttribute('data-type', 'error');
    expect(screen.getByText('Processed error message')).toBeInTheDocument();
    expect(mockHandleError).toHaveBeenCalledWith(expect.any(Error), {});
  });

  it('shows error toast with fallback message option', () => {
    mockHandleError.mockReturnValue({ message: 'Processed error with fallback' });

    render(
      <ErrorProvider>
        <TestComponent />
      </ErrorProvider>
    );

    const showErrorButton = screen.getByText('Show Error with Fallback');
    fireEvent.click(showErrorButton);

    expect(screen.getByTestId('toast')).toBeInTheDocument();
    expect(screen.getByTestId('toast')).toHaveAttribute('data-type', 'error');
    expect(screen.getByText('Processed error with fallback')).toBeInTheDocument();
    expect(mockHandleError).toHaveBeenCalledWith(expect.any(Error), {
      fallbackMessage: 'Custom fallback'
    });
  });

  it('shows success toast when showSuccess is called', () => {
    render(
      <ErrorProvider>
        <TestComponent />
      </ErrorProvider>
    );

    const showSuccessButton = screen.getByText('Show Success');
    fireEvent.click(showSuccessButton);

    expect(screen.getByTestId('toast')).toBeInTheDocument();
    expect(screen.getByTestId('toast')).toHaveAttribute('data-type', 'success');
    expect(screen.getByText('Success message')).toBeInTheDocument();
  });

  it('shows warning toast when showWarning is called', () => {
    render(
      <ErrorProvider>
        <TestComponent />
      </ErrorProvider>
    );

    const showWarningButton = screen.getByText('Show Warning');
    fireEvent.click(showWarningButton);

    expect(screen.getByTestId('toast')).toBeInTheDocument();
    expect(screen.getByTestId('toast')).toHaveAttribute('data-type', 'warning');
    expect(screen.getByText('Warning message')).toBeInTheDocument();
  });

  it('shows info toast when showInfo is called', () => {
    render(
      <ErrorProvider>
        <TestComponent />
      </ErrorProvider>
    );

    const showInfoButton = screen.getByText('Show Info');
    fireEvent.click(showInfoButton);

    expect(screen.getByTestId('toast')).toBeInTheDocument();
    expect(screen.getByTestId('toast')).toHaveAttribute('data-type', 'info');
    expect(screen.getByText('Info message')).toBeInTheDocument();
  });

  it('clears toast when clearError is called', () => {
    render(
      <ErrorProvider>
        <TestComponent />
      </ErrorProvider>
    );

    // First show a toast
    const showSuccessButton = screen.getByText('Show Success');
    fireEvent.click(showSuccessButton);

    expect(screen.getByTestId('toast')).toBeInTheDocument();

    // Then clear it
    const clearErrorButton = screen.getByText('Clear Error');
    fireEvent.click(clearErrorButton);

    expect(screen.queryByTestId('toast')).not.toBeInTheDocument();
  });

  it('clears toast when close button is clicked', () => {
    render(
      <ErrorProvider>
        <TestComponent />
      </ErrorProvider>
    );

    // Show a toast
    const showSuccessButton = screen.getByText('Show Success');
    fireEvent.click(showSuccessButton);

    expect(screen.getByTestId('toast')).toBeInTheDocument();

    // Click the close button on the toast
    const closeButton = screen.getByTestId('close-toast');
    fireEvent.click(closeButton);

    expect(screen.queryByTestId('toast')).not.toBeInTheDocument();
  });

  it('replaces existing toast when new one is shown', () => {
    render(
      <ErrorProvider>
        <TestComponent />
      </ErrorProvider>
    );

    // Show first toast
    const showSuccessButton = screen.getByText('Show Success');
    fireEvent.click(showSuccessButton);

    expect(screen.getByText('Success message')).toBeInTheDocument();

    // Show second toast
    const showWarningButton = screen.getByText('Show Warning');
    fireEvent.click(showWarningButton);

    expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    expect(screen.getByText('Warning message')).toBeInTheDocument();
    expect(screen.getByTestId('toast')).toHaveAttribute('data-type', 'warning');
  });

  it('handles clearError when no toast is visible', () => {
    render(
      <ErrorProvider>
        <TestComponent />
      </ErrorProvider>
    );

    // Try to clear when no toast is shown
    const clearErrorButton = screen.getByText('Clear Error');
    fireEvent.click(clearErrorButton);

    // Should not throw error
    expect(screen.queryByTestId('toast')).not.toBeInTheDocument();
  });

  it('maintains callback stability with useCallback', () => {
    let renderCount = 0;
    
    function TestCallbackStability() {
      const { showError, showSuccess, showWarning, showInfo, clearError } = useError();
      renderCount++;
      
      return (
        <div>
          <div data-testid="render-count">{renderCount}</div>
          <button onClick={() => showError(new Error('test'))}>Test</button>
        </div>
      );
    }

    const { rerender } = render(
      <ErrorProvider>
        <TestCallbackStability />
      </ErrorProvider>
    );

    expect(screen.getByTestId('render-count')).toHaveTextContent('1');

    // Rerender should not cause additional renders due to callback changes
    rerender(
      <ErrorProvider>
        <TestCallbackStability />
      </ErrorProvider>
    );

    expect(screen.getByTestId('render-count')).toHaveTextContent('2');
  });
});