import { render, screen, fireEvent } from '@testing-library/react';
import { PasswordInput } from '../PasswordInput';

describe('PasswordInput', () => {
  it('renders with label', () => {
    render(<PasswordInput label="Password" />);
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('starts with password hidden', () => {
    render(<PasswordInput label="Password" />);
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('shows password when eye button is clicked', () => {
    render(<PasswordInput label="Password" />);
    const input = screen.getByLabelText('Password');
    const toggleButton = screen.getByLabelText('Show password');
    
    fireEvent.click(toggleButton);
    
    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText('Hide password')).toBeInTheDocument();
  });

  it('hides password when eye button is clicked again', () => {
    render(<PasswordInput label="Password" />);
    const input = screen.getByLabelText('Password');
    const toggleButton = screen.getByLabelText('Show password');
    
    // Show password
    fireEvent.click(toggleButton);
    expect(input).toHaveAttribute('type', 'text');
    
    // Hide password
    const hideButton = screen.getByLabelText('Hide password');
    fireEvent.click(hideButton);
    expect(input).toHaveAttribute('type', 'password');
  });

  it('handles value changes', () => {
    const handleChange = jest.fn();
    render(<PasswordInput label="Password" onChange={handleChange} />);
    const input = screen.getByLabelText('Password');
    
    fireEvent.change(input, { target: { value: 'test123' } });
    
    expect(handleChange).toHaveBeenCalledWith(expect.objectContaining({
      target: expect.objectContaining({ value: 'test123' })
    }));
  });

  it('displays error message', () => {
    render(<PasswordInput label="Password" error="Password is required" />);
    expect(screen.getByText('Password is required')).toBeInTheDocument();
  });

  it('shows required asterisk when required', () => {
    render(<PasswordInput label="Password" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<PasswordInput label="Password" className="custom-class" />);
    const input = screen.getByLabelText('Password');
    expect(input).toHaveClass('custom-class');
  });

  it('applies error styling when error is present', () => {
    render(<PasswordInput label="Password" error="Error message" />);
    const input = screen.getByLabelText('Password');
    expect(input).toHaveClass('border-red-500');
  });
});