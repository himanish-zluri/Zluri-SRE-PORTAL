import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../StatusBadge';

describe('StatusBadge', () => {
  it('renders PENDING status correctly', () => {
    render(<StatusBadge status="PENDING" />);
    expect(screen.getByText('PENDING')).toBeInTheDocument();
    expect(screen.getByText('⏳')).toBeInTheDocument();
  });

  it('renders APPROVED status correctly', () => {
    render(<StatusBadge status="APPROVED" />);
    expect(screen.getByText('APPROVED')).toBeInTheDocument();
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('renders REJECTED status correctly', () => {
    render(<StatusBadge status="REJECTED" />);
    expect(screen.getByText('REJECTED')).toBeInTheDocument();
    expect(screen.getByText('✗')).toBeInTheDocument();
  });

  it('renders EXECUTED status correctly', () => {
    render(<StatusBadge status="EXECUTED" />);
    expect(screen.getByText('EXECUTED')).toBeInTheDocument();
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('renders FAILED status correctly', () => {
    render(<StatusBadge status="FAILED" />);
    expect(screen.getByText('FAILED')).toBeInTheDocument();
    expect(screen.getByText('△')).toBeInTheDocument();
  });

  it('applies PENDING styling', () => {
    render(<StatusBadge status="PENDING" />);
    const badge = screen.getByText('PENDING').closest('span');
    expect(badge).toHaveClass('bg-yellow-500/20', 'text-yellow-400');
  });

  it('applies APPROVED styling', () => {
    render(<StatusBadge status="APPROVED" />);
    const badge = screen.getByText('APPROVED').closest('span');
    expect(badge).toHaveClass('bg-blue-500/20', 'text-blue-400');
  });

  it('applies REJECTED styling', () => {
    render(<StatusBadge status="REJECTED" />);
    const badge = screen.getByText('REJECTED').closest('span');
    expect(badge).toHaveClass('bg-red-500/20', 'text-red-400');
  });

  it('applies EXECUTED styling', () => {
    render(<StatusBadge status="EXECUTED" />);
    const badge = screen.getByText('EXECUTED').closest('span');
    expect(badge).toHaveClass('bg-green-500/20', 'text-green-400');
  });

  it('applies FAILED styling', () => {
    render(<StatusBadge status="FAILED" />);
    const badge = screen.getByText('FAILED').closest('span');
    expect(badge).toHaveClass('bg-orange-500/20', 'text-orange-400');
  });
});
