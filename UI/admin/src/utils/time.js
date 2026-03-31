export function formatRelativeTime(timestamp) {
  if (!timestamp) {
    return 'Never';
  }

  const now = new Date();
  const updated = new Date(timestamp);
  const diffMs = now - updated;

  if (!Number.isFinite(diffMs)) {
    return 'Unknown';
  }

  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return updated.toLocaleDateString();
}
