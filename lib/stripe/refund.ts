export function calcRefundAmount(
  totalAmount: number,
  reservedAt: string,
  now = new Date()
): { refundAmount: number; refundPct: number } {
  const reserved = new Date(reservedAt);
  const hoursUntil = (reserved.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntil >= 24) {
    return { refundAmount: totalAmount, refundPct: 100 };
  } else if (hoursUntil >= 2) {
    return { refundAmount: Math.floor(totalAmount * 0.5), refundPct: 50 };
  } else {
    return { refundAmount: 0, refundPct: 0 };
  }
}

export function calcCancelTokenExpiry(reservedAt: string): Date {
  const reserved = new Date(reservedAt);
  return new Date(reserved.getTime() - 2 * 60 * 60 * 1000);
}
