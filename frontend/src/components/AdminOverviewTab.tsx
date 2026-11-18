import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  FileText,
  Layers,
  Package,
  RotateCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Truck,
  Warehouse,
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

const ORDER_STATUS_STYLE: Record<SalesOrder['status'], { bg: string; text: string; border: string; dot: string }> = {
  Nháp: { bg: 'bg-[#F4EFEB]', text: 'text-[#6E5B5D]', border: 'border-[#DDD4CB]', dot: 'bg-[#A89899]' },
  'Chờ duyệt': { bg: 'bg-[#FEF6E0]', text: 'text-[#9A6700]', border: 'border-[#F6DFA2]', dot: 'bg-[#E5A100]' },
  'Đã giữ FEFO': { bg: 'bg-[#E8F8F1]', text: 'text-[#0D7A52]', border: 'border-[#AEE5CE]', dot: 'bg-[#10B981]' },
  'Đang giao': { bg: 'bg-[#EBF4FE]', text: 'text-[#1D68BD]', border: 'border-[#BCD7F9]', dot: 'bg-[#3B82F6]' },
  'Đã giao': { bg: 'bg-[#E6F7F0]', text: 'text-[#0B6B5B]', border: 'border-[#A3E3CC]', dot: 'bg-[#059669]' },
  'Đã hủy': { bg: 'bg-[#FFF0F2]', text: 'text-[#991B1B]', border: 'border-[#F8CCD3]', dot: 'bg-[#EF4444]' },
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

  // Core metrics calculation
  const pendingApprovals = approvals.filter((a) => a.status === 'Chờ duyệt');
  const activeOrders = salesOrders.filter((o) => o.status !== 'Đã hủy');
  const totalOrderValue = activeOrders.reduce((sum, o) => sum + getOrderTotalVnd(o), 0);

  // Shortage mapping per order
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
    <div className="space-y-4 pb-6">
      {/* 4 Modern Executive KPI Cards */}
      <section aria-label="Chỉ số điều hành chuỗi cung ứng" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {/* KPI 1: Total Revenue Value */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
          className="relative rounded-2xl bg-white/95 border border-[#E8DFD5] p-4 shadow-[0_4px_16px_-4px_rgba(61,4,14,0.06)] overflow-hidden"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] font-semibold text-[#6E5B5D]">Tổng giá trị đơn hàng</span>
            <div className="w-8 h-8 rounded-xl bg-[#E8F8F1] text-[#0B6B5B] flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-[22px] sm:text-[24px] font-extrabold text-[#3D040E] mt-2 tabular-nums tracking-tight">
            {formatVnd(totalOrderValue)}
          </div>
          <div className="flex items-center gap-2 mt-2 text-[11.5px] text-[#7D6C6E]">
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-[#E8F8F1] text-[#0D7A52] font-semibold text-[10.5px]">
              <ArrowUpRight className="w-3 h-3" />
              <span>{activeOrders.length} đơn</span>
            </span>
            <span>· {pendingPoCount} phiếu mua bù</span>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#0B6B5B]/10 to-transparent pointer-events-none rounded-bl-full" />
        </motion.div>

        {/* KPI 2: Approvals Queue */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
          className={`relative rounded-2xl border p-4 shadow-[0_4px_16px_-4px_rgba(61,4,14,0.06)] overflow-hidden transition-colors ${
            pendingApprovals.length > 0
              ? 'bg-gradient-to-br from-[#FFF9FA] to-[#FFF0F2] border-[#F6CCD3]'
              : 'bg-white/95 border-[#E8DFD5]'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] font-semibold text-[#6E5B5D]">Chờ phê duyệt Admin</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              pendingApprovals.length > 0 ? 'bg-[#FFF0F2] text-[#991B1B]' : 'bg-[#F2ECE5] text-[#5C4B4C]'
            }`}>
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className={`font-mono text-[24px] font-extrabold tabular-nums tracking-tight ${
              pendingApprovals.length > 0 ? 'text-[#991B1B]' : 'text-[#3D040E]'
            }`}>
              {pendingApprovals.length}
            </span>
            <span className="text-[12px] text-[#7D6C6E]">yêu cầu</span>
          </div>
          <div className="mt-2 text-[11.5px]">
            {pendingApprovals.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-[#991B1B] font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#EF4444] animate-pulse" />
                Cần Admin phê duyệt ngay
              </span>
            ) : (
              <span className="text-[#0D7A52] font-medium inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Không có đơn tồn đọng
              </span>
            )}
          </div>
        </motion.div>

        {/* KPI 3: FEFO Risk & Shortage */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
          className={`relative rounded-2xl border p-4 shadow-[0_4px_16px_-4px_rgba(61,4,14,0.06)] overflow-hidden transition-colors ${
            shortOrderCount > 0
              ? 'bg-gradient-to-br from-[#FFFCF5] to-[#FEF5D9] border-[#F6DFA2]'
              : 'bg-white/95 border-[#E8DFD5]'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] font-semibold text-[#6E5B5D]">Cảnh báo tồn kho FEFO</span>
            <div className="w-8 h-8 rounded-xl bg-[#FEF5D9] text-[#B45309] flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-mono text-[24px] font-extrabold text-[#B45309] tabular-nums tracking-tight">
              {shortOrderCount + lowLots.length}
            </span>
            <span className="text-[12px] text-[#7D6C6E]">điểm lưu ý</span>
          </div>
          <div className="mt-2 text-[11.5px] text-[#7D6C6E] flex items-center gap-1.5">
            <span className="font-semibold text-[#B45309]">{shortOrderCount} đơn thiếu</span>
            <span>·</span>
            <span className="font-semibold text-[#7D6C6E]">{lowLots.length} lô cận date/thấp</span>
          </div>
        </motion.div>

        {/* KPI 4: Dispatch In-Transit */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
          className="relative rounded-2xl bg-white/95 border border-[#E8DFD5] p-4 shadow-[0_4px_16px_-4px_rgba(61,4,14,0.06)] overflow-hidden"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] font-semibold text-[#6E5B5D]">Điều phối giao nhận</span>
            <div className="w-8 h-8 rounded-xl bg-[#EBF4FE] text-[#1D68BD] flex items-center justify-center shrink-0">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-mono text-[24px] font-extrabold text-[#1D68BD] tabular-nums tracking-tight">
              {inTransitCount}
            </span>
            <span className="text-[12px] text-[#7D6C6E]">đơn đang giao</span>
          </div>
          <div className="mt-2 text-[11.5px] text-[#7D6C6E] flex items-center gap-1.5">
            <span className="text-[#0D7A52] font-semibold">{deliveredCount} hoàn tất</span>
            <span>·</span>
            <span>{dispatchOrders.length} tổng điều phối</span>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#1D68BD]/10 to-transparent pointer-events-none rounded-bl-full" />
        </motion.div>
      </section>

      {/* Main 2-Column Responsive Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* Left Column (7 cols): Approvals Queue + Sales Orders Watchlist */}
        <div className="xl:col-span-7 space-y-4">
          {/* Section: Pending Approvals Action Card */}
          <section className="rounded-2xl bg-white/95 border border-[#E8DFD5] overflow-hidden shadow-[0_2px_12px_rgba(61,4,14,0.04)]">
            <div className="px-4 py-3 bg-[#FAF6F2] border-b border-[#F0EAE3] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#640D22] text-white flex items-center justify-center">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-[13px] font-bold text-[#3D040E]">Hàng đợi Phê duyệt Khẩn cấp</h2>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-white border border-[#E6DDD3] text-[11px] font-mono font-bold text-[#640D22] tabular-nums">
                {pendingApprovals.length} chờ duyệt
              </span>
            </div>

            {approvals.length === 0 ? (
              <div className="p-6 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-[#E8F8F1] text-[#0B6B5B] mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="text-[13.5px] font-bold text-[#3D040E]">
                  Tất cả yêu cầu đã được xử lý
                </div>
                <p className="text-[12px] text-[#6E5B5D] max-w-md mx-auto">
                  Khi nhân viên kho hoặc kinh doanh gửi đề xuất tách giao, hủy đơn hoặc điều chỉnh hạn ngạch, yêu cầu sẽ lập tức xuất hiện tại đây.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#F0EAE3]">
                {approvals.map((apr) => {
                  const isPending = apr.status === 'Chờ duyệt';
                  const isBusy = busyKey === apr.id;
                  return (
                    <motion.div
                      key={apr.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 space-y-2.5 transition-colors ${isPending ? 'bg-[#FFFDFB]' : 'bg-white'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="font-mono font-bold text-[#640D22] bg-[#FAF2F4] px-1.5 py-0.5 rounded">
                              {apr.orderId}
                            </span>
                            <span className="text-[#A89899]">·</span>
                            <span className="font-mono text-[#7D6C6E]">{apr.id}</span>
                            <span className="text-[#A89899]">·</span>
                            <span className="font-mono text-[#7D6C6E] inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatShortTime(apr.createdAtIso)}
                            </span>
                          </div>
                          <h3 className="text-[13.5px] font-bold text-[#3D040E] mt-1">
                            {apr.type}
                          </h3>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-full border text-[10.5px] font-bold whitespace-nowrap ${
                            apr.status === 'Đã duyệt'
                              ? 'bg-[#E8F8F1] border-[#AEE5CE] text-[#0D7A52]'
                              : apr.status === 'Từ chối'
                              ? 'bg-[#FFF0F2] border-[#F8CCD3] text-[#991B1B]'
                              : 'bg-[#FEF6E0] border-[#F6DFA2] text-[#9A6700]'
                          }`}
                        >
                          {apr.status}
                        </span>
                      </div>

                      <div className="text-[12px] text-[#4F3E40] bg-[#FAF6F2] rounded-xl px-3 py-2 border border-[#EDE5DC] leading-relaxed">
                        <span className="font-semibold text-[#3D040E]">Lý do: </span>
                        {apr.reason}
                      </div>

                      {isPending && (
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.95 }}
                            disabled={isBusy}
                            onClick={() => runBusy(apr.id, () => onDecideApproval(apr.id, 'Từ chối'))}
                            className="h-8 px-3 rounded-xl border border-[#F8CCD3] bg-white hover:bg-[#FFF0F2] text-[#991B1B] text-[11.5px] font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Từ chối</span>
                          </motion.button>
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.95 }}
                            disabled={isBusy}
                            onClick={() => runBusy(apr.id, () => onDecideApproval(apr.id, 'Đã duyệt'))}
                            className="h-8 px-3.5 rounded-xl bg-[#640D22] hover:bg-[#4E0A1A] text-white text-[11.5px] font-bold inline-flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                          >
                            {isBusy ? (
                              <RotateCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            <span>Phê duyệt</span>
                          </motion.button>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Section: Sales Orders & FEFO Availability Table */}
          <section className="rounded-2xl bg-white/95 border border-[#E8DFD5] overflow-hidden shadow-[0_2px_12px_rgba(61,4,14,0.04)]">
            <div className="px-4 py-3 bg-[#FAF6F2] border-b border-[#F0EAE3] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#0B6B5B] text-white flex items-center justify-center">
                  <Package className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-[13px] font-bold text-[#3D040E]">Đơn bán hàng &amp; Trạng thái FEFO</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('sales')}
                className="text-[11.5px] font-bold text-[#640D22] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Xem tất cả</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {salesOrders.length === 0 ? (
              <div className="p-6 text-center text-[12.5px] text-[#6E5B5D]">
                Chưa có đơn hàng nào trong phạm vi kho đã chọn.
              </div>
            ) : (
              <>
                {/* Desktop View Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#F0EAE3] bg-[#FAF7F4] text-[11px] font-semibold text-[#7D6C6E]">
                        <th className="py-2.5 px-4">Mã đơn</th>
                        <th className="py-2.5 px-3">Khách hàng</th>
                        <th className="py-2.5 px-3">Trạng thái</th>
                        <th className="py-2.5 px-3 text-right">Tổng tiền</th>
                        <th className="py-2.5 px-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0EAE3] text-[12px]">
                      {salesOrders.map((order) => {
                        const shortInfo = orderShortages.find((s) => s.orderId === order.id);
                        const canQuickReserve =
                          (order.status === 'Nháp' || order.status === 'Chờ duyệt') &&
                          !shortInfo?.hasShortage;
                        const statusStyle = ORDER_STATUS_STYLE[order.status] ?? ORDER_STATUS_STYLE['Nháp'];

                        return (
                          <tr key={order.id} className="hover:bg-[#FAF6F2]/80 transition-colors">
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="font-mono font-bold text-[#3D040E]">{order.id}</div>
                              <div className="text-[10.5px] text-[#7D6C6E] mt-0.5">
                                <span className="font-medium text-[#640D22]">{order.warehouseCode}</span> · {order.scheduledDeliveryLabel}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-semibold text-[#3D040E] truncate max-w-[210px]">
                                {order.customerName}
                              </div>
                              {shortInfo?.hasShortage ? (
                                <div className="inline-flex items-center gap-1 text-[11px] text-[#B45309] font-semibold mt-0.5">
                                  <AlertTriangle className="w-3 h-3 shrink-0" />
                                  <span>Thiếu {shortInfo.shortCount} dòng FEFO</span>
                                </div>
                              ) : (
                                <div className="text-[11px] text-[#0D7A52] font-medium mt-0.5">
                                  Lô hạn đủ điều kiện
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                                {order.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-[#3D040E] tabular-nums whitespace-nowrap">
                              {formatVnd(getOrderTotalVnd(order))}
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                {canQuickReserve && (
                                  <button
                                    type="button"
                                    disabled={busyKey === `res-${order.id}`}
                                    onClick={() =>
                                      runBusy(`res-${order.id}`, () => onReserveFefo(order.id))
                                    }
                                    className="h-7 px-2.5 rounded-lg bg-[#0B6B5B] hover:bg-[#085546] text-white text-[11px] font-bold shadow-xs cursor-pointer disabled:opacity-50"
                                  >
                                    Giữ FEFO
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => onInspectOrder(order.id)}
                                  className="h-7 px-2.5 rounded-lg border border-[#DDD3C8] bg-white hover:bg-[#FAF6F2] text-[#3D040E] text-[11px] font-semibold cursor-pointer shadow-2xs"
                                >
                                  {shortInfo?.hasShortage ? 'Xử lý thiếu' : 'Chi tiết'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View Cards */}
                <div className="md:hidden divide-y divide-[#F0EAE3]">
                  {salesOrders.map((order) => {
                    const shortInfo = orderShortages.find((s) => s.orderId === order.id);
                    const statusStyle = ORDER_STATUS_STYLE[order.status] ?? ORDER_STATUS_STYLE['Nháp'];

                    return (
                      <div key={order.id} className="p-3.5 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[13px] font-bold text-[#3D040E]">
                                {order.id}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full border text-[10.5px] font-semibold ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                              >
                                {order.status}
                              </span>
                            </div>
                            <div className="text-[12.5px] font-semibold text-[#3D040E] mt-1">
                              {order.customerName}
                            </div>
                            <div className="text-[11px] text-[#7D6C6E]">
                              Kho {order.warehouseCode} · {order.scheduledDeliveryLabel}
                            </div>
                          </div>
                          <div className="font-mono text-[13.5px] font-extrabold text-[#3D040E] tabular-nums shrink-0">
                            {formatVnd(getOrderTotalVnd(order))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#F2ECE5]">
                          {shortInfo?.hasShortage ? (
                            <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#B45309]">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Thiếu {shortInfo.shortCount} dòng FEFO
                            </span>
                          ) : (
                            <span className="text-[11.5px] text-[#0D7A52] font-medium inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Khả dụng đầy đủ
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => onInspectOrder(order.id)}
                            className="h-7 px-3 rounded-lg bg-[#640D22] text-white text-[11px] font-bold cursor-pointer"
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

        {/* Right Column (5 cols): Priority FEFO Lots & Dispatch Stage Tracking */}
        <div className="xl:col-span-5 space-y-4">
          {/* Priority FEFO Inventory Pulse */}
          <section className="rounded-2xl bg-white/95 border border-[#E8DFD5] overflow-hidden shadow-[0_2px_12px_rgba(61,4,14,0.04)]">
            <div className="px-4 py-3 bg-[#FAF6F2] border-b border-[#F0EAE3] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#B45309] text-white flex items-center justify-center">
                  <Boxes className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-[13px] font-bold text-[#3D040E]">Kiểm soát Lô FEFO Ưu tiên</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('fefo')}
                className="text-[11.5px] font-bold text-[#640D22] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Kho FEFO</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-[#F0EAE3]">
              {sortedLots.slice(0, 5).map((lot) => {
                const avail = Math.max(0, lot.qualifiedQty - lot.reservedQty);
                const pct =
                  lot.qualifiedQty > 0 ? Math.min(100, Math.round((avail / lot.qualifiedQty) * 100)) : 0;
                const isLow = avail <= 85;
                const isBusy = busyKey === `lot-${lot.lotId}`;

                return (
                  <div key={lot.lotId} className="p-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span className="font-mono font-bold text-[#640D22] bg-[#FAF2F4] px-1.5 py-0.5 rounded">
                            {lot.lotId}
                          </span>
                          <span className="text-[#A89899]">·</span>
                          <span className="font-mono text-[#B45309] font-semibold">{lot.expiryLabel}</span>
                          <span className="text-[#A89899]">·</span>
                          <span className="text-[#7D6C6E]">Kho {lot.warehouseCode}</span>
                        </div>
                        <div className="text-[13px] font-bold text-[#3D040E] truncate mt-1">
                          {lot.productName}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div
                          className={`font-mono text-[13.5px] font-extrabold tabular-nums ${
                            isLow ? 'text-[#B45309]' : 'text-[#0D7A52]'
                          }`}
                        >
                          {avail} {lot.unitLabel}
                        </div>
                        <div className="font-mono text-[10.5px] text-[#7D6C6E] tabular-nums mt-0.5">
                          Đạt {lot.qualifiedQty} · Đã giữ {lot.reservedQty}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar & Quick Adjust Buttons */}
                    <div className="flex items-center gap-3 pt-1">
                      <div className="flex-1 h-2 rounded-full bg-[#EFE8E0] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isLow ? 'bg-[#D97706]' : 'bg-[#0B6B5B]'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.92 }}
                          disabled={isBusy || avail < 10}
                          onClick={() => runBusy(`lot-${lot.lotId}`, () => onAdjustLot(lot.lotId, -10))}
                          className="h-6 px-2 rounded-md border border-[#DDD3C8] bg-white hover:bg-[#FAF6F2] font-mono text-[11px] font-bold text-[#3D040E] disabled:opacity-40 cursor-pointer shadow-2xs"
                        >
                          -10
                        </motion.button>
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.92 }}
                          disabled={isBusy}
                          onClick={() => runBusy(`lot-${lot.lotId}`, () => onAdjustLot(lot.lotId, 10))}
                          className="h-6 px-2 rounded-md border border-[#DDD3C8] bg-white hover:bg-[#FAF6F2] font-mono text-[11px] font-bold text-[#3D040E] disabled:opacity-40 cursor-pointer shadow-2xs"
                        >
                          +10
                        </motion.button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Dispatch In-Transit Orders */}
          <section className="rounded-2xl bg-white/95 border border-[#E8DFD5] overflow-hidden shadow-[0_2px_12px_rgba(61,4,14,0.04)]">
            <div className="px-4 py-3 bg-[#FAF6F2] border-b border-[#F0EAE3] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#1D68BD] text-white flex items-center justify-center">
                  <Truck className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-[13px] font-bold text-[#3D040E]">Tiến độ Điều phối Chặng giao</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('dispatch')}
                className="text-[11.5px] font-bold text-[#640D22] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Xem điều phối</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {dispatchOrders.length === 0 ? (
              <div className="p-5 text-center text-[12px] text-[#6E5B5D]">
                Không có đơn hàng nào đang trong quá trình điều phối.
              </div>
            ) : (
              <div className="divide-y divide-[#F0EAE3]">
                {dispatchOrders.slice(0, 3).map((order) => {
                  const isDone = order.status === 'Đã giao';
                  const isBusy = busyKey === `dispatch-${order.id}`;

                  return (
                    <div key={order.id} className="p-3.5 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[12px] font-bold text-[#3D040E]">
                              {order.id}
                            </span>
                            <span className="text-[11px] text-[#7D6C6E] truncate max-w-[150px]">
                              {order.customerName}
                            </span>
                          </div>
                          <div className="text-[10.5px] text-[#7D6C6E] mt-0.5">
                            {order.warehouseCode} · {order.scheduledDeliveryLabel}
                          </div>
                        </div>

                        {!isDone && (
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.94 }}
                            disabled={isBusy}
                            onClick={() =>
                              runBusy(`dispatch-${order.id}`, () => onAdvanceDispatch(order.id))
                            }
                            className="h-7 px-2.5 rounded-lg bg-[#1D68BD] hover:bg-[#165094] text-white text-[11px] font-bold cursor-pointer disabled:opacity-50"
                          >
                            Cập nhật chặng
                          </motion.button>
                        )}
                      </div>

                      {/* Mini Stepper Timeline */}
                      <div className="flex items-center gap-2 pt-1 text-[11px]">
                        <div className="flex items-center gap-1 text-[#0D7A52] font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Xuất kho</span>
                        </div>
                        <div className="flex-1 h-0.5 bg-[#DDD4CB]" />
                        <div className={`flex items-center gap-1 font-semibold ${
                          order.status === 'Đang giao' || order.status === 'Đã giao'
                            ? 'text-[#1D68BD]'
                            : 'text-[#8E7E80]'
                        }`}>
                          <Truck className="w-3.5 h-3.5" />
                          <span>Vận chuyển</span>
                        </div>
                        <div className="flex-1 h-0.5 bg-[#DDD4CB]" />
                        <div className={`flex items-center gap-1 font-semibold ${
                          isDone ? 'text-[#0B6B5B]' : 'text-[#8E7E80]'
                        }`}>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Đã giao</span>
                        </div>
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
