import { useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, PackagePlus, Plus, ShoppingBag } from 'lucide-react';
import type { FefoLot, PurchaseOrder } from '../types/logistics';
import { formatShortTime, formatVnd } from '../utils/formatVnd';
import { BottomSheet } from './BottomSheet';

interface PurchasingTabProps {
  purchaseOrders: PurchaseOrder[];
  lots: FefoLot[];
  onReceivePo: (poId: string) => Promise<void>;
  onCreatePo: (payload: { sku: string; qty: number; supplierName: string }) => Promise<void>;
}

export function PurchasingTab({
  purchaseOrders,
  lots,
  onReceivePo,
  onCreatePo,
}: PurchasingTabProps) {
  const uniqueSkus = Array.from(new Map(lots.map((l) => [l.sku, l])).values());
  const [createOpen, setCreateOpen] = useState(false);
  const [sku, setSku] = useState(uniqueSkus[1]?.sku ?? uniqueSkus[0]?.sku ?? '');
  const [qty, setQty] = useState(40);
  const [supplierName, setSupplierName] = useState('NCC Tổng Miền Nam');
  const [busyId, setBusyId] = useState<string | null>(null);

  const pendingCount = purchaseOrders.filter((p) => p.status !== 'Đã nhập kho').length;

  const handleReceive = async (poId: string) => {
    setBusyId(poId);
    try {
      await onReceivePo(poId);
    } finally {
      setBusyId(null);
    }
  };

  const handleSubmitPo = async (e: FormEvent) => {
    e.preventDefault();
    setBusyId('new');
    try {
      await onCreatePo({ sku, qty, supplierName });
      setCreateOpen(false);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-2.5 pb-4">
      <div className="rounded-2xl bg-[#FFFFFF]/95 border border-[#EAE2D9] p-3.5 flex items-center justify-between gap-2.5 shadow-[0_1px_3px_rgba(61,4,14,0.04)]">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[#7D6C6E]">
            Mua bổ sung FEFO
          </div>
          <div className="text-[14px] font-bold text-[#3D040E] mt-0.5">
            {pendingCount} phiếu chờ nhập
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="min-h-[36px] px-3 rounded-xl bg-[#640D22] text-[#FFFFFF] text-[11.5px] font-bold inline-flex items-center gap-1 cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tạo phiếu</span>
        </button>
      </div>

      {purchaseOrders.length === 0 ? (
        <div className="rounded-2xl bg-[#FFFFFF]/95 border border-[#EAE2D9] p-5 text-center space-y-1.5">
          <div className="w-9 h-9 rounded-full bg-[#F7F3EE] text-[#640D22] mx-auto inline-flex items-center justify-center">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div className="text-[13px] font-bold text-[#3D040E]">Chưa có phiếu mua</div>
          <p className="text-[11px] text-[#6E5B5D]">
            Phiếu mua bù từ Bán hàng sẽ hiện tại đây để nhập vào lô FEFO.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {purchaseOrders.map((po, idx) => {
            const received = po.status === 'Đã nhập kho';
            return (
              <motion.article
                key={po.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: idx * 0.04, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-2xl bg-[#FFFFFF]/95 backdrop-blur-sm border border-[#EAE2D9] p-3.5 space-y-2.5 shadow-[0_2px_6px_rgba(61,4,14,0.04)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[12px] font-bold text-[#3D040E]">
                        {po.id}
                      </span>
                      {po.sourceOrderId && (
                        <span className="px-1.5 py-0.5 rounded-md bg-[#F7F3EE] border border-[#E5DBD0] font-mono text-[9.5px] text-[#640D22]">
                          Bù {po.sourceOrderId}
                        </span>
                      )}
                    </div>
                    <h3 className="text-[13px] font-bold text-[#3D040E] mt-1 leading-snug">
                      {po.productName}
                    </h3>
                    <div className="text-[11px] text-[#6E5B5D]">
                      {po.supplierName} · Kho {po.warehouseCode}
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full border text-[10px] font-bold whitespace-nowrap ${
                      received
                        ? 'bg-[#E6F7F0] border-[#A7E3CA] text-[#0D7A52]'
                        : 'bg-[#FEF5D9] border-[#F3D88C] text-[#9A6700]'
                    }`}
                  >
                    {po.status}
                  </span>
                </div>

                <div className="rounded-xl bg-[#F7F3EE] px-3 py-2 flex items-center justify-between text-[11.5px]">
                  <div>
                    <span className="text-[#7D6C6E]">SL nhập: </span>
                    <strong className="font-mono text-[#3D040E] tabular-nums">
                      +{po.qty} {po.unitLabel}
                    </strong>
                  </div>
                  <div className="font-mono font-bold text-[#3D040E] tabular-nums">
                    {formatVnd(po.qty * po.unitPriceVnd)}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <span className="font-mono text-[10.5px] text-[#7D6C6E] tabular-nums">
                    {formatShortTime(po.createdAtIso)}
                  </span>

                  {received ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0D7A52]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Đã cộng tồn FEFO</span>
                    </span>
                  ) : (
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      disabled={busyId === po.id}
                      onClick={() => handleReceive(po.id)}
                      className="min-h-[36px] px-3 rounded-xl bg-[#640D22] hover:bg-[#540316] text-[#FFFFFF] text-[11.5px] font-bold inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      <PackagePlus className="w-3.5 h-3.5" />
                      <span>{busyId === po.id ? 'Đang nhập...' : 'Nhập kho FEFO'}</span>
                    </motion.button>
                  )}
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      <BottomSheet
        isOpen={createOpen}
        title="Tạo phiếu mua bổ sung"
        subtitle="Nhập hàng vào Kho Tổng Tân Bình (TB-01)"
        onClose={() => setCreateOpen(false)}
      >
        <form onSubmit={handleSubmitPo} className="space-y-4">
          <div>
            <label htmlFor="po-sku" className="block text-[13px] font-semibold text-[#3D040E] mb-1">
              Sản phẩm cần nhập
            </label>
            <select
              id="po-sku"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full h-11 rounded-xl border border-[#DDD3C8] bg-[#FFFFFF] px-3 text-[13px] text-[#3D040E]"
            >
              {uniqueSkus.map((item) => (
                <option key={item.sku} value={item.sku}>
                  {item.productName} ({item.sku})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="po-qty" className="block text-[13px] font-semibold text-[#3D040E] mb-1">
                Số lượng nhập
              </label>
              <input
                id="po-qty"
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                className="w-full h-11 rounded-xl border border-[#DDD3C8] bg-[#FFFFFF] px-3 font-mono text-[14px] tabular-nums"
              />
            </div>
            <div>
              <label htmlFor="po-supplier" className="block text-[13px] font-semibold text-[#3D040E] mb-1">
                Nhà cung cấp
              </label>
              <input
                id="po-supplier"
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="w-full h-11 rounded-xl border border-[#DDD3C8] bg-[#FFFFFF] px-3 text-[13px]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={busyId === 'new'}
            className="w-full min-h-[46px] rounded-xl bg-[#640D22] text-[#FFFFFF] text-[14px] font-bold cursor-pointer"
          >
            {busyId === 'new' ? 'Đang tạo...' : 'Phát hành phiếu mua'}
          </button>
        </form>
      </BottomSheet>
    </div>
  );
}
