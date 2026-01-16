import { render, screen, fireEvent } from '@testing-library/react';
import { Select } from '../Select';

const mockOptions = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3' },
];

describe('Select', () => {
  it('renders options correctly', () => {
    render(<Select options={mockOptions} />);
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
    expect(screen.getByText('Option 3')).toBeInTheDocument();
  });

  it('renders with label', () => {
    render(<Select label="Category" options={mockOptions} />);
    expect(screen.getByLabelText('Category')).toBeInTheDocument();
  });

  it('shows required indicator when required', () => {
    render(<Select label="Category" options={mockOptions} required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('does not show required indicator when not required', () => {
    render(<Select label="Category" options={mockOptions} />);
    expect(screen.queryByText('*')).not.toBeInTheDocument();
  });

  it('renders placeholder option', () => {
    render(<Select options={mockOptions} placeholder="Select an option" />);
    expect(screen.getByText('Select an option')).toBeInTheDocument();
  });

  it('placeholder option is disabled', () => {
    render(<Select options={mockOptions} placeholder="Select an option" />);
    const placeholder = screen.getByText('Select an option');
    expect(placeholder).toBeDisabled();
  });

  it('displays error message', () => {
    render(<Select options={mockOptions} error="Please select an option" />);
    expect(screen.getByText('Please select an option')).toBeInTheDocument();
  });

  it('applies error styling when error is present', () => {
    render(<Select label="Category" options={mockOptions} error="Error" />);
    const select = screen.getByLabelText('Category');
    expect(select).toHaveClass('border-red-500');
  });

  it('generates id from label', () => {
    render(<Select label="My Category" options={mockOptions} />);
    const select = screen.getByLabelText('My Category');
    expect(select).toHaveAttribute('id', 'my-category');
  });

  it('uses provided id over generated one', () => {
    render(<Select label="Category" options={mockOptions} id="custom-id" />);
    const select = screen.getByLabelText('Category');
    expect(select).toHaveAttribute('id', 'custom-id');
  });

  it('handles value changes', () => {
    const handleChange = jest.fn();
    render(<Select options={mockOptions} onChange={handleChange} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'option2' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('applies custom className', () => {
    render(<Select options={mockOptions} className="custom-class" />);
    const select = screen.getByRole('combobox');
    expect(select).toHaveClass('custom-class');
  });

  it('can be disabled', () => {
    render(<Select options={mockOptions} disabled />);
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('renders without label and without id', () => {
    render(<Select options={mockOptions} />);
    const select = screen.getByRole('combobox');
    expect(select).not.toHaveAttribute('id');
  });

  it('renders empty options array', () => {
    render(<Select options={[]} />);
    const select = screen.getByRole('combobox');
    expect(select.children.length).toBe(0);
  });
});
