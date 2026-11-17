import { useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertCircle,
  Calendar,
  Hand,
  Info,
  Lock,
  Package,
  Plus,
  SlidersHorizontal,
} from 'lucide-react';
import type { FefoLot, SalesOrder } from '../types/logistics';
import { formatVnd, getEarliestLotSummary, getOrderTotalVnd } from '../utils/formatVnd';
import {
  CancelOrderSheet,
  OrderHistorySheet,
  ShortageResolutionSheet,
} from './SalesModals';

interface SalesTabProps {
  orders: SalesOrder[];
  selectedOrder: SalesOrder | null;
  lots: FefoLot[];
  showFefoAlerts?: boolean;
  onSelectOrderId: (id: string) => void;
  onOpenCreateOrder: () => void;
  onReserveFefo: (orderId: string) => Promise<void>;
  onResolveShortage: (
    orderId: string,
    strategy: 'adjust_qty' | 'create_po' | 'request_split',
    sku?: string
  ) => Promise<void>;
  onCancelOrder: (orderId: string, reason: string) => Promise<void>;
}

const ORDER_STATUS_STYLE: Record<SalesOrder['status'], string> = {
  Nháp: 'bg-[#EFE8DF] text-[#5C4B4C] border-[#DDD3C8]',
  'Chờ duyệt': 'bg-[#FEF5D9] text-[#9A6700] border-[#F3D88C]',
  'Đã giữ FEFO': 'bg-[#E6F7F0] text-[#0D7A52] border-[#A7E3CA]',
  'Đang giao': 'bg-[#E6F7F0] text-[#0D7A52] border-[#A7E3CA]',
  'Đã giao': 'bg-[#E6F7F0] text-[#0D7A52] border-[#A7E3CA]',
  'Đã hủy': 'bg-[#FFF0F2] text-[#991B1B] border-[#F5C6CE]',
};

