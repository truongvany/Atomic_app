import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { getDatabase } from '../lib/mongo.js';

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_COOKIE_NAME = 'atomic_session';

const registerSchema = z.object({
  fullName: z.string().trim().min(1, 'Vui lòng nhập họ và tên.'),
  email: z.string().trim().toLowerCase().email('Email công việc không hợp lệ.'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự.'),
  employeeCode: z.string().trim().min(1).optional(),
  defaultWarehouseCode: z.enum(['TB-01', 'BD-02', 'DN-03']).default('TB-01'),
  defaultRole: z.enum(['overview', 'sales', 'fefo', 'dispatch', 'purchasing']).default('overview'),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email công việc không hợp lệ.'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu.'),
});

export type AuthenticatedRequest = Request & {
  authUser?: AuthUser;
  authToken?: string;
};

export type AuthUser = {
  _id: string;
  email: string;
  fullName: string;
  employeeCode: string;
  roles: string[];
  defaultWarehouseCode: string;
  defaultRole?: string;
};

type StoredUser = AuthUser & {
  passwordHash: string;
  createdAt: Date;
};

function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')) {
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
}

function verifyPassword(password: string, storedHash: string) {
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(keyHex, 'hex');
  return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
}

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function roleForDefaultTab(defaultRole: z.infer<typeof registerSchema>['defaultRole']) {
  if (defaultRole === 'sales') return 'SALES';
  if (defaultRole === 'fefo') return 'WAREHOUSE';
  if (defaultRole === 'dispatch') return 'DISPATCH';
  return 'ADMIN';
}

export function profileForUser(user: AuthUser) {
  return {
    fullName: user.fullName,
    employeeCode: user.employeeCode,
    email: user.email,
    defaultRole: user.defaultRole ?? 'overview',
    defaultWarehouseCode: user.defaultWarehouseCode,
    settings: { liquidGlass: true, fefoAlerts: true, actionToasts: true },
  };
}

async function clientState(user: AuthUser) {
  const db = await getDatabase();
  const [salesOrders, lots] = await Promise.all([
    db.collection('salesOrders').find({}).sort({ createdAt: -1 }).toArray(),
    db.collection<{
      lotCode: string;
      sku: string;
      productName: string;
      unitLabel: string;
      unitPriceVnd: number;
      warehouseCode: string;
      expiryDate: Date;
      qualifiedQty: number;
      reservedQty: number;
    }>('inventoryLots').find({}).sort({ expiryDate: 1 }).toArray(),
  ]);

  return {
    profile: profileForUser(user),
    salesOrders,
    fefoLots: lots.map((lot) => ({
      lotId: lot.lotCode,
      sku: lot.sku,
      productName: lot.productName,
      unitLabel: lot.unitLabel,
      unitPriceVnd: lot.unitPriceVnd,
      warehouseCode: lot.warehouseCode,
      expiryLabel: `HSD ${lot.expiryDate.toISOString().slice(0, 7).split('-').reverse().join('/')}`,
      expirySortKey: lot.expiryDate.toISOString().slice(0, 10),
      qualifiedQty: lot.qualifiedQty,
      reservedQty: lot.reservedQty,
    })),
    purchaseOrders: [],
    approvals: [],
    updatedAtIso: new Date().toISOString(),
  };
}

function sanitizeUser(user: AuthUser) {
  return { id: user._id, email: user.email, profile: profileForUser(user) };
}

function setSessionCookie(res: Response, token: string) {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_MS / 1000}`
  );
}

function clearSessionCookie(res: Response) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
}

function extractToken(req: Request) {
  const authorization = req.headers.authorization;
  if (authorization?.startsWith('Bearer ')) return authorization.slice(7).trim() || null;
  const cookie = req.headers.cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`));
  return cookie ? decodeURIComponent(cookie.slice(SESSION_COOKIE_NAME.length + 1)) : null;
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: 'Vui lòng đăng nhập.' });
    return;
  }

  const db = await getDatabase();
  const session = await db.collection('sessions').findOne<{ userId: string; expiresAt: Date }>({
    tokenHash: hashToken(token),
  });
  if (!session || session.expiresAt <= new Date()) {
    res.status(401).json({ error: 'Phiên đăng nhập đã hết hạn.' });
    return;
  }

  const user = await db.collection<AuthUser & { passwordHash?: string }>('users').findOne({
    _id: session.userId,
  });
  if (!user) {
    res.status(401).json({ error: 'Tài khoản không tồn tại.' });
    return;
  }

  req.authUser = user;
  req.authToken = token;
  next();
}

