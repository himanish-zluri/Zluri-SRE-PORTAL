interface StatusBadgeProps {
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTED' | 'FAILED';
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles = {
    PENDING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    APPROVED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    REJECTED: 'bg-red-500/20 text-red-400 border-red-500/30',
    EXECUTED: 'bg-green-500/20 text-green-400 border-green-500/30',
    FAILED: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  };

  const icons = {
    PENDING: '⏳',
    APPROVED: '✓',
    REJECTED: '✗',
    EXECUTED: '✓',
    FAILED: '△',
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${styles[status]}`}>
      <span>{icons[status]}</span>
      {status}
    </span>
  );
}
