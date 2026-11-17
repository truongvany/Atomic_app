import { useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Package,
  ShieldCheck,
  Truck,
  X,
} from 'lucide-react';
import type {
  AdminTabId,
  ApprovalRequest,
  FefoLot,
  PurchaseOrder,
  SalesOrder,
} from '../types/logistics';
import {
  formatShortTime,
  formatVnd,
  getEarliestLotSummary,
  getOrderTotalVnd,
} from '../utils/formatVnd';

interface AdminOverviewTabProps {
  salesOrders: SalesOrder[];
  lots: FefoLot[];
  purchaseOrders: PurchaseOrder[];
  approvals: ApprovalRequest[];
  onNavigateTab: (tab: AdminTabId) => void;
  onInspectOrder: (orderId: string) => void;
  onReserveFefo: (orderId: string) => Promise<void>;
  onDecideApproval: (approvalId: string, decision: 'Đã duyệt' | 'Từ chối') => Promise<void>;
  onAdjustLot: (lotId: string, deltaQualified: number) => Promise<void>;
  onAdvanceDispatch: (orderId: string) => Promise<void>;
}

const ORDER_STATUS_STYLE: Record<SalesOrder['status'], string> = {
  Nháp: 'bg-[#EFE8DF] text-[#5C4B4C] border-[#DDD3C8]',
  'Chờ duyệt': 'bg-[#FEF5D9] text-[#9A6700] border-[#F3D88C]',
  'Đã giữ FEFO': 'bg-[#E6F7F0] text-[#0D7A52] border-[#A7E3CA]',
  'Đang giao': 'bg-[#E6F7F0] text-[#0D7A52] border-[#A7E3CA]',
  'Đã giao': 'bg-[#E6F7F0] text-[#0D7A52] border-[#A7E3CA]',
  'Đã hủy': 'bg-[#FFF0F2] text-[#991B1B] border-[#F5C6CE]',
};