export async function register(req: Request, res: Response) {
  const input = registerSchema.parse(req.body);
  const db = await getDatabase();
  const users = db.collection<any>('users');
  const warehouses = db.collection<{ code: string }>('warehouses');

  const warehouse = await warehouses.findOne({ code: input.defaultWarehouseCode });
  if (!warehouse) {
    res.status(400).json({ error: 'Kho mặc định không tồn tại.' });
    return;
  }

  if (await users.findOne({ email: input.email })) {
    res.status(409).json({ error: 'Email này đã được đăng ký. Vui lòng đăng nhập.' });
    return;
  }

  const userCount = await users.countDocuments();
  const user: AuthUser = {
    _id: crypto.randomUUID(),
    email: input.email,
    fullName: input.fullName,
    employeeCode: input.employeeCode || `ADM-${input.defaultWarehouseCode.split('-')[0]}-${String(userCount + 1).padStart(2, '0')}`,
    roles: [roleForDefaultTab(input.defaultRole)],
    defaultWarehouseCode: input.defaultWarehouseCode,
    defaultRole: input.defaultRole,
  };
  await users.insertOne({
    ...user,
    passwordHash: hashPassword(input.password),
    createdAt: new Date(),
  });

  const token = crypto.randomBytes(32).toString('hex');
  await db.collection('sessions').insertOne({
    tokenHash: hashToken(token),
    userId: user._id,
    expiresAt: new Date(Date.now() + SESSION_MAX_AGE_MS),
    createdAt: new Date(),
  });

  setSessionCookie(res, token);
  res.status(201).json({
    authenticated: true,
    token,
    user: sanitizeUser(user),
    state: await clientState(user),
  });
}

export async function login(req: Request, res: Response) {
  const input = loginSchema.parse(req.body);
  const db = await getDatabase();
  const user = await db.collection<AuthUser & { passwordHash: string }>('users').findOne({
    email: input.email,
  });

  if (!user || !verifyPassword(input.password, user.passwordHash)) {
    res.status(401).json({ error: 'Email hoặc mật khẩu chưa chính xác.' });
    return;
  }

  const token = crypto.randomBytes(32).toString('hex');
  await db.collection('sessions').insertOne({
    tokenHash: hashToken(token),
    userId: user._id,
    expiresAt: new Date(Date.now() + SESSION_MAX_AGE_MS),
    createdAt: new Date(),
  });

  setSessionCookie(res, token);
  res.json({
    authenticated: true,
    token,
    user: sanitizeUser(user),
    state: await clientState(user),
  });
}

export async function logout(req: Request, res: Response) {
  const token = extractToken(req);
  if (token) {
    const db = await getDatabase();
    await db.collection('sessions').deleteMany({ tokenHash: hashToken(token) });
  }
  clearSessionCookie(res);
  res.json({ authenticated: false });
}

export async function currentUser(req: AuthenticatedRequest, res: Response) {
  if (!req.authUser) {
    res.json({ authenticated: false, user: null });
    return;
  }
  res.json({
    authenticated: true,
    token: req.authToken,
    user: sanitizeUser(req.authUser),
    state: await clientState(req.authUser),
  });
}

export async function preview(_req: Request, res: Response) {
  const db = await getDatabase();
  const [totalOrders, totalLots] = await Promise.all([
    db.collection('salesOrders').countDocuments(),
    db.collection('inventoryLots').countDocuments(),
  ]);
  res.json({ totalLots, totalOrders, pendingApprovals: 0, activeDispatches: 0, sampleLots: [] });
}
