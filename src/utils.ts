export function formatCurrency(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

export function getUserId() {
  let userId = localStorage.getItem('take_the_spot_user_id');
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem('take_the_spot_user_id', userId);
  }
  return userId;
}

export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

export function getDaysLeft(expiresAt: string | null) {
  if (!expiresAt) return 0;
  const diff = new Date(expiresAt).getTime() - new Date().getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
