import { render, screen, fireEvent } from '@testing-library/react';
import { FileUpload } from '../FileUpload';

describe('FileUpload', () => {
  const defaultProps = {
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders upload area when no file is selected', () => {
    render(<FileUpload {...defaultProps} />);
    expect(screen.getByText('Click to upload or drag and drop')).toBeInTheDocument();
    expect(screen.getByText('.js files only (max 2MB)')).toBeInTheDocument();
  });

  it('renders with label', () => {
    render(<FileUpload {...defaultProps} label="Script File" />);
    expect(screen.getByText('Script File')).toBeInTheDocument();
  });

  it('shows required indicator with label', () => {
    render(<FileUpload {...defaultProps} label="Script File" />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('displays error message', () => {
    render(<FileUpload {...defaultProps} error="File is required" />);
    expect(screen.getByText('File is required')).toBeInTheDocument();
  });

  it('displays selected file info', () => {
    const file = new File(['content'], 'test.js', { type: 'application/javascript' });
    render(<FileUpload {...defaultProps} value={file} />);
    expect(screen.getByText('test.js')).toBeInTheDocument();
  });

  it('calls onChange when file is selected via input', () => {
    const onChange = jest.fn();
    render(<FileUpload onChange={onChange} />);
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['content'], 'test.js', { type: 'application/javascript' });
    
    fireEvent.change(input, { target: { files: [file] } });
    
    expect(onChange).toHaveBeenCalledWith(file);
  });

  it('calls onChange with null when no file is selected', () => {
    const onChange = jest.fn();
    render(<FileUpload onChange={onChange} />);
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    fireEvent.change(input, { target: { files: [] } });
    
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('calls onChange with null when remove button is clicked', () => {
    const onChange = jest.fn();
    const file = new File(['content'], 'test.js', { type: 'application/javascript' });
    render(<FileUpload onChange={onChange} value={file} />);
    
    // Find the remove button (the X button)
    const removeButton = screen.getByRole('button');
    fireEvent.click(removeButton);
    
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('opens file dialog when upload area is clicked', () => {
    render(<FileUpload {...defaultProps} />);
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = jest.spyOn(input, 'click');
    
    const uploadArea = screen.getByText('Click to upload or drag and drop').closest('div');
    fireEvent.click(uploadArea!);
    
    expect(clickSpy).toHaveBeenCalled();
  });

  it('handles drag over event', () => {
    render(<FileUpload {...defaultProps} />);
    
    const uploadArea = screen.getByText('Click to upload or drag and drop').closest('div');
    
    fireEvent.dragOver(uploadArea!, { preventDefault: jest.fn() });
    
    expect(uploadArea).toHaveClass('border-blue-500');
  });

  it('handles drag leave event', () => {
    render(<FileUpload {...defaultProps} />);
    
    const uploadArea = screen.getByText('Click to upload or drag and drop').closest('div');
    
    fireEvent.dragOver(uploadArea!, { preventDefault: jest.fn() });
    fireEvent.dragLeave(uploadArea!, { preventDefault: jest.fn() });
    
    expect(uploadArea).not.toHaveClass('border-blue-500');
  });

  it('handles drop event with valid .js file', () => {
    const onChange = jest.fn();
    render(<FileUpload onChange={onChange} />);
    
    const uploadArea = screen.getByText('Click to upload or drag and drop').closest('div');
    const file = new File(['content'], 'test.js', { type: 'application/javascript' });
    
    fireEvent.drop(uploadArea!, {
      preventDefault: jest.fn(),
      dataTransfer: { files: [file] },
    });
    
    expect(onChange).toHaveBeenCalledWith(file);
  });

  it('does not accept non-.js files on drop', () => {
    const onChange = jest.fn();
    render(<FileUpload onChange={onChange} />);
    
    const uploadArea = screen.getByText('Click to upload or drag and drop').closest('div');
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    
    fireEvent.drop(uploadArea!, {
      preventDefault: jest.fn(),
      dataTransfer: { files: [file] },
    });
    
    expect(onChange).not.toHaveBeenCalled();
  });

  it('displays file size', () => {
    const content = 'a'.repeat(1024); // 1KB
    const file = new File([content], 'test.js', { type: 'application/javascript' });
    render(<FileUpload {...defaultProps} value={file} />);
    expect(screen.getByText('(1.0 KB)')).toBeInTheDocument();
  });

  it('accepts custom accept prop', () => {
    render(<FileUpload {...defaultProps} accept=".ts" />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toHaveAttribute('accept', '.ts');
  });
});
