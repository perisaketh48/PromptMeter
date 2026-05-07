export function formatNumber(n) {
  if (n == null || n === '') return '—';
  return new Intl.NumberFormat('en-US').format(typeof n === 'string' ? Number(n) : n);
}

export function formatTokens(n) {
  if (n == null) return '—';
  const num = typeof n === 'string' ? Number(n) : n;
  if (!Number.isFinite(num)) return '—';
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
  return new Intl.NumberFormat('en-US').format(num);
}

export function formatUSD(n, { precise = false } = {}) {
  if (n == null || n === '') return '—';
  const num = typeof n === 'string' ? Number(n) : n;
  if (!Number.isFinite(num)) return '—';
  if (precise) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(num);
  }
  if (num !== 0 && Math.abs(num) < 0.01) {
    return `$${num.toFixed(6)}`;
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
}

export function formatDate(value) {
  if (!value) return '—';
  try {
    const d = new Date(value);
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

export function formatShortDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
}