export function SalesTab({
  orders,
  selectedOrder,
  lots,
  showFefoAlerts = true,
  onSelectOrderId,
  onOpenCreateOrder,
  onReserveFefo,
  onResolveShortage,
  onCancelOrder,
}: SalesTabProps) {
  const [shortageSheetOpen, setShortageSheetOpen] = useState(false);
  const [focusSku, setFocusSku] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!selectedOrder) {
    return (
      <div className="rounded-2xl bg-[#FFFFFF]/95 border border-[#EAE2D9] p-6 text-center space-y-2.5">
        <div className="text-[14px] font-bold text-[#3D040E]">Chưa có đơn hàng trong kho này</div>
        <p className="text-[12px] text-[#6E5B5D]">
          Chuyển bộ lọc sang &ldquo;Tất cả kho&rdquo; hoặc tạo đơn bán hàng mới.
        </p>
        <button
          type="button"
          onClick={onOpenCreateOrder}
          className="px-4 py-2 rounded-xl bg-[#640D22] text-[#FFFFFF] text-[12px] font-bold inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tạo đơn mới</span>
        </button>
      </div>
    );
  }

  const totalVnd = getOrderTotalVnd(selectedOrder);
  const hasAnyShortage = selectedOrder.items.some((item) => {
    const { available } = getEarliestLotSummary(lots, item.sku);
    return available < item.requestedQty;
  });

  const isLocked =
    selectedOrder.status === 'Đã giữ FEFO' ||
    selectedOrder.status === 'Đang giao' ||
    selectedOrder.status === 'Đã giao' ||
    selectedOrder.status === 'Đã hủy';

  const handleOpenShortage = (sku: string | null) => {
    setFocusSku(sku);
    setShortageSheetOpen(true);
  };

  const handleReserveClick = async () => {
    if (hasAnyShortage) {
      handleOpenShortage(null);
      return;
    }
    setBusy(true);
    try {
      await onReserveFefo(selectedOrder.id);
    } finally {
      setBusy(false);
    }
  };

  const handleResolveAction = async (
    strategy: 'adjust_qty' | 'create_po' | 'request_split',
    sku?: string
  ) => {
    setBusy(true);
    try {
      await onResolveShortage(selectedOrder.id, strategy, sku);
      setShortageSheetOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const handleCancelAction = async (reason: string) => {
    setBusy(true);
    try {
      await onCancelOrder(selectedOrder.id, reason);
      setCancelOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 pb-4">
      {/* Compact Status Banner */}
      {showFefoAlerts && (
        <div className="px-3 py-2 rounded-xl bg-[#FBF0F2] border border-[#EED9DD] flex items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-1.5 min-w-0 text-[#5D1323]">
            <Info className="w-3.5 h-3.5 shrink-0 text-[#721C2A]" />
            <span className="truncate font-medium">
              {selectedOrder.id} · [{selectedOrder.status}] ·{' '}
              {hasAnyShortage ? 'Cần xử lý thiếu' : 'Khả dụng hợp lệ'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="font-bold text-[#640D22] underline underline-offset-2 shrink-0 cursor-pointer"
          >
            Lịch sử
          </button>
        </div>
      )}

      {/* Compact Order Selector Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {orders.map((ord) => {
            const active = ord.id === selectedOrder.id;
            return (
              <button
                key={ord.id}
                type="button"
                onClick={() => onSelectOrderId(ord.id)}
                className={`px-2.5 py-1 rounded-lg font-mono text-[10.5px] font-semibold border whitespace-nowrap transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#640D22] text-[#FFFFFF] border-[#540316]'
                    : 'bg-[#FFFFFF] text-[#5C4B4C] border-[#E5DBD0] hover:bg-[#F7F3EE]'
                }`}
              >
                {ord.id}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {!showFefoAlerts && (
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="px-2 py-1 rounded-lg border border-[#DDD3C8] bg-[#FFFFFF] text-[11px] font-semibold text-[#640D22] cursor-pointer"
            >
              Lịch sử
            </button>
          )}
          <button
            type="button"
            onClick={onOpenCreateOrder}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#DDD3C8] bg-[#FFFFFF] text-[11px] font-semibold text-[#640D22] hover:bg-[#F7F3EE] cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>Tạo đơn</span>
          </button>
        </div>
      </div>

      {/* Responsive 2-Column Workspace on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        <div className="lg:col-span-5 space-y-3">
          {/* Compact Order Summary Card */}
          <section className="rounded-2xl bg-[#FFFFFF]/95 border border-[#EAE2D9] p-3.5 shadow-[0_1px_4px_rgba(61,4,14,0.04)]">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[#7D6C6E]">
              Đơn bán hàng
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-[16px] font-bold text-[#3D040E] tabular-nums">
                {selectedOrder.id}
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold ${
                  ORDER_STATUS_STYLE[selectedOrder.status]
                }`}
              >
                {selectedOrder.status}
              </span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] text-[#7D6C6E]">Giao hẹn</div>
            <div className="text-[12px] font-bold text-[#3D040E] mt-0.5">
              {selectedOrder.scheduledDeliveryLabel}
            </div>
          </div>
        </div>

        <div className="mt-2.5 pt-2.5 border-t border-[#F2ECE5] grid grid-cols-2 gap-2.5 text-[11.5px]">
          <div className="min-w-0">
            <div className="text-[10px] text-[#7D6C6E]">Khách hàng</div>
            <div className="font-semibold text-[#3D040E] truncate mt-0.5">
              {selectedOrder.customerName}
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-[#7D6C6E]">Kho xuất</div>
            <div className="font-semibold text-[#3D040E] truncate mt-0.5">
              {selectedOrder.warehouseName}
            </div>
          </div>
        </div>
      </section>

          {/* Compact Order Total & Action Card (Desktop Left Column) */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="hidden lg:block rounded-2xl bg-[#FFFFFF]/95 border border-[#EAE2D9] p-3.5 shadow-[0_2px_8px_rgba(61,4,14,0.05)] space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-[#6E5B5D]">Tổng giá trị đơn</span>
              <span className="font-mono text-[17px] font-bold text-[#3D040E] tabular-nums">
                {formatVnd(totalVnd)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                disabled={isLocked}
                onClick={() => handleOpenShortage(null)}
                className="min-h-[42px] px-2.5 rounded-xl border border-[#DDD3C8] bg-[#FFFFFF] hover:bg-[#F7F3EE] text-[12px] font-bold text-[#3D040E] inline-flex items-center justify-center gap-1.5 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Phương án thiếu</span>
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                disabled={busy || isLocked}
                onClick={handleReserveClick}
                className="min-h-[42px] px-2.5 rounded-xl bg-[#640D22] hover:bg-[#540316] text-[12px] font-bold text-[#FFFFFF] inline-flex items-center justify-center gap-1.5 disabled:opacity-45 transition-colors cursor-pointer shadow-[0_4px_12px_rgba(100,13,34,0.22)]"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>
                  {selectedOrder.status === 'Đã giữ FEFO'
                    ? 'Đã giữ FEFO'
                    : busy
                    ? 'Đang giữ...'
                    : 'Giữ hàng FEFO'}
                </span>
              </motion.button>
            </div>

            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              disabled={selectedOrder.status === 'Đã hủy' || selectedOrder.status === 'Đã giao'}
              onClick={() => setCancelOpen(true)}
              className="w-full min-h-[40px] px-3 rounded-xl bg-[#FFF0F2] border border-[#F5C6CE] hover:bg-[#FFE4E8] text-[11.5px] font-semibold text-[#7A1023] inline-flex items-center justify-center gap-1.5 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <Hand className="w-3.5 h-3.5" />
              <span>Dừng / Hủy đơn (Quyết toán)</span>
            </motion.button>
          </motion.section>
        </div>

        <div className="lg:col-span-7 space-y-2.5">
          {/* Compact Section Header */}
          <div className="pt-0.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.03em] text-[#3D040E]">
              <Package className="w-3.5 h-3.5 text-[#721C2A] shrink-0" />
              <span>Dòng hàng &amp; Khả dụng</span>
            </div>
            <span className="text-[10px] text-[#7D6C6E] whitespace-nowrap">
              Khả dụng = Đủ ĐK - Giữ
            </span>
          </div>

          {/* Compact Line Item Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2.5">
        {selectedOrder.items.map((item, idx) => {
          const { earliestLot, qualified, reserved, available } = getEarliestLotSummary(
            lots,
            item.sku
          );
          const shortage = Math.max(0, item.requestedQty - available);
          const isShort = shortage > 0 && selectedOrder.status !== 'Đã giữ FEFO';

          return (
            <motion.article
              key={item.sku}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: idx * 0.04, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-2xl bg-[#FFFFFF]/95 backdrop-blur-sm border border-[#EAE2D9] p-3 shadow-[0_2px_6px_rgba(61,4,14,0.04)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-1.5">
                    <h3 className="text-[13px] font-bold text-[#3D040E] leading-snug">
                      {item.productName}
                    </h3>
                    <span className="font-mono text-[10px] text-[#7D6C6E]">{item.sku}</span>
                  </div>
                  <div className="text-[11px] text-[#6E5B5D] mt-0.5">
                    {formatVnd(item.unitPriceVnd)}/{item.unitLabel} · Kho {item.warehouseCode}
                  </div>
                </div>

                {selectedOrder.status === 'Đã giữ FEFO' ||
                selectedOrder.status === 'Đang giao' ||
                selectedOrder.status === 'Đã giao' ? (
                  <span className="px-2 py-0.5 rounded-full bg-[#E6F7F0] border border-[#A7E3CA] text-[#0D7A52] text-[10px] font-bold whitespace-nowrap shrink-0">
                    Đã giữ FEFO
                  </span>
                ) : isShort ? (
                  <span className="px-2 py-0.5 rounded-full bg-[#FEF5D9] border border-[#F3D88C] text-[#9A6700] text-[10px] font-bold whitespace-nowrap shrink-0">
                    Thiếu {shortage}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-[#E6F7F0] border border-[#A7E3CA] text-[#0D7A52] text-[10px] font-bold whitespace-nowrap shrink-0">
                    Đủ FEFO
                  </span>
                )}
              </div>

              {/* 4-Column Compact Inset Box */}
              <div className="mt-2.5 rounded-xl bg-[#F7F3EE] px-2 py-2 grid grid-cols-4 text-center">
                <div>
                  <div className="text-[10px] text-[#7D6C6E]">Yêu cầu</div>
                  <div className="font-mono text-[13px] font-bold text-[#3D040E] mt-0.5 tabular-nums">
                    {item.requestedQty}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[#7D6C6E]">Đủ ĐK</div>
                  <div className="font-mono text-[13px] font-bold text-[#3D040E] mt-0.5 tabular-nums">
                    {qualified}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[#7D6C6E]">Đã giữ</div>
                  <div className="font-mono text-[13px] font-bold text-[#B45309] mt-0.5 tabular-nums">
                    {reserved}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[#7D6C6E]">Khả dụng</div>
                  <div
                    className={`font-mono text-[13px] font-bold mt-0.5 tabular-nums ${
                      isShort ? 'text-[#C21842]' : 'text-[#0D7A52]'
                    }`}
                  >
                    {available}
                  </div>
                </div>
              </div>

              {/* Compact Footer */}
              <div className="mt-2 pt-2 border-t border-[#F2ECE5] flex items-center justify-between gap-2 text-[11px]">
                {isShort ? (
                  <>
                    <span className="inline-flex items-center gap-1 text-[#991B1B] font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Thiếu {shortage} {item.unitLabel}</span>
                    </span>
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() => handleOpenShortage(item.sku)}
                      className="font-bold text-[#640D22] underline underline-offset-2 cursor-pointer disabled:opacity-40"
                    >
                      Xử lý thiếu
                    </button>
                  </>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1 text-[#6E5B5D]">
                      <Calendar className="w-3 h-3 shrink-0 text-[#7D6C6E]" />
                      <span>
                        Lô:{' '}
                        <strong className="text-[#3D040E] font-mono">
                          {item.allocatedLotId ?? earliestLot?.lotId ?? '—'}
                        </strong>{' '}
                        ({earliestLot?.expiryLabel ?? 'HSD'})
                      </span>
                    </span>
                    <span className="font-mono font-bold text-[#3D040E] tabular-nums shrink-0">
                      Giữ {item.requestedQty}
                    </span>
                  </>
                )}
              </div>
            </motion.article>
          );
        })}
          </div>
        </div>
      </div>

      {/* Compact Order Total & Action Card (Mobile) */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        className="lg:hidden rounded-2xl bg-[#FFFFFF]/95 border border-[#EAE2D9] p-3.5 shadow-[0_2px_8px_rgba(61,4,14,0.05)] space-y-2.5"
      >
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-medium text-[#6E5B5D]">Tổng giá trị đơn</span>
          <span className="font-mono text-[17px] font-bold text-[#3D040E] tabular-nums">
            {formatVnd(totalVnd)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            disabled={isLocked}
            onClick={() => handleOpenShortage(null)}
            className="min-h-[42px] px-2.5 rounded-xl border border-[#DDD3C8] bg-[#FFFFFF] hover:bg-[#F7F3EE] text-[12px] font-bold text-[#3D040E] inline-flex items-center justify-center gap-1.5 disabled:opacity-40 transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Phương án thiếu</span>
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            disabled={busy || isLocked}
            onClick={handleReserveClick}
            className="min-h-[42px] px-2.5 rounded-xl bg-[#640D22] hover:bg-[#540316] text-[12px] font-bold text-[#FFFFFF] inline-flex items-center justify-center gap-1.5 disabled:opacity-45 transition-colors cursor-pointer shadow-[0_4px_12px_rgba(100,13,34,0.22)]"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>
              {selectedOrder.status === 'Đã giữ FEFO'
                ? 'Đã giữ FEFO'
                : busy
                ? 'Đang giữ...'
                : 'Giữ hàng FEFO'}
            </span>
          </motion.button>
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          disabled={selectedOrder.status === 'Đã hủy' || selectedOrder.status === 'Đã giao'}
          onClick={() => setCancelOpen(true)}
          className="w-full min-h-[40px] px-3 rounded-xl bg-[#FFF0F2] border border-[#F5C6CE] hover:bg-[#FFE4E8] text-[11.5px] font-semibold text-[#7A1023] inline-flex items-center justify-center gap-1.5 disabled:opacity-40 transition-colors cursor-pointer"
        >
          <Hand className="w-3.5 h-3.5" />
          <span>Dừng / Hủy đơn (Quyết toán)</span>
        </motion.button>
      </motion.section>

      <ShortageResolutionSheet
        isOpen={shortageSheetOpen}
        order={selectedOrder}
        lots={lots}
        focusSku={focusSku}
        busy={busy}
        onClose={() => setShortageSheetOpen(false)}
        onResolve={handleResolveAction}
      />

      <OrderHistorySheet
        isOpen={historyOpen}
        order={selectedOrder}
        onClose={() => setHistoryOpen(false)}
      />

      <CancelOrderSheet
        isOpen={cancelOpen}
        order={selectedOrder}
        busy={busy}
        onClose={() => setCancelOpen(false)}
        onConfirmCancel={handleCancelAction}
      />
    </div>
  );
}
