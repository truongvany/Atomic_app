import crypto from 'node:crypto';
import { getDatabase, closeDatabase } from './lib/mongo.js';

function hashPassword(password: string, salt: string) {
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
}

async function main() {
  const db = await getDatabase();
  const now = new Date();
  const warehouse = { _id: 'wh-tb-01', code: 'TB-01', name: 'Kho Tổng Tân Bình', address: 'TP. Hồ Chí Minh' };

  await db.collection('warehouses').updateOne({ code: warehouse.code }, { $setOnInsert: warehouse }, { upsert: true });

  const products = [
    { _id: 'prd-milk-01', sku: 'SKU-MILK-01', name: 'Sữa tươi Tiệt trùng Vinamilk 1L', unitLabel: 'hộp', unitPriceVnd: 32000 },
    { _id: 'prd-oil-02', sku: 'SKU-OIL-02', name: 'Dầu ăn cao cấp Simply 2L', unitLabel: 'chai', unitPriceVnd: 115000 },
  ];
  for (const product of products) {
    await db.collection('products').updateOne({ sku: product.sku }, { $setOnInsert: product }, { upsert: true });
  }

  await db.collection('inventoryLots').bulkWrite([
    {
      updateOne: {
        filter: { lotCode: 'LO-2024A', warehouseCode: 'TB-01' },
        update: {
          $setOnInsert: {
            _id: 'lot-2024-a',
            lotCode: 'LO-2024A',
            sku: 'SKU-MILK-01',
            productName: products[0].name,
            warehouseCode: 'TB-01',
            expiryDate: new Date('2026-12-31T00:00:00.000Z'),
            qualifiedQty: 320,
            reservedQty: 0,
            unitPriceVnd: 32000,
            createdAt: now,
          },
        },
        upsert: true,
      },
    },
    {
      updateOne: {
        filter: { lotCode: 'LO-2024B', warehouseCode: 'TB-01' },
        update: {
          $setOnInsert: {
            _id: 'lot-2024-b',
            lotCode: 'LO-2024B',
            sku: 'SKU-OIL-02',
            productName: products[1].name,
            warehouseCode: 'TB-01',
            expiryDate: new Date('2027-02-28T00:00:00.000Z'),
            qualifiedQty: 120,
            reservedQty: 0,
            unitPriceVnd: 115000,
            createdAt: now,
          },
        },
        upsert: true,
      },
    },
  ]);

  await db.collection('users').updateOne(
    { email: 'admin@sovereignsupply.vn' },
    {
      $setOnInsert: {
        _id: 'usr-admin-01',
        email: 'admin@sovereignsupply.vn',
        fullName: 'Nguyễn Minh Anh',
        employeeCode: 'ADM-TB01-01',
        passwordHash: hashPassword('admin123', 'atomic-admin-seed'),
        roles: ['ADMIN', 'APPROVER', 'WAREHOUSE'],
        defaultWarehouseCode: 'TB-01',
        defaultRole: 'overview',
        createdAt: now,
      },
    },
    { upsert: true }
  );

  await Promise.all([
    db.collection('users').createIndex({ email: 1 }, { unique: true }),
    db.collection('sessions').createIndex({ tokenHash: 1 }, { unique: true }),
    db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection('inventoryLots').createIndex({ sku: 1, warehouseCode: 1, expiryDate: 1 }),
  ]);

  console.log('Đã seed MongoDB cho Atomic Supply Chain.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closeDatabase());
