import crypto from 'crypto';
import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  createDefaultProfile,
  createDefaultUsers,
  createInitialMobileState,
  hashPassword,
  verifyPassword,
} from './src/data/seedData.ts';
import type {
  AdminTabId,
  ApprovalRequest,
  AuthPreviewData,
  FefoLot,
  MobileSupplyState,
  PurchaseOrder,
  SalesOrder,
  SalesOrderLine,
  UserAccount,
  UserProfile,
} from './src/types/logistics.ts';

const VALID_ADMIN_TABS: AdminTabId[] = ['overview', 'sales', 'fefo', 'dispatch', 'purchasing'];
const SESSION_COOKIE_NAME = 'sovereign_session';
const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;

function normalizeAdminTab(role: unknown): AdminTabId {
  if (typeof role === 'string' && VALID_ADMIN_TABS.includes(role as AdminTabId)) {
    return role as AdminTabId;
  }
  return 'overview';
}

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'fefo-ledger.json');

function ensureState(): MobileSupplyState {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    const seed = createInitialMobileState();
    fs.writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2), 'utf-8');
    return seed;
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as MobileSupplyState;
    if (!parsed.salesOrders || !parsed.fefoLots) {
      throw new Error('Invalid state schema');
    }
    if (!parsed.profile) {
      parsed.profile = createDefaultProfile();
    } else {
      parsed.profile.defaultRole = normalizeAdminTab(
        parsed.profile.defaultRole === ('management' as unknown)
          ? 'overview'
          : parsed.profile.defaultRole
      );
    }
    if (!Array.isArray(parsed.users) || parsed.users.length === 0) {
      parsed.users = createDefaultUsers();
    }
    if (!Array.isArray(parsed.sessions)) {
      parsed.sessions = [];
    }
    return parsed;
  } catch {
    const seed = createInitialMobileState();
    fs.writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2), 'utf-8');
    return seed;
  }
}

function saveState(state: MobileSupplyState): MobileSupplyState {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const next: MobileSupplyState = {
    ...state,
    updatedAtIso: new Date().toISOString(),
  };
  const tmpFile = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(next, null, 2), 'utf-8');
  fs.renameSync(tmpFile, DATA_FILE);
  return next;
}

function toClientState(state: MobileSupplyState, activeUser?: UserAccount | null): MobileSupplyState {
  return {
    profile: activeUser ? activeUser.profile : state.profile,
    salesOrders: state.salesOrders,
    fefoLots: state.fefoLots,
    purchaseOrders: state.purchaseOrders,
    approvals: state.approvals,
    updatedAtIso: state.updatedAtIso,
  };
}

function sanitizeUser(user: UserAccount) {
  return {
    id: user.id,
    email: user.email,
    profile: user.profile,
    createdAtIso: user.createdAtIso,
  };
}

function extractSessionToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    if (key === SESSION_COOKIE_NAME) {
      return decodeURIComponent(pair.slice(idx + 1).trim());
    }
  }
  return null;
}

function getAuthenticatedSession(req: Request, state: MobileSupplyState) {
  const token = extractSessionToken(req);
  if (!token) return null;
  const session = (state.sessions ?? []).find((s) => s.token === token);
  if (!session) return null;
  const user = (state.users ?? []).find((u) => u.id === session.userId);
  if (!user) return null;
  return { token, session, user };
}

function setSessionCookie(res: Response, token: string) {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SEC}`
  );
}

function clearSessionCookie(res: Response) {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`
  );
}

