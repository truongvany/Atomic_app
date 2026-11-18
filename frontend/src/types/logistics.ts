export type AdminTabId = 'overview' | 'sales' | 'fefo' | 'dispatch' | 'purchasing';
export type MobileTabId = AdminTabId;

export type OrderStatus =
  | 'Nháp'
  | 'Chờ duyệt'
  | 'Đã giữ FEFO'
  | 'Đang giao'
  | 'Đã giao'
  | 'Đã hủy';

export type DispatchStageStatus = 'cleared' | 'active' | 'pending';

export interface ProfileSettings {
  liquidGlass: boolean;
  fefoAlerts: boolean;
  actionToasts: boolean;
}

export interface UserProfile {
  fullName: string;
  employeeCode: string;
  email: string;
  defaultRole: AdminTabId;
  defaultWarehouseCode: 'TB-01' | 'BD-02' | 'DN-03';
  settings: ProfileSettings;
}

export interface OrderHistoryEntry {
  id: string;
  timestampIso: string;
  actor: string;
  action: string;
  detail: string;
}

export interface SalesOrderLine {
  sku: string;
  productName: string;
  unitLabel: string;
  unitPriceVnd: number;
  warehouseCode: string;
  requestedQty: number;
  reservedQtyForOrder: number;
  allocatedLotId: string | null;
}

export interface DispatchWaypoint {
  id: string;
  code: string;
  label: string;
  status: DispatchStageStatus;
  timestampIso: string | null;
}

export interface SalesOrder {
  id: string;
  customerName: string;
  warehouseCode: string;
  warehouseName: string;
  scheduledDeliveryLabel: string;
  status: OrderStatus;
  createdAtIso: string;
  notes: string;
  items: SalesOrderLine[];
  history: OrderHistoryEntry[];
  dispatchWaypoints: DispatchWaypoint[];
}

export interface FefoLot {
  lotId: string;
  sku: string;
  productName: string;
  unitLabel: string;
  unitPriceVnd: number;
  warehouseCode: string;
  expiryLabel: string;
  expirySortKey: string;
  qualifiedQty: number;
  reservedQty: number;
}

export interface PurchaseOrder {
  id: string;
  sourceOrderId: string | null;
  sku: string;
  productName: string;
  unitLabel: string;
  unitPriceVnd: number;
  warehouseCode: string;
  qty: number;
  supplierName: string;
  status: 'Chờ đặt hàng' | 'Đang về kho' | 'Đã nhập kho';
  createdAtIso: string;
}

export interface ApprovalRequest {
  id: string;
  orderId: string;
  type: 'Tách giao thiếu hàng' | 'Hủy đơn & Quyết toán';
  requestedBy: string;
  reason: string;
  status: 'Chờ duyệt' | 'Đã duyệt' | 'Từ chối';
  createdAtIso: string;
}

export interface UserAccount {
  id: string;
  email: string;
  passwordHash: string;
  profile: UserProfile;
  createdAtIso: string;
}

export interface AuthSession {
  token: string;
  userId: string;
  createdAtIso: string;
}

export interface AuthPreviewData {
  totalLots: number;
  totalOrders: number;
  pendingApprovals: number;
  activeDispatches: number;
  sampleLots: Array<{
    lotId: string;
    productName: string;
    expiryLabel: string;
    warehouseCode: string;
    available: number;
    qualifiedQty: number;
    unitLabel: string;
  }>;
}

export interface MobileSupplyState {
  profile: UserProfile;
  salesOrders: SalesOrder[];
  fefoLots: FefoLot[];
  purchaseOrders: PurchaseOrder[];
  approvals: ApprovalRequest[];
  users?: UserAccount[];
  sessions?: AuthSession[];
  updatedAtIso: string;
}
