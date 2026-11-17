import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, QrCode, Truck } from 'lucide-react';
import type { SalesOrder } from '../types/logistics';
import { encodeCode128B, generateMatrixGrid } from '../utils/barcode';
import { formatShortTime, formatVnd, getOrderTotalVnd } from '../utils/formatVnd';
import { BottomSheet } from './BottomSheet';

interface DispatchTabProps {
  salesOrders: SalesOrder[];
  onAdvanceDispatch: (orderId: string) => Promise<void>;
}

export function DispatchTab({ salesOrders, onAdvanceDispatch }: DispatchTabProps) {
  const [barcodeOrder, setBarcodeOrder] = useState<SalesOrder | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const dispatchableOrders = salesOrders.filter(
    (o) => o.status === 'Đã giữ FEFO' || o.status === 'Đang giao' || o.status === 'Đã giao'
  );

  const handleAdvance = async (orderId: string) => {
    setBusyId(orderId);
    try {
      await onAdvanceDispatch(orderId);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-2.5 pb-4">
      <div className="rounded-2xl bg-[#FFFFFF]/95 border border-[#EAE2D9] p-3.5 shadow-[0_1px_3px_rgba(61,4,14,0.04)]">
        <div className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[#7D6C6E]">
          Điều phối xuất kho
        </div>
        <div className="text-[14px] font-bold text-[#3D040E] mt-0.5">
          {dispatchableOrders.length} đơn đã khóa FEFO sẵn sàng giao
        </div>
      </div>

      {dispatchableOrders.length === 0 ? (
        <div className="rounded-2xl bg-[#FFFFFF]/95 border border-[#EAE2D9] p-5 text-center space-y-1.5">
          <div className="w-9 h-9 rounded-full bg-[#F7F3EE] text-[#640D22] mx-auto inline-flex items-center justify-center">
            <Truck className="w-4 h-4" />
          </div>
          <div className="text-[13px] font-bold text-[#3D040E]">Chưa có đơn điều phối</div>
          <p className="text-[11px] text-[#6E5B5D]">
            Giữ FEFO ở Bán hàng để đẩy đơn sang hàng đợi giao nhận.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {dispatchableOrders.map((order, idx) => {
            const isDelivered = order.status === 'Đã giao';
            return (
              <motion.article
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: idx * 0.04, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-2xl bg-[#FFFFFF]/95 backdrop-blur-sm border border-[#EAE2D9] p-3.5 space-y-2.5 shadow-[0_2px_6px_rgba(61,4,14,0.04)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[13px] font-bold text-[#3D040E]">
                        {order.id}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                          isDelivered
                            ? 'bg-[#E6F7F0] border-[#A7E3CA] text-[#0D7A52]'
                            : 'bg-[#FEF5D9] border-[#F3D88C] text-[#9A6700]'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <div className="text-[12.5px] font-semibold text-[#3D040E] mt-0.5 truncate">
                      {order.customerName}
                    </div>
                    <div className="text-[10.5px] text-[#6E5B5D]">
                      {order.warehouseCode} · Hẹn {order.scheduledDeliveryLabel}
                    </div>
                  </div>

                  <div className="font-mono text-[12.5px] font-bold text-[#3D040E] tabular-nums shrink-0">
                    {formatVnd(getOrderTotalVnd(order))}
                  </div>
                </div>

                {/* Chevron Waypoint Strip */}
                <div className="grid grid-cols-4 gap-1">
                  {order.dispatchWaypoints.map((wp, idx) => {
                    const isFirst = idx === 0;
                    const isLast = idx === order.dispatchWaypoints.length - 1;
                    const clipPath = isFirst
                      ? 'polygon(0 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 0 100%)'
                      : isLast
                      ? 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 8px 50%)'
                      : 'polygon(0 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 0 100%, 8px 50%)';

                    const tone =
                      wp.status === 'cleared'
                        ? 'bg-[#640D22] text-[#FFFFFF]'
                        : wp.status === 'active'
                        ? 'bg-[#B45309] text-[#FFFFFF]'
                        : 'bg-[#EFE8E0] text-[#6E5B5D]';

                    return (
                      <div
                        key={wp.id}
                        style={{ clipPath }}
                        className={`${tone} h-6 px-2 flex items-center justify-center font-mono text-[9.5px] font-bold tracking-tight`}
                        title={wp.label}
                      >
                        {wp.code}
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-1 text-[10.5px] text-[#6E5B5D]">
                  {order.dispatchWaypoints
                    .filter((w) => w.status !== 'pending')
                    .map((w) => (
                      <div key={w.id} className="flex items-center justify-between">
                        <span>
                          {w.status === 'cleared' ? '✓' : '•'} {w.label}
                        </span>
                        <span className="font-mono tabular-nums">
                          {formatShortTime(w.timestampIso)}
                        </span>
                      </div>
                    ))}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setBarcodeOrder(order)}
                    className="min-h-[38px] rounded-xl border border-[#DDD3C8] bg-[#FDFBF7] text-[#3D040E] text-[11.5px] font-bold inline-flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Mã vạch</span>
                  </button>

                  {!isDelivered && (
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      disabled={busyId === order.id}
                      onClick={() => handleAdvance(order.id)}
                      className="min-h-[38px] rounded-xl bg-[#640D22] text-[#FFFFFF] text-[11.5px] font-bold inline-flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
                    >
                      <span>{busyId === order.id ? 'Đang xử lý...' : 'Chặng tiếp'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </motion.button>
                  )}
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      <BarcodeLabelSheet order={barcodeOrder} onClose={() => setBarcodeOrder(null)} />
    </div>
  );
}

function BarcodeLabelSheet({
  order,
  onClose,
}: {
  order: SalesOrder | null;
  onClose: () => void;
}) {
  const barcode = useMemo(() => (order ? encodeCode128B(order.id) : null), [order]);
  const matrix = useMemo(
    () => (order ? generateMatrixGrid(`${order.id}|${order.warehouseCode}|${order.customerName}`) : []),
    [order]
  );

  if (!order || !barcode) return null;
  const quietZone = 8;
  const svgWidth = barcode.totalWidth + quietZone * 2;

  return (
    <BottomSheet
      isOpen={Boolean(order)}
      title={`Phiếu mã vạch xuất kho · ${order.id}`}
      subtitle={order.customerName}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="p-3.5 rounded-2xl border border-[#E5DBD0] bg-[#FFFFFF] space-y-3">
          <svg
            viewBox={`0 0 ${svgWidth} 48`}
            className="w-full h-12"
            shapeRendering="crispEdges"
            role="img"
            aria-label={`Mã vạch Code 128 cho đơn ${order.id}`}
          >
            <rect x="0" y="0" width={svgWidth} height="48" fill="#FFFFFF" />
            {barcode.bars.map((bar, i) => (
              <rect key={i} x={bar.x + quietZone} y="3" width={bar.width} height="42" fill="#3D040E" />
            ))}
          </svg>
          <div className="flex items-center justify-between font-mono text-[12px] font-bold text-[#3D040E]">
            <span>{order.id}</span>
            <span className="text-[#6E5B5D]">{order.warehouseCode}</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl border border-[#E5DBD0] bg-[#F7F3EE] flex items-center gap-3.5">
          <svg
            viewBox={`0 0 ${matrix.length} ${matrix.length}`}
            className="w-20 h-20 bg-[#FFFFFF] p-1 rounded-lg border border-[#E5DBD0] shrink-0"
            shapeRendering="crispEdges"
          >
            <rect x="0" y="0" width={matrix.length} height={matrix.length} fill="#FFFFFF" />
            {matrix.map((row, r) =>
              row.map((on, c) =>
                on ? <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill="#3D040E" /> : null
              )
            )}
          </svg>
          <div className="text-[12px] space-y-1 text-[#3D040E]">
            <div className="font-bold">Lô FEFO đã cấp:</div>
            {order.items.map((item) => (
              <div key={item.sku} className="font-mono text-[11px] text-[#5C4B4C]">
                {item.sku} · {item.allocatedLotId ?? 'FEFO'} ({item.requestedQty} {item.unitLabel})
              </div>
            ))}
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
