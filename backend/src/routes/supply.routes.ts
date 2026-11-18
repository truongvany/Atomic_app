import { Router } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAuth } from '../modules/auth.js';
import {
  adjustLot,
  advanceDispatch,
  cancelOrder,
  createOrder,
  createPurchaseOrder,
  decideApproval,
  getState,
  listLots,
  receivePurchaseOrder,
  reserveFefo,
  resolveShortage,
} from '../modules/supply.js';

export const supplyRouter = Router();

supplyRouter.get('/state', asyncHandler(requireAuth), asyncHandler(getState));
supplyRouter.get('/products', asyncHandler(requireAuth), asyncHandler(async (_req, res) => {
  const { getDatabase } = await import('../lib/mongo.js');
  const db = await getDatabase();
  res.json({ products: await db.collection('products').find({}).sort({ sku: 1 }).toArray() });
}));
supplyRouter.get('/fefo-lots', asyncHandler(requireAuth), asyncHandler(listLots));
supplyRouter.patch('/fefo-lots/:lotId', asyncHandler(requireAuth), asyncHandler(adjustLot));
supplyRouter.post('/sales-orders', asyncHandler(requireAuth), asyncHandler(createOrder));
supplyRouter.post('/sales-orders/:id/reserve-fefo', asyncHandler(requireAuth), asyncHandler(reserveFefo));
supplyRouter.post('/sales-orders/:id/resolve-shortage', asyncHandler(requireAuth), asyncHandler(resolveShortage));
supplyRouter.post('/sales-orders/:id/cancel', asyncHandler(requireAuth), asyncHandler(cancelOrder));
supplyRouter.get('/purchase-orders', asyncHandler(requireAuth), asyncHandler(async (_req, res) => {
  const { getDatabase } = await import('../lib/mongo.js');
  const db = await getDatabase();
  res.json({ purchaseOrders: await db.collection('purchaseOrders').find({}).sort({ createdAt: -1 }).toArray() });
}));
supplyRouter.post('/purchase-orders', asyncHandler(requireAuth), asyncHandler(createPurchaseOrder));
supplyRouter.post('/purchase-orders/:id/receive', asyncHandler(requireAuth), asyncHandler(receivePurchaseOrder));
supplyRouter.post('/approvals/:id/decide', asyncHandler(requireAuth), asyncHandler(decideApproval));
supplyRouter.post('/dispatch/:orderId/advance', asyncHandler(requireAuth), asyncHandler(advanceDispatch));