export function AdminOverviewTab({
  salesOrders,
  lots,
  purchaseOrders,
  approvals,
  onNavigateTab,
  onInspectOrder,
  onReserveFefo,
  onDecideApproval,
  onAdjustLot,
  onAdvanceDispatch,
}: AdminOverviewTabProps) {
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const pendingApprovals = approvals.filter((a) => a.status === 'Chờ duyệt');
  const activeOrders = salesOrders.filter((o) => o.status !== 'Đã hủy');
  const totalOrderValue = activeOrders.reduce((sum, o) => sum + getOrderTotalVnd(o), 0);

  const orderShortages = salesOrders.map((order) => {
    const shortLines = order.items.filter((item) => {
      const { available } = getEarliestLotSummary(lots, item.sku);
      return available < item.requestedQty;
    });
    return {
      orderId: order.id,
      hasShortage:
        shortLines.length > 0 &&
        order.status !== 'Đã giữ FEFO' &&
        order.status !== 'Đang giao' &&
        order.status !== 'Đã giao' &&
        order.status !== 'Đã hủy',
      shortCount: shortLines.length,
    };
  });

  const shortOrderCount = orderShortages.filter((s) => s.hasShortage).length;
  const sortedLots = [...lots].sort((a, b) => a.expirySortKey.localeCompare(b.expirySortKey));
  const lowLots = sortedLots.filter((l) => Math.max(0, l.qualifiedQty - l.reservedQty) <= 85);

  const dispatchOrders = salesOrders.filter(
    (o) => o.status === 'Đã giữ FEFO' || o.status === 'Đang giao' || o.status === 'Đã giao'
  );
  const inTransitCount = dispatchOrders.filter((o) => o.status !== 'Đã giao').length;
  const deliveredCount = dispatchOrders.filter((o) => o.status === 'Đã giao').length;
  const pendingPoCount = purchaseOrders.filter((p) => p.status !== 'Đã nhập kho').length;

  const runBusy = async (key: string, fn: () => Promise<void>) => {
    setBusyKey(key);
    try {
      await fn();
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="space-y-4 pb-4">
      {/* 4 Executive KPI Cards */}
      <section aria-label="Chỉ số tổng quan Admin" className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-[#FFFFFF]/95 border border-[#EAE2D9] p-3.5 shadow-[0_1px_4px_rgba(61,4,14,0.04)]">
          <div className="text-[11px] font-semibold text-[#6E5B5D]">Tổng giá trị đơn</div>
          <div className="font-mono text-[18px] sm:text-[20px] font-bold text-[#3D040E] mt-1 tabular-nums truncate">
            {formatVnd(totalOrderValue)}
          </div>
          <div className="text-[11px] text-[#7D6C6E] mt-1 font-mono tabular-nums">
            {activeOrders.length} đơn hiệu lực · {pendingPoCount} PO chờ
          </div>
        </div>

        <div className="rounded-2xl bg-[#FFFFFF]/95 border border-[#EAE2D9] p-3.5 shadow-[0_1px_4px_rgba(61,4,14,0.04)]">
          <div className="text-[11px] font-semibold text-[#6E5B5D]">Chờ phê duyệt</div>
          <div className="font-mono text-[18px] sm:text-[20px] font-bold text-[#640D22] mt-1 tabular-nums">
            {pendingApprovals.length}
          </div>
          <div className="text-[11px] text-[#7D6C6E] mt-1">
            {pendingApprovals.length > 0 ? 'Cần Admin xử lý ngay' : 'Không có đơn tồn đọng'}
          </div>
        </div>

        <div className="rounded-2xl bg-[#FFFFFF]/95 border border-[#EAE2D9] p-3.5 shadow-[0_1px_4px_rgba(61,4,14,0.04)]">
          <div className="text-[11px] font-semibold text-[#6E5B5D]">Cảnh báo FEFO</div>
          <div className="font-mono text-[18px] sm:text-[20px] font-bold text-[#B45309] mt-1 tabular-nums">
            {shortOrderCount + lowLots.length}
          </div>
          <div className="text-[11px] text-[#7D6C6E] mt-1">
            {shortOrderCount} đơn thiếu · {lowLots.length} lô thấp
          </div>
        </div>

        <div className="rounded-2xl bg-[#FFFFFF]/95 border border-[#EAE2D9] p-3.5 shadow-[0_1px_4px_rgba(61,4,14,0.04)]">
          <div className="text-[11px] font-semibold text-[#6E5B5D]">Điều phối giao nhận</div>
          <div className="font-mono text-[18px] sm:text-[20px] font-bold text-[#0D7A52] mt-1 tabular-nums">
            {inTransitCount}
          </div>
          <div className="text-[11px] text-[#7D6C6E] mt-1">
            Đang chạy · {deliveredCount} đã giao
          </div>
        </div>
      </section>

      {/* Main 2-Column Admin Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* Left/Main Column: Approvals Queue + Sales Orders Watchlist */}
        <div className="xl:col-span-7 space-y-4">
          {/* Approval Queue */}
          <section className="rounded-2xl bg-[#FFFFFF]/95 border border-[#EAE2D9] overflow-hidden shadow-[0_2px_8px_rgba(61,4,14,0.04)]">
            <div className="px-4 py-3 border-b border-[#F2ECE5] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#640D22]" />
                <h2 className="text-[13px] font-bold text-[#3D040E]">Hàng đợi phê duyệt Admin</h2>
              </div>
              <span className="text-[11px] font-mono text-[#7D6C6E] tabular-nums">
                {pendingApprovals.length} chờ duyệt
              </span>
            </div>

            {approvals.length === 0 ? (
              <div className="p-5 text-center space-y-1.5">
                <div className="w-9 h-9 rounded-full bg-[#F7F3EE] text-[#0D7A52] mx-auto inline-flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="text-[13px] font-bold text-[#3D040E]">
                  Chưa có yêu cầu cần phê duyệt
                </div>
                <p className="text-[11.5px] text-[#6E5B5D] max-w-md mx-auto">
                  Khi có đề xuất tách giao thiếu hàng hoặc yêu cầu dừng/hủy quyết toán, Admin có thể
                  duyệt trực tiếp tại đây.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#F2ECE5]">
                {approvals.map((apr) => {
                  const isPending = apr.status === 'Chờ duyệt';
                  const isBusy = busyKey === apr.id;
                  return (
                    <div key={apr.id} className="p-3.5 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="font-mono font-bold text-[#640D22]">{apr.orderId}</span>
                            <span className="text-[#9E8E90]">·</span>
                            <span className="font-mono text-[#7D6C6E]">{apr.id}</span>
                            <span className="text-[#9E8E90]">·</span>
                            <span className="font-mono text-[#7D6C6E] tabular-nums">
                              {formatShortTime(apr.createdAtIso)}
                            </span>
                          </div>
                          <div className="text-[13px] font-bold text-[#3D040E] mt-0.5">
                            {apr.type}
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full border text-[10px] font-bold whitespace-nowrap ${
                            apr.status === 'Đã duyệt'
                              ? 'bg-[#E6F7F0] border-[#A7E3CA] text-[#0D7A52]'
                              : apr.status === 'Từ chối'
                              ? 'bg-[#FFF0F2] border-[#F5C6CE] text-[#991B1B]'
                              : 'bg-[#FEF5D9] border-[#F3D88C] text-[#9A6700]'
                          }`}
                        >
                          {apr.status}
                        </span>
                      </div>

                      <p className="text-[11.5px] text-[#5C4B4C] bg-[#FAF6F2] rounded-xl px-3 py-2">
                        {apr.reason}
                      </p>

                      {isPending && (
                        <div className="flex items-center justify-end gap-2 pt-0.5">
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.96 }}
                            disabled={isBusy}
                            onClick={() => runBusy(apr.id, () => onDecideApproval(apr.id, 'Từ chối'))}
                            className="h-8 px-3 rounded-lg border border-[#F5C6CE] bg-[#FFF0F2] text-[#991B1B] text-[11.5px] font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Từ chối</span>
                          </motion.button>
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.96 }}
                            disabled={isBusy}
                            onClick={() => runBusy(apr.id, () => onDecideApproval(apr.id, 'Đã duyệt'))}
                            className="h-8 px-3 rounded-lg bg-[#640D22] text-[#FFFFFF] text-[11.5px] font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Phê duyệt</span>
                          </motion.button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Orders Overview Table (Desktop) & Cards (Mobile) */}
          <section className="rounded-2xl bg-[#FFFFFF]/95 border border-[#EAE2D9] overflow-hidden shadow-[0_2px_8px_rgba(61,4,14,0.04)]">
            <div className="px-4 py-3 border-b border-[#F2ECE5] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-[#640D22]" />
                <h2 className="text-[13px] font-bold text-[#3D040E]">Đơn hàng &amp; Trạng thái FEFO</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('sales')}
                className="text-[11.5px] font-semibold text-[#640D22] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Mở quản lý đơn</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {salesOrders.length === 0 ? (
              <div className="p-5 text-center text-[12px] text-[#6E5B5D]">
                Chưa có đơn hàng nào thuộc bộ lọc kho hiện tại.
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#F2ECE5] bg-[#FAF6F2]/80 text-[10.5px] font-semibold text-[#7D6C6E]">
                        <th className="py-2.5 px-4">Mã đơn</th>
                        <th className="py-2.5 px-3">Khách hàng</th>
                        <th className="py-2.5 px-3">Trạng thái</th>
                        <th className="py-2.5 px-3 text-right">Giá trị</th>
                        <th className="py-2.5 px-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F2ECE5] text-[12px]">
                      {salesOrders.map((order) => {
                        const shortInfo = orderShortages.find((s) => s.orderId === order.id);
                        const canQuickReserve =
                          (order.status === 'Nháp' || order.status === 'Chờ duyệt') &&
                          !shortInfo?.hasShortage;

                        return (
                          <tr
                            key={order.id}
                            className="hover:bg-[#FAF6F2]/70 transition-colors"
                          >
                            <td className="py-2.5 px-4 font-mono font-bold text-[#3D040E] whitespace-nowrap">
                              <div>{order.id}</div>
                              <div className="text-[10px] font-normal text-[#7D6C6E]">
                                {order.warehouseCode} · {order.scheduledDeliveryLabel}
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-[#3D040E] truncate max-w-[200px]">
                                {order.customerName}
                              </div>
                              {shortInfo?.hasShortage && (
                                <div className="inline-flex items-center gap-1 text-[10.5px] text-[#9A6700] font-medium mt-0.5">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>Thiếu {shortInfo.shortCount} dòng FEFO</span>
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-full border text-[10.5px] font-semibold ${
                                  ORDER_STATUS_STYLE[order.status]
                                }`}
                              >
                                {order.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-[#3D040E] tabular-nums whitespace-nowrap">
                              {formatVnd(getOrderTotalVnd(order))}
                            </td>
                            <td className="py-2.5 px-4 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                {canQuickReserve && (
                                  <button
                                    type="button"
                                    disabled={busyKey === `res-${order.id}`}
                                    onClick={() =>
                                      runBusy(`res-${order.id}`, () => onReserveFefo(order.id))
                                    }
                                    className="h-7 px-2.5 rounded-lg bg-[#640D22] text-[#FFFFFF] text-[11px] font-bold cursor-pointer disabled:opacity-50"
                                  >
                                    Giữ FEFO
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => onInspectOrder(order.id)}
                                  className="h-7 px-2.5 rounded-lg border border-[#DDD3C8] bg-[#FFFFFF] text-[#3D040E] text-[11px] font-semibold hover:bg-[#F7F3EE] cursor-pointer"
                                >
                                  {shortInfo?.hasShortage ? 'Xử lý' : 'Chi tiết'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Compact Order List */}
                <div className="md:hidden divide-y divide-[#F2ECE5]">
                  {salesOrders.map((order) => {
                    const shortInfo = orderShortages.find((s) => s.orderId === order.id);
                    return (
                      <div key={order.id} className="p-3.5 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[12.5px] font-bold text-[#3D040E]">
                                {order.id}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${
                                  ORDER_STATUS_STYLE[order.status]
                                }`}
                              >
                                {order.status}
                              </span>
                            </div>
                            <div className="text-[12px] font-semibold text-[#3D040E] truncate mt-0.5">
                              {order.customerName}
                            </div>
                            <div className="text-[10.5px] text-[#7D6C6E]">
                              {order.warehouseCode} · {order.scheduledDeliveryLabel}
                            </div>
                          </div>
                          <div className="font-mono text-[12.5px] font-bold text-[#3D040E] tabular-nums shrink-0">
                            {formatVnd(getOrderTotalVnd(order))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          {shortInfo?.hasShortage ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#9A6700]">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Thiếu {shortInfo.shortCount} dòng FEFO
                            </span>
                          ) : (
                            <span className="text-[11px] text-[#0D7A52] font-medium">
                              FEFO sẵn sàng
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => onInspectOrder(order.id)}
                            className="h-7 px-3 rounded-lg bg-[#640D22] text-[#FFFFFF] text-[11px] font-bold cursor-pointer"
                          >
                            {shortInfo?.hasShortage ? 'Xử lý thiếu' : 'Chi tiết'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        </div>

        {/* Right/Secondary Column: FEFO Inventory Pulse + Dispatch Tracking */}
        <div className="xl:col-span-5 space-y-4">
          {/* Priority FEFO Lots */}
          <section className="rounded-2xl bg-[#FFFFFF]/95 border border-[#EAE2D9] overflow-hidden shadow-[0_2px_8px_rgba(61,4,14,0.04)]">
            <div className="px-4 py-3 border-b border-[#F2ECE5] flex items-center justify-between gap-2">
              <h2 className="text-[13px] font-bold text-[#3D040E]">Kiểm soát tồn FEFO ưu tiên</h2>
              <button
                type="button"
                onClick={() => onNavigateTab('fefo')}
                className="text-[11.5px] font-semibold text-[#640D22] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Kho FEFO</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-[#F2ECE5]">
              {sortedLots.slice(0, 4).map((lot) => {
                const avail = Math.max(0, lot.qualifiedQty - lot.reservedQty);
                const pct =
                  lot.qualifiedQty > 0 ? Math.min(100, Math.round((avail / lot.qualifiedQty) * 100)) : 0;
                const isLow = avail <= 85;
                const isBusy = busyKey === `lot-${lot.lotId}`;

                return (
                  <div key={lot.lotId} className="p-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-[10.5px]">
                          <span className="font-mono font-bold text-[#640D22]">{lot.lotId}</span>
                          <span className="text-[#9E8E90]">·</span>
                          <span className="text-[#7D6C6E]">{lot.expiryLabel}</span>
                          <span className="text-[#9E8E90]">·</span>
                          <span className="text-[#7D6C6E]">{lot.warehouseCode}</span>
                        </div>
                        <div className="text-[12.5px] font-bold text-[#3D040E] truncate mt-0.5">
                          {lot.productName}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div
                          className={`font-mono text-[13px] font-bold tabular-nums ${
                            isLow ? 'text-[#C21842]' : 'text-[#0D7A52]'
                          }`}
                        >
                          {avail} {lot.unitLabel}
                        </div>
                        <div className="font-mono text-[10px] text-[#7D6C6E] tabular-nums">
                          Đủ ĐK {lot.qualifiedQty} · Giữ {lot.reservedQty}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="flex-1 h-1.5 rounded-full bg-[#EFE8E0] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            isLow ? 'bg-[#D97706]' : 'bg-[#0D7A52]'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={isBusy || avail < 10}
                          onClick={() => runBusy(`lot-${lot.lotId}`, () => onAdjustLot(lot.lotId, -10))}
                          className="h-6 px-2 rounded border border-[#E5DBD0] bg-[#FDFBF7] font-mono text-[10.5px] font-semibold text-[#3D040E] disabled:opacity-40 cursor-pointer"
                        >
                          -10
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => runBusy(`lot-${lot.lotId}`, () => onAdjustLot(lot.lotId, 10))}
                          className="h-6 px-2 rounded border border-[#E5DBD0] bg-[#FDFBF7] font-mono text-[10.5px] font-semibold text-[#3D040E] disabled:opacity-40 cursor-pointer"
                        >
                          +10
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Active Dispatch Progress */}
          <section className="rounded-2xl bg-[#FFFFFF]/95 border border-[#EAE2D9] overflow-hidden shadow-[0_2px_8px_rgba(61,4,14,0.04)]">
            <div className="px-4 py-3 border-b border-[#F2ECE5] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#640D22]" />
                <h2 className="text-[13px] font-bold text-[#3D040E]">Điều phối đang chạy</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('dispatch')}
                className="text-[11.5px] font-semibold text-[#640D22] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Điều phối</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {dispatchOrders.length === 0 ? (
              <div className="p-5 text-center text-[11.5px] text-[#6E5B5D]">
                Chưa có đơn đã khóa FEFO chờ điều phối.
              </div>
            ) : (
              <div className="divide-y divide-[#F2ECE5]">
                {dispatchOrders.map((order) => {
                  const isDelivered = order.status === 'Đã giao';
                  const activeWp = order.dispatchWaypoints.find((w) => w.status === 'active');
                  const isBusy = busyKey === `disp-${order.id}`;

                  return (
                    <div key={order.id} className="p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[12.5px] font-bold text-[#3D040E]">
                              {order.id}
                            </span>
                            <span className="text-[11px] text-[#7D6C6E] truncate">
                              {order.customerName}
                            </span>
                          </div>
                          <div className="text-[10.5px] text-[#6E5B5D] mt-0.5">
                            {activeWp
                              ? `Chặng hiện tại: ${activeWp.label}`
                              : isDelivered
                              ? 'Đã hoàn tất giao nhận POD'
                              : 'Chờ xuất kho'}
                          </div>
                        </div>

                        {!isDelivered && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              runBusy(`disp-${order.id}`, () => onAdvanceDispatch(order.id))
                            }
                            className="h-7 px-2.5 rounded-lg bg-[#640D22] text-[#FFFFFF] text-[11px] font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-50"
                          >
                            <span>Chặng tiếp</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-4 gap-1">
                        {order.dispatchWaypoints.map((wp, idx) => {
                          const isFirst = idx === 0;
                          const isLast = idx === order.dispatchWaypoints.length - 1;
                          const clipPath = isFirst
                            ? 'polygon(0 0, calc(100% - 7px) 0, 100% 50%, calc(100% - 7px) 100%, 0 100%)'
                            : isLast
                            ? 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 7px 50%)'
                            : 'polygon(0 0, calc(100% - 7px) 0, 100% 50%, calc(100% - 7px) 100%, 0 100%, 7px 50%)';
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
                              className={`${tone} h-6 px-1.5 flex items-center justify-center font-mono text-[9.5px] font-bold`}
                              title={wp.label}
                            >
                              {wp.code}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
