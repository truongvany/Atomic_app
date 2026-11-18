import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Calendar, Minus, Plus, Search } from 'lucide-react';
import type { FefoLot } from '../types/logistics';
import { formatVnd } from '../utils/formatVnd';

interface FefoWarehouseTabProps {
  lots: FefoLot[];
  onAdjustLot: (lotId: string, deltaQualified: number) => Promise<void>;
}

export function FefoWarehouseTab({ lots, onAdjustLot }: FefoWarehouseTabProps) {
  const [query, setQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'low'>('all');
  const [busyLot, setBusyLot] = useState<string | null>(null);

  const sortedLots = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...lots]
      .sort((a, b) => a.expirySortKey.localeCompare(b.expirySortKey))
      .filter((lot) => {
        const avail = lot.qualifiedQty - lot.reservedQty;
        if (filterMode === 'low' && avail > 90) return false;
        if (q) {
          const hay = `${lot.lotId} ${lot.sku} ${lot.productName}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
  }, [lots, query, filterMode]);

  const handleAdjust = async (lotId: string, delta: number) => {
    setBusyLot(lotId);
    try {
      await onAdjustLot(lotId, delta);
    } finally {
      setBusyLot(null);
    }
  };

  return (
    <div className="space-y-2.5 pb-4">
      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="relative sm:w-72">
          <Search className="w-3.5 h-3.5 text-[#7D6C6E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm mã lô, SKU hoặc tên..."
            aria-label="Tìm kiếm lô FEFO"
            className="w-full h-9 pl-8 pr-3 rounded-xl border border-[#E5DBD0] bg-[#FFFFFF] text-[12px] text-[#3D040E] placeholder:text-[#8C7B7D] focus:outline-none focus:border-[#640D22]"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border cursor-pointer ${
              filterMode === 'all'
                ? 'bg-[#640D22] text-[#FFFFFF] border-[#540316]'
                : 'bg-[#FFFFFF] text-[#5C4B4C] border-[#E5DBD0]'
            }`}
          >
            Tất cả ({lots.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('low')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border cursor-pointer ${
              filterMode === 'low'
                ? 'bg-[#640D22] text-[#FFFFFF] border-[#540316]'
                : 'bg-[#FFFFFF] text-[#5C4B4C] border-[#E5DBD0]'
            }`}
          >
            Khả dụng thấp
          </button>
        </div>
      </div>

      {/* Lots sorted by earliest expiry */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {sortedLots.map((lot, idx) => {
          const avail = Math.max(0, lot.qualifiedQty - lot.reservedQty);
          const isLow = avail <= 85;
          const isBusy = busyLot === lot.lotId;

          return (
            <motion.article
              key={lot.lotId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: idx * 0.04, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-2xl bg-[#FFFFFF]/95 backdrop-blur-sm border border-[#EAE2D9] p-3 space-y-2 shadow-[0_2px_6px_rgba(61,4,14,0.04)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-[#F4E6E8] text-[#640D22]">
                      {lot.lotId}
                    </span>
                    <span className="font-mono text-[10px] text-[#7D6C6E]">{lot.sku}</span>
                    {idx === 0 && (
                      <span className="text-[9.5px] font-bold uppercase text-[#9A6700] bg-[#FEF5D9] px-1.5 py-0.5 rounded">
                        FEFO #1
                      </span>
                    )}
                  </div>
                  <h3 className="text-[13px] font-bold text-[#3D040E] mt-1 leading-snug">
                    {lot.productName}
                  </h3>
                  <div className="text-[10.5px] text-[#6E5B5D] mt-0.5 flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {lot.expiryLabel}
                    </span>
                    <span>·</span>
                    <span>{lot.warehouseCode}</span>
                    <span>·</span>
                    <span>{formatVnd(lot.unitPriceVnd)}/{lot.unitLabel}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-[#F7F3EE] px-2 py-1.5 grid grid-cols-3 text-center">
                <div>
                  <div className="text-[10px] text-[#7D6C6E]">Đủ ĐK</div>
                  <div className="font-mono text-[13px] font-bold text-[#3D040E] tabular-nums">
                    {lot.qualifiedQty}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[#7D6C6E]">Đã giữ</div>
                  <div className="font-mono text-[13px] font-bold text-[#B45309] tabular-nums">
                    {lot.reservedQty}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[#7D6C6E]">Khả dụng</div>
                  <div
                    className={`font-mono text-[13px] font-bold tabular-nums ${
                      isLow ? 'text-[#C21842]' : 'text-[#0D7A52]'
                    }`}
                  >
                    {avail}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <span className="text-[10.5px] text-[#6E5B5D]">Kiểm kê ({lot.unitLabel}):</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={isBusy || avail < 10}
                    onClick={() => handleAdjust(lot.lotId, -10)}
                    className="h-7 px-2 rounded-lg border border-[#E5DBD0] bg-[#FDFBF7] font-mono text-[10.5px] font-semibold text-[#3D040E] disabled:opacity-40 inline-flex items-center gap-0.5 cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                    10
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleAdjust(lot.lotId, 10)}
                    className="h-7 px-2 rounded-lg border border-[#E5DBD0] bg-[#FDFBF7] font-mono text-[10.5px] font-semibold text-[#3D040E] disabled:opacity-40 inline-flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    10
                  </button>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    disabled={isBusy}
                    onClick={() => handleAdjust(lot.lotId, 50)}
                    className="h-7 px-2 rounded-lg bg-[#EFE8E0] font-mono text-[10.5px] font-bold text-[#640D22] disabled:opacity-40 cursor-pointer"
                  >
                    +50
                  </motion.button>
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>
    </div>
  );
}
