import { render, screen, fireEvent } from '@testing-library/react';
import { TextArea } from '../TextArea';

describe('TextArea', () => {
  it('renders without label', () => {
    render(<TextArea placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('renders with label', () => {
    render(<TextArea label="Description" />);
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
  });

  it('shows required indicator when required', () => {
    render(<TextArea label="Description" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('does not show required indicator when not required', () => {
    render(<TextArea label="Description" />);
    expect(screen.queryByText('*')).not.toBeInTheDocument();
  });

  it('displays error message', () => {
    render(<TextArea label="Description" error="Description is required" />);
    expect(screen.getByText('Description is required')).toBeInTheDocument();
  });

  it('applies error styling when error is present', () => {
    render(<TextArea label="Description" error="Error" />);
    const textarea = screen.getByLabelText('Description');
    expect(textarea).toHaveClass('border-red-500');
  });

  it('generates id from label', () => {
    render(<TextArea label="My Description" />);
    const textarea = screen.getByLabelText('My Description');
    expect(textarea).toHaveAttribute('id', 'my-description');
  });

  it('uses provided id over generated one', () => {
    render(<TextArea label="Description" id="custom-id" />);
    const textarea = screen.getByLabelText('Description');
    expect(textarea).toHaveAttribute('id', 'custom-id');
  });

  it('handles value changes', () => {
    const handleChange = jest.fn();
    render(<TextArea onChange={handleChange} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'test content' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('applies custom className', () => {
    render(<TextArea className="custom-class" />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveClass('custom-class');
  });

  it('passes through additional props', () => {
    render(<TextArea rows={5} data-testid="description-textarea" />);
    const textarea = screen.getByTestId('description-textarea');
    expect(textarea).toHaveAttribute('rows', '5');
  });

  it('can be disabled', () => {
    render(<TextArea disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('renders without label and without id', () => {
    render(<TextArea placeholder="No label" />);
    const textarea = screen.getByPlaceholderText('No label');
    expect(textarea).not.toHaveAttribute('id');
  });
});
