import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toast, useToast } from '../Toast';
import { renderHook } from '@testing-library/react';

// Mock timers for testing
jest.useFakeTimers();

describe('Toast', () => {
  const defaultProps = {
    message: 'Test message',
    type: 'info' as const,
    isVisible: true,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  it('renders toast when visible', () => {
    render(<Toast {...defaultProps} />);
    
    expect(screen.getByText('Test message')).toBeInTheDocument();
    expect(screen.getByText('ℹ️')).toBeInTheDocument(); // Info icon
  });

  it('does not render when not visible and not animating', () => {
    render(<Toast {...defaultProps} isVisible={false} />);
    
    expect(screen.queryByText('Test message')).not.toBeInTheDocument();
  });

  it('renders success toast with correct styling and icon', () => {
    render(<Toast {...defaultProps} type="success" />);
    
    expect(screen.getByText('✅')).toBeInTheDocument();
    const toastElement = screen.getByText('Test message').closest('div');
    expect(toastElement).toHaveClass('bg-green-50', 'text-green-800');
  });

  it('renders error toast with correct styling and icon', () => {
    render(<Toast {...defaultProps} type="error" />);
    
    expect(screen.getByText('❌')).toBeInTheDocument();
    const toastElement = screen.getByText('Test message').closest('div');
    expect(toastElement).toHaveClass('bg-red-50', 'text-red-800');
  });

  it('renders warning toast with correct styling and icon', () => {
    render(<Toast {...defaultProps} type="warning" />);
    
    expect(screen.getByText('⚠️')).toBeInTheDocument();
    const toastElement = screen.getByText('Test message').closest('div');
    expect(toastElement).toHaveClass('bg-yellow-50', 'text-yellow-800');
  });

  it('renders info toast with correct styling and icon', () => {
    render(<Toast {...defaultProps} type="info" />);
    
    expect(screen.getByText('ℹ️')).toBeInTheDocument();
    const toastElement = screen.getByText('Test message').closest('div');
    expect(toastElement).toHaveClass('bg-blue-50', 'text-blue-800');
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = jest.fn();
    render(<Toast {...defaultProps} onClose={onClose} />);
    
    const closeButton = screen.getByText('✕');
    await userEvent.click(closeButton);
    
    // Should start animation immediately
    expect(onClose).not.toHaveBeenCalled();
    
    // Fast-forward animation duration
    act(() => {
      jest.advanceTimersByTime(300);
    });
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('auto-closes after default duration', () => {
    const onClose = jest.fn();
    render(<Toast {...defaultProps} onClose={onClose} />);
    
    expect(onClose).not.toHaveBeenCalled();
    
    // Fast-forward to just before auto-close
    act(() => {
      jest.advanceTimersByTime(2999);
    });
    expect(onClose).not.toHaveBeenCalled();
    
    // Fast-forward past auto-close time
    act(() => {
      jest.advanceTimersByTime(1);
    });
    
    // Should start animation, but not call onClose yet
    expect(onClose).not.toHaveBeenCalled();
    
    // Fast-forward animation duration
    act(() => {
      jest.advanceTimersByTime(300);
    });
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('auto-closes after custom duration', () => {
    const onClose = jest.fn();
    render(<Toast {...defaultProps} onClose={onClose} duration={5000} />);
    
    // Fast-forward to just before custom duration
    act(() => {
      jest.advanceTimersByTime(4999);
    });
    expect(onClose).not.toHaveBeenCalled();
    
    // Fast-forward past custom duration
    act(() => {
      jest.advanceTimersByTime(1);
    });
    
    // Should start animation
    expect(onClose).not.toHaveBeenCalled();
    
    // Fast-forward animation duration
    act(() => {
      jest.advanceTimersByTime(300);
    });
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clears timer when component unmounts', () => {
    const onClose = jest.fn();
    const { unmount } = render(<Toast {...defaultProps} onClose={onClose} />);
    
    unmount();
    
    // Fast-forward past duration
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    
    expect(onClose).not.toHaveBeenCalled();
  });

  it('handles visibility changes correctly', () => {
    const onClose = jest.fn();
    const { rerender } = render(<Toast {...defaultProps} onClose={onClose} isVisible={false} />);
    
    expect(screen.queryByText('Test message')).not.toBeInTheDocument();
    
    // Make visible
    rerender(<Toast {...defaultProps} onClose={onClose} isVisible={true} />);
    expect(screen.getByText('Test message')).toBeInTheDocument();
    
    // Make invisible again
    rerender(<Toast {...defaultProps} onClose={onClose} isVisible={false} />);
    
    // Should still be visible during animation
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('applies correct animation classes', () => {
    render(<Toast {...defaultProps} />);
    
    const toastContainer = screen.getByText('Test message').closest('div')?.parentElement;
    expect(toastContainer).toHaveClass('transform', 'translate-x-0', 'opacity-100');
  });
});

describe('useToast hook', () => {
  beforeEach(() => {
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  it('initializes with no toast', () => {
    const { result } = renderHook(() => useToast());
    
    expect(result.current.toast).toBeNull();
  });

  it('shows toast with showToast', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.showToast('Test message', 'success');
    });
    
    expect(result.current.toast).toEqual({
      message: 'Test message',
      type: 'success',
      isVisible: true,
    });
  });

  it('shows toast with default info type', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.showToast('Test message');
    });
    
    expect(result.current.toast).toEqual({
      message: 'Test message',
      type: 'info',
      isVisible: true,
    });
  });

  it('hides toast with hideToast', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.showToast('Test message', 'success');
    });
    
    expect(result.current.toast?.isVisible).toBe(true);
    
    act(() => {
      result.current.hideToast();
    });
    
    expect(result.current.toast?.isVisible).toBe(false);
  });

  it('shows success toast with showSuccess', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.showSuccess('Success message');
    });
    
    expect(result.current.toast).toEqual({
      message: 'Success message',
      type: 'success',
      isVisible: true,
    });
  });

  it('shows error toast with showError', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.showError('Error message');
    });
    
    expect(result.current.toast).toEqual({
      message: 'Error message',
      type: 'error',
      isVisible: true,
    });
  });

  it('shows warning toast with showWarning', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.showWarning('Warning message');
    });
    
    expect(result.current.toast).toEqual({
      message: 'Warning message',
      type: 'warning',
      isVisible: true,
    });
  });

  it('shows info toast with showInfo', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.showInfo('Info message');
    });
    
    expect(result.current.toast).toEqual({
      message: 'Info message',
      type: 'info',
      isVisible: true,
    });
  });

  it('handles hideToast when no toast exists', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.hideToast();
    });
    
    expect(result.current.toast).toBeNull();
  });

  it('replaces existing toast when showing new one', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.showSuccess('First message');
    });
    
    expect(result.current.toast?.message).toBe('First message');
    
    act(() => {
      result.current.showError('Second message');
    });
    
    expect(result.current.toast).toEqual({
      message: 'Second message',
      type: 'error',
      isVisible: true,
    });
  });
});