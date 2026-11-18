import crypto from 'crypto';
import type { MobileSupplyState, UserAccount, UserProfile } from '../types/logistics';

export function hashPassword(password: string, existingSalt?: string): string {
  const salt = existingSalt ?? crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

export function createDefaultUsers(): UserAccount[] {
  return [
    {
      id: 'usr-admin-01',
      email: 'admin@sovereignsupply.vn',
      passwordHash: hashPassword('admin123', 'sovereign-tb01-salt'),
      createdAtIso: '2026-11-16T08:00:00Z',
      profile: createDefaultProfile(),
    },
    {
      id: 'usr-coord-02',
      email: 'dieuphoi@sovereignsupply.vn',
      passwordHash: hashPassword('admin123', 'sovereign-bd02-salt'),
      createdAtIso: '2026-11-16T08:05:00Z',
      profile: {
        fullName: 'Trần Quốc Bảo',
        employeeCode: 'ADM-BD02-02',
        email: 'dieuphoi@sovereignsupply.vn',
        defaultRole: 'dispatch',
        defaultWarehouseCode: 'BD-02',
        settings: {
          liquidGlass: true,
          fefoAlerts: true,
          actionToasts: true,
        },
      },
    },
  ];
}

export function createDefaultProfile(): UserProfile {
  return {
    fullName: 'Nguyễn Minh Anh',
    employeeCode: 'ADM-TB01-01',
    email: 'admin@sovereignsupply.vn',
    defaultRole: 'overview',
    defaultWarehouseCode: 'TB-01',
    settings: {
      liquidGlass: true,
      fefoAlerts: true,
      actionToasts: true,
    },
  };
}

export function createInitialMobileState(): MobileSupplyState {
  return {
    updatedAtIso: '2026-11-16T09:30:00Z',
    profile: createDefaultProfile(),
    users: createDefaultUsers(),
    sessions: [],
    fefoLots: [
      {
        lotId: 'LO-2024A',
        sku: 'SKU-MILK-01',
        productName: 'Sữa tươi Tiệt trùng Vinamilk 1L',
        unitLabel: 'hộp',
        unitPriceVnd: 32000,
        warehouseCode: 'TB-01',
        expiryLabel: 'HSD 12/2024',
        expirySortKey: '2024-12',
        qualifiedQty: 320,
        reservedQty: 50,
      },
      {
        lotId: 'LO-2024M',
        sku: 'SKU-MILK-01',
        productName: 'Sữa tươi Tiệt trùng Vinamilk 1L',
        unitLabel: 'hộp',
        unitPriceVnd: 32000,
        warehouseCode: 'TB-01',
        expiryLabel: 'HSD 04/2025',
        expirySortKey: '2025-04',
        qualifiedQty: 180,
        reservedQty: 0,
      },
      {
        lotId: 'LO-2024B',
        sku: 'SKU-OIL-02',
        productName: 'Dầu ăn cao cấp Simply 2L',
        unitLabel: 'chai',
        unitPriceVnd: 115000,
        warehouseCode: 'TB-01',
        expiryLabel: 'HSD 02/2025',
        expirySortKey: '2025-02',
        qualifiedQty: 120,
        reservedQty: 40,
      },
      {
        lotId: 'LO-2024R',
        sku: 'SKU-RICE-03',
        productName: 'Gạo ST25 Đặc sản Sóc Trăng 5kg',
        unitLabel: 'túi',
        unitPriceVnd: 185000,
        warehouseCode: 'TB-01',
        expiryLabel: 'HSD 06/2025',
        expirySortKey: '2025-06',
        qualifiedQty: 240,
        reservedQty: 30,
      },
      {
        lotId: 'LO-2024N',
        sku: 'SKU-SAUCE-04',
        productName: 'Nước mắm Phú Quốc Hảo hạng 500ml',
        unitLabel: 'chai',
        unitPriceVnd: 68000,
        warehouseCode: 'TB-01',
        expiryLabel: 'HSD 09/2025',
        expirySortKey: '2025-09',
        qualifiedQty: 160,
        reservedQty: 20,
      },
    ],
    salesOrders: [
      {
        id: 'SO-2024-089',
        customerName: 'Công ty CP Bách Hóa Xanh',
        warehouseCode: 'TB-01',
        warehouseName: 'Kho Tổng Tân Bình (TB-01)',
        scheduledDeliveryLabel: 'Hôm nay, 16:30',
        status: 'Nháp',
        createdAtIso: '2026-11-16T08:15:00Z',
        notes: 'Ưu tiên xuất lô FEFO sớm nhất cho cụm siêu thị Tân Bình.',
        items: [
          {
            sku: 'SKU-MILK-01',
            productName: 'Sữa tươi Tiệt trùng Vinamilk 1L',
            unitLabel: 'hộp',
            unitPriceVnd: 32000,
            warehouseCode: 'TB-01',
            requestedQty: 150,
            reservedQtyForOrder: 0,
            allocatedLotId: 'LO-2024A',
          },
          {
            sku: 'SKU-OIL-02',
            productName: 'Dầu ăn cao cấp Simply 2L',
            unitLabel: 'chai',
            unitPriceVnd: 115000,
            warehouseCode: 'TB-01',
            requestedQty: 100,
            reservedQtyForOrder: 0,
            allocatedLotId: 'LO-2024B',
          },
        ],
        history: [
          {
            id: 'h-1',
            timestampIso: '2026-11-16T08:15:00Z',
            actor: 'NV Bán hàng',
            action: 'Tạo đơn nháp',
            detail: 'Khởi tạo SO-2024-089 cho Công ty CP Bách Hóa Xanh.',
          },
          {
            id: 'h-2',
            timestampIso: '2026-11-16T08:16:00Z',
            actor: 'Hệ thống FEFO',
            action: 'Kiểm tra khả dụng',
            detail: 'SKU-MILK-01 đủ tại LO-2024A; SKU-OIL-02 thiếu 20 chai.',
          },
        ],
        dispatchWaypoints: [
          { id: 'wp-1', code: 'SOẠN', label: 'Soạn hàng FEFO', status: 'pending', timestampIso: null },
          { id: 'wp-2', code: 'TB-01', label: 'Xuất kho Tân Bình', status: 'pending', timestampIso: null },
          { id: 'wp-3', code: 'GIAO', label: 'Đang vận chuyển', status: 'pending', timestampIso: null },
          { id: 'wp-4', code: 'POD', label: 'Hoàn tất giao', status: 'pending', timestampIso: null },
        ],
      },
      {
        id: 'SO-2024-088',
        customerName: 'Co.opmart Lý Thường Kiệt',
        warehouseCode: 'TB-01',
        warehouseName: 'Kho Tổng Tân Bình (TB-01)',
        scheduledDeliveryLabel: 'Hôm nay, 18:00',
        status: 'Đã giữ FEFO',
        createdAtIso: '2026-11-16T06:40:00Z',
        notes: 'Đã khóa lô FEFO, chờ điều phối xe tải lạnh.',
        items: [
          {
            sku: 'SKU-RICE-03',
            productName: 'Gạo ST25 Đặc sản Sóc Trăng 5kg',
            unitLabel: 'túi',
            unitPriceVnd: 185000,
            warehouseCode: 'TB-01',
            requestedQty: 30,
            reservedQtyForOrder: 30,
            allocatedLotId: 'LO-2024R',
          },
          {
            sku: 'SKU-SAUCE-04',
            productName: 'Nước mắm Phú Quốc Hảo hạng 500ml',
            unitLabel: 'chai',
            unitPriceVnd: 68000,
            warehouseCode: 'TB-01',
            requestedQty: 20,
            reservedQtyForOrder: 20,
            allocatedLotId: 'LO-2024N',
          },
        ],
        history: [
          {
            id: 'h-10',
            timestampIso: '2026-11-16T06:40:00Z',
            actor: 'NV Bán hàng',
            action: 'Tạo đơn hàng',
            detail: 'Khởi tạo đơn SO-2024-088 giao trong ngày.',
          },
          {
            id: 'h-11',
            timestampIso: '2026-11-16T07:05:00Z',
            actor: 'NV Bán hàng',
            action: 'Giữ FEFO',
            detail: 'Đã giữ 30 túi LO-2024R và 20 chai LO-2024N.',
          },
        ],
        dispatchWaypoints: [
          { id: 'wp-1', code: 'SOẠN', label: 'Soạn hàng FEFO', status: 'cleared', timestampIso: '2026-11-16T07:20:00Z' },
          { id: 'wp-2', code: 'TB-01', label: 'Xuất kho Tân Bình', status: 'active', timestampIso: '2026-11-16T08:10:00Z' },
          { id: 'wp-3', code: 'GIAO', label: 'Đang vận chuyển', status: 'pending', timestampIso: null },
          { id: 'wp-4', code: 'POD', label: 'Hoàn tất giao', status: 'pending', timestampIso: null },
        ],
      },
    ],
    purchaseOrders: [],
    approvals: [],
  };
}
