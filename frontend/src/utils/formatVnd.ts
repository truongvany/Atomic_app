import type { FefoLot, SalesOrder } from '../types/logistics';

export function formatVnd(amount: number): string {
  return `${amount.toLocaleString('vi-VN')} đ`;
}

export function formatShortTime(iso: string | null): string {
  if (!iso) return 'Chờ xử lý';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
}

export function getEarliestLotSummary(lots: FefoLot[], sku: string) {
  const matching = lots
    .filter((l) => l.sku === sku)
    .sort((a, b) => a.expirySortKey.localeCompare(b.expirySortKey));
  const earliestLot = matching[0] ?? null;
  const qualified = earliestLot ? earliestLot.qualifiedQty : 0;
  const reserved = earliestLot ? earliestLot.reservedQty : 0;
  const available = Math.max(0, qualified - reserved);
  return {
    earliestLot,
    qualified,
    reserved,
    available,
  };
}

export function getOrderTotalVnd(order: SalesOrder): number {
  return order.items.reduce((sum, item) => sum + item.requestedQty * item.unitPriceVnd, 0);
}