interface AuthedRequest extends Request {
  authUser?: UserAccount;
  authToken?: string;
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const state = ensureState();
  const auth = getAuthenticatedSession(req, state);
  if (!auth) {
    return res.status(401).json({ error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' });
  }
  req.authUser = auth.user;
  req.authToken = auth.token;
  next();
}

function getSkuAvailability(lots: FefoLot[], sku: string) {
  const matching = lots
    .filter((l) => l.sku === sku)
    .sort((a, b) => a.expirySortKey.localeCompare(b.expirySortKey));
  const earliestLot = matching[0] ?? null;
  const qualified = earliestLot ? earliestLot.qualifiedQty : 0;
  const reserved = earliestLot ? earliestLot.reservedQty : 0;
  return {
    earliestLot,
    qualified,
    reserved,
    available: Math.max(0, qualified - reserved),
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  ensureState();

  // Public Auth Preview Metrics for the 2-column Auth Portal
  app.get('/api/auth/preview', (_req, res) => {
    const state = ensureState();
    const sortedLots = [...state.fefoLots].sort((a, b) =>
      a.expirySortKey.localeCompare(b.expirySortKey)
    );
    const preview: AuthPreviewData = {
      totalLots: state.fefoLots.length,
      totalOrders: state.salesOrders.length,
      pendingApprovals: state.approvals.filter((a) => a.status === 'Chờ duyệt').length,
      activeDispatches: state.salesOrders.filter(
        (o) => o.status === 'Đã giữ FEFO' || o.status === 'Đang giao'
      ).length,
      sampleLots: sortedLots.slice(0, 2).map((l) => ({
        lotId: l.lotId,
        productName: l.productName,
        expiryLabel: l.expiryLabel,
        warehouseCode: l.warehouseCode,
        available: Math.max(0, l.qualifiedQty - l.reservedQty),
        qualifiedQty: l.qualifiedQty,
        unitLabel: l.unitLabel,
      })),
    };
    res.json(preview);
  });

  // Check Current Session
  app.get('/api/auth/me', (req, res) => {
    const state = ensureState();
    const auth = getAuthenticatedSession(req, state);
    if (!auth) {
      return res.json({ authenticated: false, user: null });
    }
    res.json({
      authenticated: true,
      token: auth.token,
      user: sanitizeUser(auth.user),
      state: toClientState(state, auth.user),
    });
  });

  // Register New Admin Account
  app.post('/api/auth/register', (req, res) => {
    const state = ensureState();
    const {
      fullName,
      email,
      password,
      employeeCode,
      defaultWarehouseCode,
      defaultRole,
    } = req.body as {
      fullName?: string;
      email?: string;
      password?: string;
      employeeCode?: string;
      defaultWarehouseCode?: UserProfile['defaultWarehouseCode'];
      defaultRole?: AdminTabId;
    };

    const cleanName = fullName?.trim() ?? '';
    const cleanEmail = email?.trim().toLowerCase() ?? '';
    const cleanPassword = password ?? '';

    if (!cleanName) {
      return res.status(400).json({ error: 'Vui lòng nhập họ và tên.' });
    }
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: 'Email công việc không hợp lệ.' });
    }
    if (cleanPassword.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự.' });
    }

    const users = state.users ?? [];
    if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return res.status(409).json({ error: 'Email này đã được đăng ký. Vui lòng đăng nhập.' });
    }

    const wh: UserProfile['defaultWarehouseCode'] =
      defaultWarehouseCode === 'BD-02' || defaultWarehouseCode === 'DN-03'
        ? defaultWarehouseCode
        : 'TB-01';
    const role = normalizeAdminTab(defaultRole);
    const autoCode = `ADM-${wh.split('-')[0]}-${String(users.length + 1).padStart(2, '0')}`;

    const newUser: UserAccount = {
      id: `usr-${Date.now()}`,
      email: cleanEmail,
      passwordHash: hashPassword(cleanPassword),
      createdAtIso: new Date().toISOString(),
      profile: {
        fullName: cleanName,
        employeeCode: employeeCode?.trim() || autoCode,
        email: cleanEmail,
        defaultRole: role,
        defaultWarehouseCode: wh,
        settings: {
          liquidGlass: true,
          fefoAlerts: true,
          actionToasts: true,
        },
      },
    };

    const token = crypto.randomBytes(32).toString('hex');
    state.users = [...users, newUser];
    state.sessions = [
      ...(state.sessions ?? []),
      { token, userId: newUser.id, createdAtIso: new Date().toISOString() },
    ];
    state.profile = newUser.profile;

    const saved = saveState(state);
    setSessionCookie(res, token);
    res.status(201).json({
      authenticated: true,
      token,
      user: sanitizeUser(newUser),
      state: toClientState(saved, newUser),
    });
  });

  // Login Existing Account
  app.post('/api/auth/login', (req, res) => {
    const state = ensureState();
    const { email, password } = req.body as { email?: string; password?: string };
    const cleanEmail = email?.trim().toLowerCase() ?? '';
    const cleanPassword = password ?? '';

    if (!cleanEmail || !cleanPassword) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ Email và Mật khẩu.' });
    }

    const user = (state.users ?? []).find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user || !verifyPassword(cleanPassword, user.passwordHash)) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu chưa chính xác.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    state.sessions = [
      ...(state.sessions ?? []).slice(-19),
      { token, userId: user.id, createdAtIso: new Date().toISOString() },
    ];
    state.profile = user.profile;

    const saved = saveState(state);
    setSessionCookie(res, token);
    res.json({
      authenticated: true,
      token,
      user: sanitizeUser(user),
      state: toClientState(saved, user),
    });
  });

  // Logout Current Session
  app.post('/api/auth/logout', (req, res) => {
    const state = ensureState();
    const token = extractSessionToken(req);
    if (token) {
      state.sessions = (state.sessions ?? []).filter((s) => s.token !== token);
      saveState(state);
    }
    clearSessionCookie(res);
    res.json({ authenticated: false });
  });

  // Protected Dashboard State
  app.get('/api/state', requireAuth, (req: AuthedRequest, res) => {
    const state = ensureState();
    const activeUser = (state.users ?? []).find((u) => u.id === req.authUser?.id);
    res.json(toClientState(state, activeUser));
  });

  // Create new Sales Order
  app.post('/api/sales-orders', requireAuth, (req: AuthedRequest, res) => {
    const state = ensureState();
    const activeUser = (state.users ?? []).find((u) => u.id === req.authUser?.id);
    const { customerName, scheduledDeliveryLabel, notes, items } = req.body as {
      customerName?: string;
      scheduledDeliveryLabel?: string;
      notes?: string;
      items?: Array<{ sku: string; requestedQty?: number; qty?: number }>;
    };

    if (!customerName?.trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập tên khách hàng.' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Đơn hàng cần ít nhất 1 dòng sản phẩm.' });
    }

    const lines: SalesOrderLine[] = [];
    for (const reqItem of items) {
      const qty = Math.floor(Number(reqItem.requestedQty ?? reqItem.qty));
      const { earliestLot } = getSkuAvailability(state.fefoLots, reqItem.sku);
      if (!earliestLot || !Number.isFinite(qty) || qty <= 0) {
        return res.status(400).json({ error: `Dòng hàng ${reqItem.sku} không hợp lệ.` });
      }
      lines.push({
        sku: earliestLot.sku,
        productName: earliestLot.productName,
        unitLabel: earliestLot.unitLabel,
        unitPriceVnd: earliestLot.unitPriceVnd,
        warehouseCode: earliestLot.warehouseCode,
        requestedQty: qty,
        reservedQtyForOrder: 0,
        allocatedLotId: earliestLot.lotId,
      });
    }

    const num = Math.floor(100 + Math.random() * 899);
    const nowIso = new Date().toISOString();
    const actorName = activeUser?.profile.fullName || 'Admin';
    const newOrder: SalesOrder = {
      id: `SO-2024-${num}`,
      customerName: customerName.trim(),
      warehouseCode: 'TB-01',
      warehouseName: 'Kho Tổng Tân Bình (TB-01)',
      scheduledDeliveryLabel: scheduledDeliveryLabel?.trim() || 'Ngày mai, 10:00',
      status: 'Nháp',
      createdAtIso: nowIso,
      notes: notes?.trim() || 'Đơn bán hàng mới tạo từ Sovereign Admin.',
      items: lines,
      history: [
        {
          id: `h-${Date.now()}`,
          timestampIso: nowIso,
          actor: actorName,
          action: 'Tạo đơn nháp',
          detail: `Tạo mới đơn ${`SO-2024-${num}`} cho ${customerName.trim()}.`,
        },
      ],
      dispatchWaypoints: [
        { id: 'wp-1', code: 'SOẠN', label: 'Soạn hàng FEFO', status: 'pending', timestampIso: null },
        { id: 'wp-2', code: 'TB-01', label: 'Xuất kho Tân Bình', status: 'pending', timestampIso: null },
        { id: 'wp-3', code: 'GIAO', label: 'Đang vận chuyển', status: 'pending', timestampIso: null },
        { id: 'wp-4', code: 'POD', label: 'Hoàn tất giao nhận', status: 'pending', timestampIso: null },
      ],
    };

    state.salesOrders.unshift(newOrder);
    const saved = saveState(state);
    res.status(201).json({ order: newOrder, state: toClientState(saved, activeUser) });
  });

  // Confirm & Reserve FEFO
  app.post('/api/sales-orders/:id/reserve-fefo', requireAuth, (req: AuthedRequest, res) => {
    const state = ensureState();
    const activeUser = (state.users ?? []).find((u) => u.id === req.authUser?.id);
    const order = state.salesOrders.find((o) => o.id === req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Không tìm thấy đơn bán hàng.' });
    }
    if (order.status === 'Đã giữ FEFO' || order.status === 'Đang giao' || order.status === 'Đã giao') {
      return res.status(400).json({ error: 'Đơn hàng này đã được giữ hàng FEFO trước đó.' });
    }

    const shortages: string[] = [];
    for (const line of order.items) {
      const avail = getSkuAvailability(state.fefoLots, line.sku);
      if (avail.available < line.requestedQty) {
        shortages.push(`${line.productName} (thiếu ${line.requestedQty - avail.available} ${line.unitLabel})`);
      }
    }

    if (shortages.length > 0) {
      return res.status(400).json({
        error: `Không thể giữ FEFO do còn thiếu: ${shortages.join(', ')}. Vui lòng chọn "Xử lý thiếu" trước.`,
      });
    }

    const nowIso = new Date().toISOString();
    for (const line of order.items) {
      const { earliestLot } = getSkuAvailability(state.fefoLots, line.sku);
      if (earliestLot) {
        earliestLot.reservedQty += line.requestedQty;
        line.reservedQtyForOrder = line.requestedQty;
        line.allocatedLotId = earliestLot.lotId;
      }
    }

    order.status = 'Đã giữ FEFO';
    order.dispatchWaypoints[0] = {
      ...order.dispatchWaypoints[0],
      status: 'active',
      timestampIso: nowIso,
    };
    order.history.unshift({
      id: `h-${Date.now()}`,
      timestampIso: nowIso,
      actor: activeUser?.profile.fullName || 'Admin',
      action: 'Xác nhận & Giữ FEFO',
      detail: `Đã giữ đủ toàn bộ ${order.items.length} dòng hàng theo lô FEFO sớm nhất.`,
    });

    const saved = saveState(state);
    res.json({ order, state: toClientState(saved, activeUser) });
  });

  // Resolve Shortage: adjust_qty | create_po | request_split
  app.post('/api/sales-orders/:id/resolve-shortage', requireAuth, (req: AuthedRequest, res) => {
    const state = ensureState();
    const activeUser = (state.users ?? []).find((u) => u.id === req.authUser?.id);
    const order = state.salesOrders.find((o) => o.id === req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });
    }

    const { sku, strategy } = req.body as {
      sku?: string;
      strategy?: 'adjust_qty' | 'create_po' | 'request_split';
    };

    const targetItems = sku ? order.items.filter((i) => i.sku === sku) : order.items;
    if (targetItems.length === 0) {
      return res.status(400).json({ error: 'Không tìm thấy dòng hàng cần xử lý.' });
    }

    const nowIso = new Date().toISOString();
    const actorName = activeUser?.profile.fullName || 'Admin';

    if (strategy === 'adjust_qty') {
      const changes: string[] = [];
      for (const line of targetItems) {
        const { available } = getSkuAvailability(state.fefoLots, line.sku);
        if (available < line.requestedQty) {
          const oldQty = line.requestedQty;
          line.requestedQty = available;
          changes.push(`${line.sku}: ${oldQty} → ${available}`);
        }
      }
      order.history.unshift({
        id: `h-${Date.now()}`,
        timestampIso: nowIso,
        actor: actorName,
        action: 'Điều chỉnh theo khả dụng',
        detail: changes.length > 0 ? `Cập nhật số lượng: ${changes.join(', ')}.` : 'Giữ nguyên số lượng.',
      });
    } else if (strategy === 'create_po') {
      const createdPos: string[] = [];
      for (const line of targetItems) {
        const { available } = getSkuAvailability(state.fefoLots, line.sku);
        const shortage = Math.max(0, line.requestedQty - available);
        if (shortage > 0) {
          const existing = state.purchaseOrders.find(
            (p) => p.sourceOrderId === order.id && p.sku === line.sku && p.status !== 'Đã nhập kho'
          );
          if (!existing) {
            const poId = `PO-2024-${Math.floor(200 + Math.random() * 799)}`;
            const po: PurchaseOrder = {
              id: poId,
              sourceOrderId: order.id,
              sku: line.sku,
              productName: line.productName,
              unitLabel: line.unitLabel,
              unitPriceVnd: line.unitPriceVnd,
              warehouseCode: line.warehouseCode,
              qty: shortage,
              supplierName: 'NCC Tổng Miền Nam',
              status: 'Chờ đặt hàng',
              createdAtIso: nowIso,
            };
            state.purchaseOrders.unshift(po);
            createdPos.push(`${poId} (+${shortage} ${line.unitLabel})`);
          }
        }
      }
      order.history.unshift({
        id: `h-${Date.now()}`,
        timestampIso: nowIso,
        actor: actorName,
        action: 'Chuyển đề xuất Mua bù',
        detail:
          createdPos.length > 0
            ? `Đã gửi yêu cầu mua bổ sung sang Mua bù FEFO: ${createdPos.join(', ')}.`
            : 'Đã có phiếu mua bổ sung đang xử lý.',
      });
    } else if (strategy === 'request_split') {
      const approval: ApprovalRequest = {
        id: `APR-${Math.floor(100 + Math.random() * 899)}`,
        orderId: order.id,
        type: 'Tách giao thiếu hàng',
        requestedBy: actorName,
        reason: `Đề xuất giao trước phần khả dụng cho đơn ${order.id} và giao bù phần thiếu ở đợt 2.`,
        status: 'Chờ duyệt',
        createdAtIso: nowIso,
      };
      state.approvals.unshift(approval);
      order.status = 'Chờ duyệt';
      order.history.unshift({
        id: `h-${Date.now()}`,
        timestampIso: nowIso,
        actor: actorName,
        action: 'Gửi duyệt tách giao',
        detail: `Đưa vào Hàng đợi phê duyệt Admin (${approval.id}).`,
      });
    } else {
      return res.status(400).json({ error: 'Phương án xử lý không hợp lệ.' });
    }

    const saved = saveState(state);
    res.json({ order, state: toClientState(saved, activeUser) });
  });

  // Cancel / Settle order
  app.post('/api/sales-orders/:id/cancel', requireAuth, (req: AuthedRequest, res) => {
    const state = ensureState();
    const activeUser = (state.users ?? []).find((u) => u.id === req.authUser?.id);
    const order = state.salesOrders.find((o) => o.id === req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });
    }
    const { reason } = req.body as { reason?: string };
    const nowIso = new Date().toISOString();
    const actorName = activeUser?.profile.fullName || 'Admin';

    if (order.status === 'Đã giữ FEFO') {
      for (const line of order.items) {
        if (line.reservedQtyForOrder > 0 && line.allocatedLotId) {
          const lot = state.fefoLots.find((l) => l.lotId === line.allocatedLotId);
          if (lot) {
            lot.reservedQty = Math.max(0, lot.reservedQty - line.reservedQtyForOrder);
          }
          line.reservedQtyForOrder = 0;
        }
      }
    }

    order.status = 'Đã hủy';
    order.history.unshift({
      id: `h-${Date.now()}`,
      timestampIso: nowIso,
      actor: actorName,
      action: 'Dừng / Hủy đơn (Quyết toán)',
      detail: reason?.trim() || 'Khách hàng yêu cầu dừng đơn và chuyển quyết toán.',
    });

    const approval: ApprovalRequest = {
      id: `APR-${Math.floor(100 + Math.random() * 899)}`,
      orderId: order.id,
      type: 'Hủy đơn & Quyết toán',
      requestedBy: actorName,
      reason: reason?.trim() || 'Khách yêu cầu dừng đơn để chốt quyết toán công nợ.',
      status: 'Chờ duyệt',
      createdAtIso: nowIso,
    };
    state.approvals.unshift(approval);

    const saved = saveState(state);
    res.json({ order, state: toClientState(saved, activeUser) });
  });

  // Create manual Purchase Order
  app.post('/api/purchase-orders', requireAuth, (req: AuthedRequest, res) => {
    const state = ensureState();
    const activeUser = (state.users ?? []).find((u) => u.id === req.authUser?.id);
    const { sku, qty, supplierName } = req.body as {
      sku?: string;
      qty?: number;
      supplierName?: string;
    };
    const lot = state.fefoLots.find((l) => l.sku === sku);
    const numQty = Math.floor(Number(qty));
    if (!lot || !Number.isFinite(numQty) || numQty <= 0) {
      return res.status(400).json({ error: 'SKU hoặc số lượng nhập không hợp lệ.' });
    }

    const po: PurchaseOrder = {
      id: `PO-2024-${Math.floor(200 + Math.random() * 799)}`,
      sourceOrderId: null,
      sku: lot.sku,
      productName: lot.productName,
      unitLabel: lot.unitLabel,
      unitPriceVnd: lot.unitPriceVnd,
      warehouseCode: lot.warehouseCode,
      qty: numQty,
      supplierName: supplierName?.trim() || 'NCC Chính hãng VN',
      status: 'Chờ đặt hàng',
      createdAtIso: new Date().toISOString(),
    };
    state.purchaseOrders.unshift(po);
    const saved = saveState(state);
    res.status(201).json({ purchaseOrder: po, state: toClientState(saved, activeUser) });
  });

  // Receive Purchase Order into FEFO stock
  app.post('/api/purchase-orders/:id/receive', requireAuth, (req: AuthedRequest, res) => {
    const state = ensureState();
    const activeUser = (state.users ?? []).find((u) => u.id === req.authUser?.id);
    const po = state.purchaseOrders.find((p) => p.id === req.params.id);
    if (!po) {
      return res.status(404).json({ error: 'Không tìm thấy phiếu mua hàng.' });
    }
    if (po.status === 'Đã nhập kho') {
      return res.status(400).json({ error: 'Phiếu này đã được nhập kho.' });
    }

    po.status = 'Đã nhập kho';
    const earliestLot = state.fefoLots
      .filter((l) => l.sku === po.sku)
      .sort((a, b) => a.expirySortKey.localeCompare(b.expirySortKey))[0];

    if (earliestLot) {
      earliestLot.qualifiedQty += po.qty;
    }

    if (po.sourceOrderId) {
      const order = state.salesOrders.find((o) => o.id === po.sourceOrderId);
      if (order) {
        order.history.unshift({
          id: `h-${Date.now()}`,
          timestampIso: new Date().toISOString(),
          actor: activeUser?.profile.fullName || 'Admin',
          action: 'Nhập kho bổ sung FEFO',
          detail: `Đã nhập +${po.qty} ${po.unitLabel} ${po.sku} từ ${po.id} vào kho ${po.warehouseCode}.`,
        });
      }
    }

    const saved = saveState(state);
    res.json({ purchaseOrder: po, state: toClientState(saved, activeUser) });
  });

  // Management Approval decision
  app.post('/api/approvals/:id/decide', requireAuth, (req: AuthedRequest, res) => {
    const state = ensureState();
    const activeUser = (state.users ?? []).find((u) => u.id === req.authUser?.id);
    const apr = state.approvals.find((a) => a.id === req.params.id);
    if (!apr) {
      return res.status(404).json({ error: 'Không tìm thấy yêu cầu phê duyệt.' });
    }
    const { decision } = req.body as { decision?: 'Đã duyệt' | 'Từ chối' };
    if (decision !== 'Đã duyệt' && decision !== 'Từ chối') {
      return res.status(400).json({ error: 'Quyết định không hợp lệ.' });
    }

    apr.status = decision;
    const order = state.salesOrders.find((o) => o.id === apr.orderId);
    const nowIso = new Date().toISOString();
    const actorName = activeUser?.profile.fullName || 'Admin';
    if (order) {
      if (apr.type === 'Tách giao thiếu hàng' && decision === 'Đã duyệt') {
        for (const line of order.items) {
          const { earliestLot, available } = getSkuAvailability(state.fefoLots, line.sku);
          const alloc = Math.min(line.requestedQty, available);
          line.requestedQty = alloc;
          line.reservedQtyForOrder = alloc;
          if (earliestLot && alloc > 0) {
            earliestLot.reservedQty += alloc;
            line.allocatedLotId = earliestLot.lotId;
          }
        }
        order.status = 'Đã giữ FEFO';
        order.dispatchWaypoints[0] = {
          ...order.dispatchWaypoints[0],
          status: 'active',
          timestampIso: nowIso,
        };
      } else if (apr.type === 'Tách giao thiếu hàng' && decision === 'Từ chối') {
        order.status = 'Nháp';
      }
      order.history.unshift({
        id: `h-${Date.now()}`,
        timestampIso: nowIso,
        actor: actorName,
        action: `${decision}: ${apr.type}`,
        detail: `${actorName} đã ${decision.toLowerCase()} yêu cầu ${apr.id}.`,
      });
    }

    const saved = saveState(state);
    res.json({ approval: apr, state: toClientState(saved, activeUser) });
  });

  // Adjust FEFO lot stock
  app.patch('/api/fefo-lots/:lotId', requireAuth, (req: AuthedRequest, res) => {
    const state = ensureState();
    const activeUser = (state.users ?? []).find((u) => u.id === req.authUser?.id);
    const lot = state.fefoLots.find((l) => l.lotId === req.params.lotId);
    if (!lot) {
      return res.status(404).json({ error: 'Không tìm thấy lô FEFO.' });
    }
    const { deltaQualified } = req.body as { deltaQualified?: number };
    const delta = Math.trunc(Number(deltaQualified));
    if (!Number.isFinite(delta)) {
      return res.status(400).json({ error: 'Giá trị điều chỉnh không hợp lệ.' });
    }
    const nextQty = lot.qualifiedQty + delta;
    if (nextQty < lot.reservedQty) {
      return res.status(400).json({
        error: `Tồn Đủ ĐK không thể nhỏ hơn số lượng Đã Giữ (${lot.reservedQty}).`,
      });
    }
    lot.qualifiedQty = nextQty;
    const saved = saveState(state);
    res.json({ lot, state: toClientState(saved, activeUser) });
  });

  // Advance Dispatch waypoint
  app.post('/api/dispatch/:orderId/advance', requireAuth, (req: AuthedRequest, res) => {
    const state = ensureState();
    const activeUser = (state.users ?? []).find((u) => u.id === req.authUser?.id);
    const order = state.salesOrders.find((o) => o.id === req.params.orderId);
    if (!order) {
      return res.status(404).json({ error: 'Không tìm thấy đơn điều phối.' });
    }
    const nowIso = new Date().toISOString();
    const activeIdx = order.dispatchWaypoints.findIndex((w) => w.status === 'active');

    if (activeIdx === -1) {
      const firstPending = order.dispatchWaypoints.findIndex((w) => w.status === 'pending');
      if (firstPending !== -1) {
        order.dispatchWaypoints[firstPending].status = 'active';
        order.dispatchWaypoints[firstPending].timestampIso = nowIso;
        order.status = 'Đang giao';
      }
    } else {
      order.dispatchWaypoints[activeIdx].status = 'cleared';
      order.dispatchWaypoints[activeIdx].timestampIso = nowIso;
      const nextIdx = activeIdx + 1;
      if (nextIdx < order.dispatchWaypoints.length) {
        order.dispatchWaypoints[nextIdx].status = 'active';
        order.dispatchWaypoints[nextIdx].timestampIso = nowIso;
        order.status = 'Đang giao';
      } else {
        order.status = 'Đã giao';
        for (const line of order.items) {
          if (line.allocatedLotId && line.reservedQtyForOrder > 0) {
            const lot = state.fefoLots.find((l) => l.lotId === line.allocatedLotId);
            if (lot) {
              lot.qualifiedQty = Math.max(0, lot.qualifiedQty - line.reservedQtyForOrder);
              lot.reservedQty = Math.max(0, lot.reservedQty - line.reservedQtyForOrder);
            }
          }
        }
      }
    }

    order.history.unshift({
      id: `h-${Date.now()}`,
      timestampIso: nowIso,
      actor: activeUser?.profile.fullName || 'Điều phối',
      action: 'Cập nhật chặng giao',
      detail: `Chuyển trạng thái đơn ${order.id} sang [${order.status}].`,
    });

    const saved = saveState(state);
    res.json({ order, state: toClientState(saved, activeUser) });
  });

  // Update User Profile & Settings (persisted to active UserAccount)
  app.patch('/api/profile', requireAuth, (req: AuthedRequest, res) => {
    const state = ensureState();
    const user = (state.users ?? []).find((u) => u.id === req.authUser?.id);
    if (!user) {
      return res.status(401).json({ error: 'Không tìm thấy tài khoản.' });
    }
    const body = req.body as Partial<UserProfile>;

    if (typeof body.fullName === 'string') {
      if (!body.fullName.trim()) {
        return res.status(400).json({ error: 'Vui lòng nhập họ và tên nhân viên.' });
      }
      user.profile.fullName = body.fullName.trim();
    }
    if (typeof body.employeeCode === 'string' && body.employeeCode.trim()) {
      user.profile.employeeCode = body.employeeCode.trim();
    }
    if (typeof body.email === 'string' && body.email.trim()) {
      user.profile.email = body.email.trim().toLowerCase();
      user.email = user.profile.email;
    }
    const incomingRole = body.defaultRole as string | undefined;
    if (typeof incomingRole === 'string') {
      if (incomingRole === 'management') {
        user.profile.defaultRole = 'overview';
      } else if (VALID_ADMIN_TABS.includes(incomingRole as AdminTabId)) {
        user.profile.defaultRole = incomingRole as AdminTabId;
      }
    }
    if (
      body.defaultWarehouseCode === 'TB-01' ||
      body.defaultWarehouseCode === 'BD-02' ||
      body.defaultWarehouseCode === 'DN-03'
    ) {
      user.profile.defaultWarehouseCode = body.defaultWarehouseCode;
    }
    if (body.settings && typeof body.settings === 'object') {
      user.profile.settings = {
        liquidGlass:
          typeof body.settings.liquidGlass === 'boolean'
            ? body.settings.liquidGlass
            : user.profile.settings.liquidGlass,
        fefoAlerts:
          typeof body.settings.fefoAlerts === 'boolean'
            ? body.settings.fefoAlerts
            : user.profile.settings.fefoAlerts,
        actionToasts:
          typeof body.settings.actionToasts === 'boolean'
            ? body.settings.actionToasts
            : user.profile.settings.actionToasts,
      };
    }

    state.profile = user.profile;
    const saved = saveState(state);
    res.json({ profile: user.profile, state: toClientState(saved, user) });
  });

  // Reset operational ledger while preserving registered user accounts & active sessions
  app.post('/api/reset', requireAuth, (req: AuthedRequest, res) => {
    const current = ensureState();
    const activeUser = (current.users ?? []).find((u) => u.id === req.authUser?.id);
    const fresh = createInitialMobileState();
    fresh.users = current.users && current.users.length > 0 ? current.users : fresh.users;
    fresh.sessions = current.sessions ?? [];
    fresh.profile = activeUser ? activeUser.profile : fresh.profile;

    const saved = saveState(fresh);
    res.json(toClientState(saved, activeUser));
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sovereign Admin server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
