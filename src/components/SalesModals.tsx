import { useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  ArrowDownToLine,
  GitBranch,
  History,
  Plus,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import type { FefoLot, SalesOrder, SalesOrderLine } from '../types/logistics';
import { formatShortTime, formatVnd, getEarliestLotSummary } from '../utils/formatVnd';
import { BottomSheet } from './BottomSheet';

interface ShortageSheetProps {
  isOpen: boolean;
  order: SalesOrder;
  lots: FefoLot[];
  focusSku: string | null;
  busy: boolean;
  onClose: () => void;
  onResolve: (strategy: 'adjust_qty' | 'create_po' | 'request_split', sku?: string) => Promise<void>;
}

export function ShortageResolutionSheet({
  isOpen,
  order,
  lots,
  focusSku,
  busy,
  onClose,
  onResolve,
}: ShortageSheetProps) {
  const shortItems = order.items.filter((item) => {
    if (focusSku && item.sku !== focusSku) return false;
    const { available } = getEarliestLotSummary(lots, item.sku);
    return available < item.requestedQty;
  });

  const activeItem: SalesOrderLine | undefined = shortItems[0];

  return (
    <BottomSheet
      isOpen={isOpen}
      title="Phương án xử lý thiếu hàng"
      subtitle={
        activeItem
          ? `${activeItem.productName} (${activeItem.sku})`
          : `Đơn ${order.id} · ${order.customerName}`
      }
      onClose={onClose}
    >
      {shortItems.length === 0 ? (
        <div className="p-4 rounded-2xl bg-[#E6F7F0] border border-[#A7E3CA] text-[#0D7A52] text-[13px] font-medium">
          Tất cả dòng hàng trong đơn {order.id} đều đã đủ tồn khả dụng FEFO. Bạn có thể bấm
          &ldquo;Xác nhận &amp; Giữ FEFO&rdquo; ngay.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-[#FFF6E5] border border-[#F3D88C] space-y-2">
            {shortItems.map((item) => {
              const { earliestLot, available } = getEarliestLotSummary(lots, item.sku);
              const missing = item.requestedQty - available;
              return (
                <div key={item.sku} className="text-[13px] text-[#3D040E]">
                  <div className="font-semibold">{item.productName}</div>
                  <div className="text-[12px] text-[#7A5200] mt-0.5 font-mono tabular-nums">
                    Yêu cầu: {item.requestedQty} · Khả dụng ({earliestLot?.lotId}): {available} ·
                    Thiếu: {missing} {item.unitLabel}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => onResolve('create_po', focusSku ?? undefined)}
              className="w-full min-h-[56px] p-3.5 rounded-2xl border border-[#E5DBD0] bg-[#FFFFFF] hover:bg-[#F7F3EE] text-left flex items-start gap-3 transition-colors cursor-pointer disabled:opacity-50"
            >
              <span className="w-9 h-9 rounded-xl bg-[#F4E6E8] text-[#640D22] inline-flex items-center justify-center shrink-0">
                <ShoppingBag className="w-4 h-4" />
              </span>
              <div>
                <div className="text-[14px] font-bold text-[#3D040E]">
                  1. Tạo đề xuất Mua bù sang NV Mua hàng
                </div>
                <div className="text-[12px] text-[#6E5B5D] mt-0.5">
                  Tự động phát hành phiếu PO số lượng thiếu để nhập bổ sung vào lô FEFO.
                </div>
              </div>
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => onResolve('adjust_qty', focusSku ?? undefined)}
              className="w-full min-h-[56px] p-3.5 rounded-2xl border border-[#E5DBD0] bg-[#FFFFFF] hover:bg-[#F7F3EE] text-left flex items-start gap-3 transition-colors cursor-pointer disabled:opacity-50"
            >
              <span className="w-9 h-9 rounded-xl bg-[#E6F7F0] text-[#0D7A52] inline-flex items-center justify-center shrink-0">
                <ArrowDownToLine className="w-4 h-4" />
              </span>
              <div>
                <div className="text-[14px] font-bold text-[#3D040E]">
                  2. Điều chỉnh số lượng đặt bằng Khả dụng
                </div>
                <div className="text-[12px] text-[#6E5B5D] mt-0.5">
                  Khớp ngay số lượng yêu cầu về đúng mức khả dụng để giữ FEFO tức thời.
                </div>
              </div>
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => onResolve('request_split', focusSku ?? undefined)}
              className="w-full min-h-[56px] p-3.5 rounded-2xl border border-[#E5DBD0] bg-[#FFFFFF] hover:bg-[#F7F3EE] text-left flex items-start gap-3 transition-colors cursor-pointer disabled:opacity-50"
            >
              <span className="w-9 h-9 rounded-xl bg-[#FEF5D9] text-[#9A6700] inline-flex items-center justify-center shrink-0">
                <GitBranch className="w-4 h-4" />
              </span>
              <div>
                <div className="text-[14px] font-bold text-[#3D040E]">
                  3. Gửi duyệt Tách giao 2 đợt
                </div>
                <div className="text-[12px] text-[#6E5B5D] mt-0.5">
                  Đưa vào Hàng đợi phê duyệt ở Tổng quan Admin để xuất trước phần tồn hiện có.
                </div>
              </div>
            </button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}

interface OrderHistorySheetProps {
  isOpen: boolean;
  order: SalesOrder;
  onClose: () => void;
}

export function OrderHistorySheet({ isOpen, order, onClose }: OrderHistorySheetProps) {
  return (
    <BottomSheet
      isOpen={isOpen}
      title={`Lịch sử thao tác · ${order.id}`}
      subtitle={order.customerName}
      onClose={onClose}
    >
      <div className="space-y-3">
        {order.history.map((entry) => (
          <div
            key={entry.id}
            className="p-3 rounded-2xl border border-[#E5DBD0] bg-[#FFFFFF] space-y-1"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#640D22]">
                <History className="w-3.5 h-3.5" />
                {entry.action}
              </span>
              <span className="font-mono text-[11px] text-[#6E5B5D] tabular-nums">
                {formatShortTime(entry.timestampIso)}
              </span>
            </div>
            <div className="text-[12px] text-[#3D040E]">{entry.detail}</div>
            <div className="text-[11px] text-[#6E5B5D]">Thực hiện: {entry.actor}</div>
          </div>
        ))}
      </div>
    </BottomSheet>
  );
}

interface CancelOrderSheetProps {
  isOpen: boolean;
  order: SalesOrder;
  busy: boolean;
  onClose: () => void;
  onConfirmCancel: (reason: string) => Promise<void>;
}

export function CancelOrderSheet({
  isOpen,
  order,
  busy,
  onClose,
  onConfirmCancel,
}: CancelOrderSheetProps) {
  const [reason, setReason] = useState('Khách hàng yêu cầu dừng đơn do điều chỉnh lịch nhận hàng.');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await onConfirmCancel(reason);
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      title="Dừng / Hủy đơn (Quyết toán)"
      subtitle={`Đơn ${order.id} · ${order.customerName}`}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3.5 rounded-2xl bg-[#FFF0F2] border border-[#F5C6CE] flex items-start gap-2.5 text-[12px] text-[#7A1023]">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Thao tác này sẽ giải phóng toàn bộ tồn kho FEFO đang giữ (nếu có) và gửi phiếu quyết
            toán vào <strong>Tổng quan Admin</strong>.
          </span>
        </div>

        <div>
          <label htmlFor="cancel-reason" className="block text-[13px] font-semibold text-[#3D040E] mb-1.5">
            Lý do dừng / quyết toán
          </label>
          <textarea
            id="cancel-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-xl border border-[#DDD3C8] bg-[#FFFFFF] px-3 py-2.5 text-[13px] text-[#3D040E] focus:outline-none focus:border-[#640D22]"
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-xl border border-[#DDD3C8] bg-[#FFFFFF] text-[13px] font-semibold text-[#3D040E] cursor-pointer"
          >
            Quay lại
          </button>
          <button
            type="submit"
            disabled={busy}
            className="min-h-[44px] rounded-xl bg-[#991B1B] text-[13px] font-bold text-[#FFFFFF] disabled:opacity-50 cursor-pointer"
          >
            {busy ? 'Đang xử lý...' : 'Xác nhận Hủy'}
          </button>
        </div>
      </form>
    </BottomSheet>
  );
}

interface NewSalesOrderSheetProps {
  isOpen: boolean;
  lots: FefoLot[];
  busy: boolean;
  onClose: () => void;
  onCreateOrder: (payload: {
    customerName: string;
    scheduledDeliveryLabel: string;
    items: Array<{ sku: string; requestedQty: number }>;
  }) => Promise<void>;
}

export function NewSalesOrderSheet({
  isOpen,
  lots,
  busy,
  onClose,
  onCreateOrder,
}: NewSalesOrderSheetProps) {
  // Unique SKUs from lots
  const skus = Array.from(new Map(lots.map((l) => [l.sku, l])).values());
  const [customerName, setCustomerName] = useState('');
  const [scheduledDeliveryLabel, setScheduledDeliveryLabel] = useState('Hôm nay, 17:30');
  const [lines, setLines] = useState<Array<{ sku: string; requestedQty: number }>>([
    { sku: skus[0]?.sku ?? 'SKU-MILK-01', requestedQty: 40 },
  ]);
  const [error, setError] = useState<string | null>(null);

  const totalEstimate = lines.reduce((sum, l) => {
    const skuInfo = skus.find((s) => s.sku === l.sku);
    return sum + (skuInfo ? skuInfo.unitPriceVnd * l.requestedQty : 0);
  }, 0);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!customerName.trim()) {
      setError('Vui lòng nhập tên khách hàng.');
      return;
    }
    try {
      await onCreateOrder({
        customerName: customerName.trim(),
        scheduledDeliveryLabel,
        items: lines,
      });
      setCustomerName('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tạo đơn mới.');
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      title="Tạo đơn bán hàng mới"
      subtitle="Kho chỉ định: Kho Tổng Tân Bình (TB-01)"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-[#FFF0F2] border border-[#F5C6CE] text-[#991B1B] text-[12px]">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="new-customer" className="block text-[13px] font-semibold text-[#3D040E] mb-1">
            Khách hàng
          </label>
          <input
            id="new-customer"
            type="text"
            required
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="VD: Siêu thị WinMart Cộng Hòa"
            className="w-full h-11 rounded-xl border border-[#DDD3C8] bg-[#FFFFFF] px-3 text-[13px] text-[#3D040E] focus:outline-none focus:border-[#640D22]"
          />
        </div>

        <div>
          <label htmlFor="new-schedule" className="block text-[13px] font-semibold text-[#3D040E] mb-1">
            Ngày giao hẹn
          </label>
          <input
            id="new-schedule"
            type="text"
            value={scheduledDeliveryLabel}
            onChange={(e) => setScheduledDeliveryLabel(e.target.value)}
            className="w-full h-11 rounded-xl border border-[#DDD3C8] bg-[#FFFFFF] px-3 text-[13px] text-[#3D040E] focus:outline-none focus:border-[#640D22]"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[13px] font-semibold text-[#3D040E]">Dòng hàng</span>
            <button
              type="button"
              onClick={() =>
                setLines((prev) => [
                  ...prev,
                  { sku: skus[1]?.sku ?? skus[0]?.sku ?? '', requestedQty: 20 },
                ])
              }
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#640D22] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm dòng
            </button>
          </div>

          <div className="space-y-2">
            {lines.map((line, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl border border-[#E5DBD0] bg-[#FFFFFF] grid grid-cols-[1fr_72px_auto] gap-2 items-center"
              >
                <select
                  value={line.sku}
                  onChange={(e) =>
                    setLines((prev) =>
                      prev.map((item, i) => (i === idx ? { ...item, sku: e.target.value } : item))
                    )
                  }
                  className="h-9 rounded-lg border border-[#DDD3C8] bg-[#FDFBF7] px-2 text-[12px] text-[#3D040E]"
                >
                  {skus.map((s) => (
                    <option key={s.sku} value={s.sku}>
                      {s.productName} ({s.sku})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={line.requestedQty}
                  onChange={(e) =>
                    setLines((prev) =>
                      prev.map((item, i) =>
                        i === idx
                          ? { ...item, requestedQty: Math.max(1, Number(e.target.value) || 1) }
                          : item
                      )
                    )
                  }
                  className="h-9 rounded-lg border border-[#DDD3C8] bg-[#FDFBF7] px-2 font-mono text-[12px] text-right tabular-nums"
                />
                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                    className="w-9 h-9 rounded-lg border border-[#F5C6CE] text-[#991B1B] inline-flex items-center justify-center cursor-pointer"
                    aria-label="Xóa dòng"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#F7F3EE] border border-[#E5DBD0] flex items-center justify-between">
          <span className="text-[13px] text-[#6E5B5D]">Tổng giá trị dự kiến:</span>
          <span className="font-mono text-[16px] font-bold text-[#3D040E] tabular-nums">
            {formatVnd(totalEstimate)}
          </span>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full min-h-[46px] rounded-xl bg-[#640D22] text-[14px] font-bold text-[#FFFFFF] hover:bg-[#540316] disabled:opacity-50 cursor-pointer"
        >
          {busy ? 'Đang tạo đơn...' : 'Lưu đơn nháp'}
        </button>
      </form>
    </BottomSheet>
  );
}
