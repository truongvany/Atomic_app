import crypto from 'node:crypto';
import { z } from 'zod';
import type { Response } from 'express';
import { getDatabase } from '../lib/mongo.js';
import type { AuthenticatedRequest, AuthUser } from './auth.js';
import { profileForUser } from './auth.js';

const createOrderSchema = z.object({
  customerName: z.string().trim().min(1, 'Vui lòng nhập tên khách hàng.'),
  scheduledDeliveryLabel: z.string().trim().min(1).default('Ngày mai, 10:00'),
  notes: z.string().trim().default('Đơn bán hàng mới tạo từ Atomic Supply Chain.'),
  items: z
    .array(
      z.object({
        sku: z.string().trim().min(1),
        requestedQty: z.coerce.number().int().positive(),
      })
    )
    .min(1, 'Đơn hàng cần ít nhất 1 dòng sản phẩm.'),
});

const adjustLotSchema = z.object({
  deltaQualified: z.coerce.number().int().refine((value) => value !== 0, 'Số lượng thay đổi không được bằng 0.'),
});

function makeCode(prefix: string) {
  return `${prefix}-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

type LotDocument = {
  _id: string;
  lotCode: string;
  sku: string;
  productName: string;
  unitLabel: string;
  warehouseCode: string;
  expiryDate: Date;
  qualifiedQty: number;
  reservedQty: number;
  unitPriceVnd: number;
};

type SalesOrderLine = {
  sku: string;
  productName: string;
  unitLabel: string;
  unitPriceVnd: number;
  warehouseCode: string;
  requestedQty: number;
  reservedQtyForOrder: number;
  allocatedLotId: string | null;
};

type SalesOrderDocument = {
  _id: string;
  id: string;
  customerName: string;
  warehouseCode: string;
  warehouseName: string;
  scheduledDeliveryLabel: string;
  status: string;
  createdAtIso: string;
  createdAt: Date;
  notes: string;
  items: SalesOrderLine[];
  history: Array<Record<string, string>>;
  dispatchWaypoints: Array<Record<string, string | null>>;
};

type PurchaseOrderDocument = {
  _id: string;
  id: string;
  sourceOrderId: string | null;
  sku: string;
  productName: string;
  unitLabel: string;
  unitPriceVnd: number;
  warehouseCode: string;
  qty: number;
  supplierName: string;
  status: string;
  createdAtIso: string;
  createdAt: Date;
};

type ApprovalDocument = {
  _id: string;
  id: string;
  orderId: string;
  type: string;
  requestedBy: string;
  reason: string;
  status: string;
  createdAtIso: string;
  createdAt: Date;
};

function toClientLot(lot: LotDocument) {
  return {
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
  };
}

function toState(
  user: AuthUser,
  salesOrders: unknown[],
  fefoLots: unknown[]
): {
  profile: ReturnType<typeof profileForUser>;
  salesOrders: unknown[];
  fefoLots: unknown[];
  purchaseOrders: unknown[];
  approvals: unknown[];
  updatedAtIso: string;
} {
  return {
    profile: profileForUser(user),
    salesOrders,
    fefoLots,
    purchaseOrders: [],
    approvals: [],
    updatedAtIso: new Date().toISOString(),
  };
}

async function currentState(user: AuthUser) {
  const db = await getDatabase();
  const [orders, lots, purchaseOrders, approvals] = await Promise.all([
    db.collection<SalesOrderDocument>('salesOrders').find({}).sort({ createdAt: -1 }).toArray(),
    db.collection<LotDocument>('inventoryLots').find({}).sort({ expiryDate: 1 }).toArray(),
    db.collection<PurchaseOrderDocument>('purchaseOrders').find({}).sort({ createdAt: -1 }).toArray(),
    db.collection<ApprovalDocument>('approvals').find({}).sort({ createdAt: -1 }).toArray(),
  ]);
  const state = toState(user, orders, lots.map(toClientLot));
  state.purchaseOrders = purchaseOrders;
  state.approvals = approvals;
  return state;
}

export async function getState(req: AuthenticatedRequest, res: Response) {
  if (!req.authUser) {
    res.status(401).json({ error: 'Vui lòng đăng nhập.' });
    return;
  }
  res.json(await currentState(req.authUser));
}

export async function listLots(req: AuthenticatedRequest, res: Response) {
  const db = await getDatabase();
  const lots = await db
    .collection<LotDocument>('inventoryLots')
    .find(req.query.sku ? { sku: String(req.query.sku) } : {})
    .sort({ expiryDate: 1 })
    .toArray();
  res.json({ lots: lots.map(toClientLot) });
}

export async function adjustLot(req: AuthenticatedRequest, res: Response) {
  const input = adjustLotSchema.parse(req.body);
  const db = await getDatabase();
  const result = await db.collection<LotDocument>('inventoryLots').findOneAndUpdate(
    {
      lotCode: req.params.lotId,
      $expr: {
        $gte: [{ $add: ['$qualifiedQty', input.deltaQualified] }, '$reservedQty'],
      },
    },
    { $inc: { qualifiedQty: input.deltaQualified } },
    { returnDocument: 'after' }
  );

  if (!result) {
    res.status(400).json({ error: 'Không thể điều chỉnh tồn: số lượng không được thấp hơn số đã giữ.' });
    return;
  }

  if (req.authUser) {
    await db.collection('inventoryTransactions').insertOne({
      lotCode: req.params.lotId,
      quantity: input.deltaQualified,
      reason: 'MANUAL_ADJUSTMENT',
      actorId: req.authUser._id,
      createdAt: new Date(),
    });
    res.json({ state: await currentState(req.authUser) });
  }
}

export async function createOrder(req: AuthenticatedRequest, res: Response) {
  if (!req.authUser) {
    res.status(401).json({ error: 'Vui lòng đăng nhập.' });
    return;
  }
  const input = createOrderSchema.parse(req.body);
  const db = await getDatabase();
  const products = await db.collection('products').find({ sku: { $in: input.items.map((item) => item.sku) } }).toArray();
  const productBySku = new Map(products.map((product) => [product.sku as string, product]));
  const invalidSku = input.items.find((item) => !productBySku.has(item.sku));
  if (invalidSku) {
    res.status(400).json({ error: `Không tìm thấy sản phẩm ${invalidSku.sku}.` });
    return;
  }

  const orderId = makeCode('SO');
  const now = new Date();
  const items = input.items.map((item) => {
    const product = productBySku.get(item.sku)!;
    return {
      sku: item.sku,
      productName: product.name,
      unitLabel: product.unitLabel,
      unitPriceVnd: product.unitPriceVnd,
      warehouseCode: req.authUser!.defaultWarehouseCode,
      requestedQty: item.requestedQty,
      reservedQtyForOrder: 0,
      allocatedLotId: null,
    };
  });
  const order: SalesOrderDocument = {
    _id: orderId,
    id: orderId,
    customerName: input.customerName,
    warehouseCode: req.authUser.defaultWarehouseCode,
    warehouseName: req.authUser.defaultWarehouseCode,
    scheduledDeliveryLabel: input.scheduledDeliveryLabel,
    status: 'Nháp',
    createdAtIso: now.toISOString(),
    createdAt: now,
    notes: input.notes,
    items,
    history: [
      {
        id: `h-${crypto.randomUUID()}`,
        timestampIso: now.toISOString(),
        actor: req.authUser.fullName,
        action: 'Tạo đơn nháp',
        detail: `Tạo mới đơn ${orderId} cho ${input.customerName}.`,
      },
    ],
    dispatchWaypoints: [
      { id: 'wp-1', code: 'SOẠN', label: 'Soạn hàng FEFO', status: 'pending', timestampIso: null },
      { id: 'wp-2', code: 'TB-01', label: 'Xuất kho Tân Bình', status: 'pending', timestampIso: null },
      { id: 'wp-3', code: 'GIAO', label: 'Đang vận chuyển', status: 'pending', timestampIso: null },
      { id: 'wp-4', code: 'POD', label: 'Hoàn tất giao nhận', status: 'pending', timestampIso: null },
    ],
  };

  await db.collection<SalesOrderDocument>('salesOrders').insertOne(order);
  res.status(201).json({ order, state: await currentState(req.authUser) });
}

export async function reserveFefo(req: AuthenticatedRequest, res: Response) {
  if (!req.authUser) {
    res.status(401).json({ error: 'Vui lòng đăng nhập.' });
    return;
  }
  const db = await getDatabase();
  const order = await db.collection<SalesOrderDocument>('salesOrders').findOne({ id: req.params.id });
  if (!order) {
    res.status(404).json({ error: 'Không tìm thấy đơn bán hàng.' });
    return;
  }
  if (order.status !== 'Nháp') {
    res.status(400).json({ error: 'Đơn hàng này không còn ở trạng thái nháp.' });
    return;
  }

  const allocations: Array<{ sku: string; lotCode: string; quantity: number }> = [];
  try {
    for (const line of order.items) {
      let remaining = line.requestedQty;
      const lots = await db
        .collection<LotDocument>('inventoryLots')
        .find({ sku: line.sku, warehouseCode: line.warehouseCode, expiryDate: { $gt: new Date() } })
        .sort({ expiryDate: 1 })
        .toArray();

      for (const lot of lots) {
        if (remaining <= 0) break;
        const quantity = Math.min(remaining, lot.qualifiedQty - lot.reservedQty);
        if (quantity <= 0) continue;
        const updated = await db.collection<LotDocument>('inventoryLots').findOneAndUpdate(
          {
            _id: lot._id,
            $expr: { $gte: [{ $subtract: ['$qualifiedQty', '$reservedQty'] }, quantity] },
          },
          { $inc: { reservedQty: quantity } },
          { returnDocument: 'after' }
        );
        if (!updated) continue;
        allocations.push({ sku: line.sku, lotCode: lot.lotCode, quantity });
        remaining -= quantity;
      }

      if (remaining > 0) {
        throw new Error(`${line.productName} còn thiếu ${remaining} ${line.unitLabel}.`);
      }
    }
  } catch (error) {
    for (const allocation of allocations) {
      await db.collection('inventoryLots').updateOne(
        { lotCode: allocation.lotCode },
        { $inc: { reservedQty: -allocation.quantity } }
      );
    }
    res.status(400).json({ error: error instanceof Error ? `Không thể giữ FEFO: ${error.message}` : 'Không thể giữ FEFO.' });
    return;
  }

  const now = new Date();
  const updatedItems = order.items.map((line) => {
    const lineAllocation = allocations.find((allocation) => allocation.sku === line.sku);
    return {
      ...line,
      reservedQtyForOrder: line.requestedQty,
      allocatedLotId: lineAllocation?.lotCode ?? null,
    };
  });
  await db.collection<SalesOrderDocument>('salesOrders').updateOne(
    { id: order.id },
    {
      $set: {
        status: 'Đã giữ FEFO',
        items: updatedItems,
        updatedAt: now,
        'dispatchWaypoints.0.status': 'active',
        'dispatchWaypoints.0.timestampIso': now.toISOString(),
      },
      $push: {
        history: {
          id: `h-${crypto.randomUUID()}`,
          timestampIso: now.toISOString(),
          actor: req.authUser.fullName,
          action: 'Xác nhận & Giữ FEFO',
          detail: 'Đã giữ hàng theo lô FEFO sớm nhất.',
        },
      },
    }
  );
  res.json({
    order: await db.collection<SalesOrderDocument>('salesOrders').findOne({ id: order.id }),
    state: await currentState(req.authUser),
  });
}

const shortageSchema = z.object({
  sku: z.string().trim().min(1).optional(),
  strategy: z.enum(['adjust_qty', 'create_po', 'request_split']),
});

export async function resolveShortage(req: AuthenticatedRequest, res: Response) {
  if (!req.authUser) {
    res.status(401).json({ error: 'Vui lòng đăng nhập.' });
    return;
  }
  const input = shortageSchema.parse(req.body);
  const db = await getDatabase();
  const orders = db.collection<SalesOrderDocument>('salesOrders');
  const order = await orders.findOne({ id: req.params.id });
  if (!order) {
    res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });
    return;
  }

  const lines = input.sku ? order.items.filter((item) => item.sku === input.sku) : order.items;
  if (lines.length === 0) {
    res.status(400).json({ error: 'Không tìm thấy dòng hàng cần xử lý.' });
    return;
  }
  const now = new Date();
  const actor = req.authUser.fullName;
  const lots = db.collection<LotDocument>('inventoryLots');

  if (input.strategy === 'adjust_qty') {
    const updatedItems = [];
    for (const line of order.items) {
      if (!lines.includes(line)) {
        updatedItems.push(line);
        continue;
      }
      const availableLots = await lots
        .find({ sku: line.sku, warehouseCode: line.warehouseCode, expiryDate: { $gt: now } })
        .toArray();
      const available = availableLots.reduce(
        (total, lot) => total + Math.max(0, lot.qualifiedQty - lot.reservedQty),
        0
      );
      updatedItems.push({ ...line, requestedQty: Math.min(line.requestedQty, available) });
    }
    await orders.updateOne(
      { id: order.id },
      {
        $set: { items: updatedItems, updatedAt: now },
        $push: {
          history: {
            id: `h-${crypto.randomUUID()}`,
            timestampIso: now.toISOString(),
            actor,
            action: 'Điều chỉnh theo khả dụng',
            detail: 'Cập nhật số lượng theo tồn kho khả dụng.',
          },
        },
      }
    );
  } else if (input.strategy === 'create_po') {
    const purchaseOrders = db.collection<PurchaseOrderDocument>('purchaseOrders');
    for (const line of lines) {
      const availableLots = await lots
        .find({ sku: line.sku, warehouseCode: line.warehouseCode, expiryDate: { $gt: now } })
        .toArray();
      const available = availableLots.reduce(
        (total, lot) => total + Math.max(0, lot.qualifiedQty - lot.reservedQty),
        0
      );
      const shortage = Math.max(0, line.requestedQty - available);
      const existing = await purchaseOrders.findOne({
        sourceOrderId: order.id,
        sku: line.sku,
        status: { $ne: 'Đã nhập kho' },
      });
      if (shortage > 0 && !existing) {
        const poId = makeCode('PO');
        await purchaseOrders.insertOne({
          _id: poId,
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
          createdAtIso: now.toISOString(),
          createdAt: now,
        });
      }
    }
    await orders.updateOne(
      { id: order.id },
      {
        $set: { updatedAt: now },
        $push: {
          history: {
            id: `h-${crypto.randomUUID()}`,
            timestampIso: now.toISOString(),
            actor,
            action: 'Chuyển đề xuất Mua bù',
            detail: 'Đã tạo phiếu mua bổ sung cho phần thiếu.',
          },
        },
      }
    );
  } else {
    const approvalId = makeCode('APR');
    await db.collection<ApprovalDocument>('approvals').insertOne({
      _id: approvalId,
      id: approvalId,
      orderId: order.id,
      type: 'Tách giao thiếu hàng',
      requestedBy: actor,
      reason: `Đề xuất giao phần khả dụng cho đơn ${order.id} và giao bù phần thiếu.`,
      status: 'Chờ duyệt',
      createdAtIso: now.toISOString(),
      createdAt: now,
    });
    await orders.updateOne(
      { id: order.id },
      {
        $set: { status: 'Chờ duyệt', updatedAt: now },
        $push: {
          history: {
            id: `h-${crypto.randomUUID()}`,
            timestampIso: now.toISOString(),
            actor,
            action: 'Gửi duyệt tách giao',
            detail: `Đưa yêu cầu ${approvalId} vào hàng đợi phê duyệt.`,
          },
        },
      }
    );
  }

  res.json({ order: await orders.findOne({ id: order.id }), state: await currentState(req.authUser) });
}

export async function cancelOrder(req: AuthenticatedRequest, res: Response) {
  if (!req.authUser) {
    res.status(401).json({ error: 'Vui lòng đăng nhập.' });
    return;
  }
  const db = await getDatabase();
  const orders = db.collection<SalesOrderDocument>('salesOrders');
  const order = await orders.findOne({ id: req.params.id });
  if (!order) {
    res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });
    return;
  }

  for (const line of order.items) {
    if (line.allocatedLotId && line.reservedQtyForOrder > 0) {
      await db.collection<LotDocument>('inventoryLots').updateOne(
        { lotCode: line.allocatedLotId },
        { $inc: { reservedQty: -line.reservedQtyForOrder } }
      );
    }
  }
  const now = new Date();
  await orders.updateOne(
    { id: order.id },
    {
      $set: {
        status: 'Đã hủy',
        updatedAt: now,
        items: order.items.map((item) => ({ ...item, reservedQtyForOrder: 0 })),
      },
      $push: {
        history: {
          id: `h-${crypto.randomUUID()}`,
          timestampIso: now.toISOString(),
          actor: req.authUser.fullName,
          action: 'Hủy đơn & Quyết toán',
          detail: req.body?.reason?.trim() || 'Đơn hàng được hủy theo yêu cầu.',
        },
      },
    }
  );
  res.json({ order: await orders.findOne({ id: order.id }), state: await currentState(req.authUser) });
}

const purchaseOrderSchema = z.object({
  sku: z.string().trim().min(1),
  qty: z.coerce.number().int().positive(),
  supplierName: z.string().trim().min(1),
});

export async function createPurchaseOrder(req: AuthenticatedRequest, res: Response) {
  if (!req.authUser) {
    res.status(401).json({ error: 'Vui lòng đăng nhập.' });
    return;
  }
  const input = purchaseOrderSchema.parse(req.body);
  const db = await getDatabase();
  const product = await db.collection('products').findOne({ sku: input.sku });
  if (!product) {
    res.status(400).json({ error: `Không tìm thấy sản phẩm ${input.sku}.` });
    return;
  }
  const now = new Date();
  const id = makeCode('PO');
  await db.collection<PurchaseOrderDocument>('purchaseOrders').insertOne({
    _id: id,
    id,
    sourceOrderId: null,
    sku: input.sku,
    productName: String(product.name),
    unitLabel: String(product.unitLabel),
    unitPriceVnd: Number(product.unitPriceVnd),
    warehouseCode: req.authUser.defaultWarehouseCode,
    qty: input.qty,
    supplierName: input.supplierName,
    status: 'Chờ đặt hàng',
    createdAtIso: now.toISOString(),
    createdAt: now,
  });
  res.status(201).json({ state: await currentState(req.authUser) });
}

export async function receivePurchaseOrder(req: AuthenticatedRequest, res: Response) {
  if (!req.authUser) {
    res.status(401).json({ error: 'Vui lòng đăng nhập.' });
    return;
  }
  const db = await getDatabase();
  const purchaseOrders = db.collection<PurchaseOrderDocument>('purchaseOrders');
  const purchaseOrder = await purchaseOrders.findOne({ id: req.params.id });
  if (!purchaseOrder) {
    res.status(404).json({ error: 'Không tìm thấy phiếu mua.' });
    return;
  }
  if (purchaseOrder.status === 'Đã nhập kho') {
    res.status(400).json({ error: 'Phiếu mua này đã được nhập kho.' });
    return;
  }
  const now = new Date();
  await db.collection<LotDocument>('inventoryLots').insertOne({
    _id: `lot-${crypto.randomUUID()}`,
    lotCode: `${purchaseOrder.id}-LOT`,
    sku: purchaseOrder.sku,
    productName: purchaseOrder.productName,
    unitLabel: purchaseOrder.unitLabel,
    warehouseCode: purchaseOrder.warehouseCode,
    expiryDate: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
    qualifiedQty: purchaseOrder.qty,
    reservedQty: 0,
    unitPriceVnd: purchaseOrder.unitPriceVnd,
  });
  await purchaseOrders.updateOne({ id: purchaseOrder.id }, { $set: { status: 'Đã nhập kho', receivedAt: now } });
  res.json({ state: await currentState(req.authUser) });
}

export async function decideApproval(req: AuthenticatedRequest, res: Response) {
  if (!req.authUser) {
    res.status(401).json({ error: 'Vui lòng đăng nhập.' });
    return;
  }
  const decision = z.object({ decision: z.enum(['Đã duyệt', 'Từ chối']) }).parse(req.body);
  const db = await getDatabase();
  const approval = await db.collection<ApprovalDocument>('approvals').findOne({ id: req.params.id });
  if (!approval) {
    res.status(404).json({ error: 'Không tìm thấy yêu cầu phê duyệt.' });
    return;
  }
  await db.collection<ApprovalDocument>('approvals').updateOne(
    { id: approval.id },
    { $set: { status: decision.decision, decidedBy: req.authUser.fullName, decidedAt: new Date() } }
  );
  if (decision.decision === 'Từ chối') {
    await db.collection<SalesOrderDocument>('salesOrders').updateOne(
      { id: approval.orderId },
      { $set: { status: 'Đã hủy', updatedAt: new Date() } }
    );
  }
  res.json({ state: await currentState(req.authUser) });
}

export async function advanceDispatch(req: AuthenticatedRequest, res: Response) {
  if (!req.authUser) {
    res.status(401).json({ error: 'Vui lòng đăng nhập.' });
    return;
  }
  const db = await getDatabase();
  const orders = db.collection<SalesOrderDocument>('salesOrders');
  const order = await orders.findOne({ id: req.params.orderId });
  if (!order) {
    res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });
    return;
  }
  const activeIndex = order.dispatchWaypoints.findIndex((waypoint) => waypoint.status === 'active');
  const currentIndex = activeIndex >= 0 ? activeIndex : order.dispatchWaypoints.findIndex((waypoint) => waypoint.status === 'pending');
  if (currentIndex < 0) {
    res.status(400).json({ error: 'Đơn hàng đã hoàn tất điều phối.' });
    return;
  }

  const now = new Date();
  const waypoints = order.dispatchWaypoints.map((waypoint, index) => {
    if (index === currentIndex) return { ...waypoint, status: 'cleared', timestampIso: now.toISOString() };
    if (index === currentIndex + 1) return { ...waypoint, status: 'active', timestampIso: now.toISOString() };
    return waypoint;
  });
  const delivered = currentIndex === waypoints.length - 1;
  await orders.updateOne(
    { id: order.id },
    {
      $set: {
        dispatchWaypoints: waypoints,
        status: delivered ? 'Đã giao' : 'Đang giao',
        updatedAt: now,
      },
      $push: {
        history: {
          id: `h-${crypto.randomUUID()}`,
          timestampIso: now.toISOString(),
          actor: req.authUser.fullName,
          action: delivered ? 'Hoàn tất giao hàng' : 'Cập nhật chặng giao',
          detail: `Đã cập nhật chặng ${order.dispatchWaypoints[currentIndex].label}.`,
        },
      },
    }
  );
  res.json({ state: await currentState(req.authUser) });
}
