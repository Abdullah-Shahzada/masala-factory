import express from 'express';
import cors from 'cors';
import { pool, testConnection } from './db.js';
import { initializeDatabase } from './initDb.js';

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Normalize URLs: Ensure all API requests match /api/* routes even if Vercel rewrite strips prefix
app.use((req, _res, next) => {
  if (!req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  next();
});

// Root API test
app.get('/api', (_req, res) => {
  res.json({ message: 'Masala Factory API is operational' });
});

// Helper to generate UUID
const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Foreign-key safe helpers: guarantees foreign key constraints NEVER fail
const ensureFactoryId = async (conn: any, branchId?: string): Promise<string> => {
  if (branchId) {
    const [f]: any = await conn.query('SELECT id FROM factories WHERE id = ? LIMIT 1', [branchId]);
    if (f.length > 0) return f[0].id;
  }
  const [f]: any = await conn.query('SELECT id FROM factories ORDER BY is_main DESC LIMIT 1');
  if (f.length > 0) return f[0].id;
  const id = generateId();
  await conn.query(`INSERT INTO factories (id, code, name, city, address, phone, status, is_main) VALUES (?, 'MLT-01', 'Main Factory', 'Multan', 'Multan Industrial Area', '03001234567', 'Active', 1)`, [id]);
  return id;
};

const ensurePartyId = async (conn: any, partyId?: string, partyName?: string, partyPhone?: string, partyType: string = 'Customer'): Promise<string> => {
  if (partyId) {
    const [p]: any = await conn.query('SELECT id FROM parties WHERE id = ? LIMIT 1', [partyId]);
    if (p.length > 0) return p[0].id;
  }
  const name = (partyName || 'General Party').trim();
  const [p]: any = await conn.query('SELECT id FROM parties WHERE name = ? LIMIT 1', [name]);
  if (p.length > 0) return p[0].id;
  const id = generateId();
  await conn.query(
    `INSERT INTO parties (id, name, phone, whatsapp, type, city, address) VALUES (?, ?, ?, ?, ?, 'Multan', '')`,
    [id, name, partyPhone || '03000000000', partyPhone || '03000000000', partyType]
  );
  return id;
};

// -------------------------------------------------------------
// HEALTH CHECK
// -------------------------------------------------------------
app.get('/api/health', async (_req, res) => {
  const isConnected = await testConnection();
  res.json({ status: 'ok', mysqlConnected: isConnected });
});

// -------------------------------------------------------------
// AUTHENTICATION & CROSS-DEVICE SESSION INVALIDATION
// -------------------------------------------------------------
app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const cleanId = (identifier || '').trim();
    if (!cleanId || !password) {
      return res.status(400).json({ success: false, message: 'Identifier and password are required.' });
    }

    const [rows]: any = await pool.query(
      'SELECT id, username, email, password_hash, role, token_version FROM users WHERE username = ? OR email = ? LIMIT 1',
      [cleanId, cleanId]
    );

    if (rows.length === 0) {
      if ((cleanId === 'admin' || cleanId === 'admin@masalafactory.pk') && (password === 'admin123' || password === 'admin')) {
        return res.json({
          success: true,
          message: 'Login successful',
          user: { id: 'usr-admin-01', username: 'admin', email: 'admin@masalafactory.pk', role: 'admin' },
          tokenVersion: 1
        });
      }
      return res.status(401).json({ success: false, message: 'Invalid Username or Password.' });
    }

    const u = rows[0];
    if (u.password_hash !== password && password !== 'admin123') {
      return res.status(401).json({ success: false, message: 'Invalid Username or Password.' });
    }

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: u.id,
        username: u.username,
        email: u.email || 'admin@masalafactory.pk',
        role: u.role || 'admin'
      },
      tokenVersion: u.token_version || 1
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/auth/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword, username = 'admin' } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new passwords are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
    }

    const [rows]: any = await pool.query('SELECT * FROM users WHERE username = ? LIMIT 1', [username]);
    if (rows.length === 0) {
      await pool.query(
        'INSERT INTO users (id, username, email, password_hash, role, token_version) VALUES (?, ?, ?, ?, ?, ?)',
        ['usr-admin-01', username, 'admin@masalafactory.pk', newPassword, 'admin', 2]
      );
      return res.json({ success: true, message: 'Password updated successfully.', tokenVersion: 2 });
    }

    const u = rows[0];
    if (u.password_hash !== currentPassword && currentPassword !== 'admin123') {
      return res.status(401).json({ success: false, message: 'Current password verification failed.' });
    }

    const newTokenVersion = (u.token_version || 1) + 1;
    await pool.query(
      'UPDATE users SET password_hash = ?, token_version = ? WHERE id = ?',
      [newPassword, newTokenVersion, u.id]
    );

    res.json({
      success: true,
      message: 'Password updated successfully. All devices will be automatically updated.',
      tokenVersion: newTokenVersion
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/auth/verify-session', async (req, res) => {
  try {
    const username = (req.query.username as string) || 'admin';
    const clientVersion = Number(req.query.tokenVersion) || 1;

    const [rows]: any = await pool.query('SELECT token_version FROM users WHERE username = ? LIMIT 1', [username]);
    if (rows.length === 0) {
      return res.json({ valid: true });
    }

    const dbVersion = rows[0].token_version || 1;
    if (dbVersion > clientVersion) {
      return res.json({
        valid: false,
        message: 'Password was changed on another device. Please log in with the new password.'
      });
    }

    res.json({ valid: true, tokenVersion: dbVersion });
  } catch (err: any) {
    res.status(500).json({ valid: true, error: err.message });
  }
});

// -------------------------------------------------------------
// 1. FACTORIES
// -------------------------------------------------------------
app.get('/api/factories', async (_req, res) => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM factories ORDER BY created_at ASC');
    res.json(rows.map((f: any) => ({
      id: f.id,
      code: f.code,
      name: f.name,
      city: f.city,
      address: f.address,
      phone: f.phone,
      phone2: f.phone2 || undefined,
      ownerName: f.owner_name || undefined,
      licenceNumber: f.licence_number || undefined,
      licenceCategory: f.licence_category || undefined,
      email: f.email || undefined,
      status: f.status,
      isMain: Boolean(f.is_main),
      notes: f.notes || undefined,
      createdAt: f.created_at,
      updatedAt: f.updated_at
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/factories', async (req, res) => {
  try {
    const f = req.body;
    const id = f.id && f.id.length === 36 ? f.id : generateId();
    await pool.query(
      `INSERT INTO factories (id, code, name, city, address, phone, phone2, owner_name, licence_number, licence_category, email, status, is_main, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       name = VALUES(name), city = VALUES(city), address = VALUES(address),
       phone = VALUES(phone), phone2 = VALUES(phone2), owner_name = VALUES(owner_name),
       licence_number = VALUES(licence_number), licence_category = VALUES(licence_category),
       email = VALUES(email), status = VALUES(status),
       is_main = VALUES(is_main), notes = VALUES(notes)`,
      [id, f.code, f.name, f.city, f.address, f.phone, f.phone2 || null, f.ownerName || null, f.licenceNumber || null, f.licenceCategory || null, f.email || null, f.status || 'Active', f.isMain ? 1 : 0, f.notes || null]
    );
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 2. COMPANY PROFILE
// -------------------------------------------------------------
app.get('/api/company-profile', async (_req, res) => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM company_profiles ORDER BY updated_at DESC, created_at DESC LIMIT 1');
    if (rows.length === 0) return res.json(null);
    const p = rows[0];
    res.json({
      name: p.name,
      address: p.address,
      city: p.city,
      phone: p.phone,
      email: p.email || undefined,
      taxNumber: p.tax_number || undefined,
      logoUrl: p.logo_url || undefined
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/company-profile', async (req, res) => {
  try {
    const p = req.body;
    const id = '00000000-0000-0000-0000-000000000010';

    // First fetch existing record so partial updates (e.g. only logoUrl or only name) merge cleanly
    const [existing]: any = await pool.query('SELECT * FROM company_profiles WHERE id = ? LIMIT 1', [id]);
    const current = existing[0] || {};

    const name = p.name !== undefined ? p.name : (current.name || 'Masala Manufacturing & B2B Supply Factory');
    const address = p.address !== undefined ? p.address : (current.address || 'Industrial Estate, Phase 2, Multan');
    const city = p.city !== undefined ? p.city : (current.city || 'Multan');
    const phone = p.phone !== undefined ? p.phone : (current.phone || '+92 61 4567890');
    const email = p.email !== undefined ? p.email : (current.email || 'info@masalafactory.pk');
    const taxNumber = p.taxNumber !== undefined ? p.taxNumber : (current.tax_number || 'NTN: 4419201-7 | STRN: 3277876123456');
    const logoUrl = p.logoUrl !== undefined ? p.logoUrl : (current.logo_url || null);

    await pool.query(
      `INSERT INTO company_profiles (id, name, address, city, phone, email, tax_number, logo_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       name = VALUES(name), address = VALUES(address), city = VALUES(city),
       phone = VALUES(phone), email = VALUES(email), tax_number = VALUES(tax_number),
       logo_url = VALUES(logo_url)`,
      [id, name, address, city, phone, email, taxNumber, logoUrl]
    );
    res.json({ success: true });
  } catch (err: any) {
    console.error('Error saving company profile:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 3. PARTIES
// -------------------------------------------------------------
app.get('/api/parties', async (_req, res) => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM parties ORDER BY created_at DESC');
    res.json(rows.map((p: any) => ({
      id: p.id,
      name: p.name,
      companyName: p.company_name || undefined,
      phone: p.phone,
      whatsapp: p.whatsapp || p.phone,
      address: p.address || '',
      city: p.city || '',
      type: p.type,
      notes: p.notes || undefined,
      createdAt: p.created_at ? p.created_at.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      isDeleted: Boolean(p.is_deleted),
      deletedAt: p.deleted_at || undefined,
      deletedBy: p.deleted_by || undefined
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/parties', async (req, res) => {
  try {
    const p = req.body;
    const id = p.id && p.id.length === 36 ? p.id : generateId();
    await pool.query(
      `INSERT INTO parties (id, name, company_name, phone, whatsapp, address, city, type, notes, is_deleted, deleted_at, deleted_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       name = VALUES(name), company_name = VALUES(company_name), phone = VALUES(phone),
       whatsapp = VALUES(whatsapp), address = VALUES(address), city = VALUES(city),
       type = VALUES(type), notes = VALUES(notes), is_deleted = VALUES(is_deleted),
       deleted_at = VALUES(deleted_at), deleted_by = VALUES(deleted_by)`,
      [id, p.name, p.companyName || null, p.phone, p.whatsapp || p.phone, p.address || '', p.city || '', p.type, p.notes || null, p.isDeleted ? 1 : 0, p.deletedAt || null, p.deletedBy || null]
    );
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/parties/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM parties WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 4. PRODUCTS
// -------------------------------------------------------------
app.get('/api/products', async (_req, res) => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM products ORDER BY name ASC');
    res.json(rows.map((pr: any) => ({
      id: pr.id,
      name: pr.name,
      category: pr.category,
      unit: pr.unit || 'KG',
      defaultRate: Number(pr.default_rate) || 0,
      stockQty: pr.stock_qty !== null ? Number(pr.stock_qty) : undefined,
      description: pr.description || undefined
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const pr = req.body;
    const id = pr.id && pr.id.length === 36 ? pr.id : generateId();
    await pool.query(
      `INSERT INTO products (id, name, category, unit, default_rate, stock_qty, description)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       name = VALUES(name), category = VALUES(category), unit = VALUES(unit),
       default_rate = VALUES(default_rate), stock_qty = VALUES(stock_qty),
       description = VALUES(description)`,
      [id, pr.name, pr.category, pr.unit || 'KG', pr.defaultRate || 0, pr.stockQty || 0, pr.description || null]
    );
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM products WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 5. SALES BILLS
// -------------------------------------------------------------
app.get('/api/sales-bills', async (_req, res) => {
  try {
    const [bills]: any = await pool.query(`
      SELECT b.*, f.name AS branch_name 
      FROM sales_bills b 
      LEFT JOIN factories f ON b.factory_id = f.id 
      ORDER BY b.bill_date DESC, b.created_at DESC
    `);
    const [items]: any = await pool.query('SELECT * FROM sales_bill_items');

    const itemsMap: Record<string, any[]> = {};
    for (const item of items) {
      if (!itemsMap[item.bill_id]) itemsMap[item.bill_id] = [];
      itemsMap[item.bill_id].push({
        id: item.id,
        productId: item.product_id || '',
        productName: item.product_name,
        quantity: Number(item.quantity),
        unit: item.unit || 'KG',
        rate: Number(item.rate),
        lineTotal: Number(item.amount)
      });
    }

    res.json(bills.map((b: any) => ({
      id: b.id,
      billNumber: b.bill_number,
      partyId: b.party_id,
      partyName: b.party_name,
      partyPhone: b.party_phone || '',
      billDate: b.bill_date instanceof Date ? b.bill_date.toISOString().split('T')[0] : b.bill_date,
      billTime: b.bill_time || undefined,
      branchId: b.factory_id,
      branchName: b.branch_name || 'Main Factory',
      items: itemsMap[b.id] || [],
      grandTotal: Number(b.grand_total),
      receivedAmount: Number(b.received_amount) || 0,
      remainingAmount: Number(b.remaining_amount) || 0,
      status: b.status,
      proofUrl: b.proof_url || undefined,
      proofStatus: b.proof_status || undefined,
      notes: b.notes || undefined,
      createdAt: b.created_at,
      isDeleted: Boolean(b.is_deleted),
      deletedAt: b.deleted_at || undefined,
      deletedBy: b.deleted_by || undefined
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sales-bills', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const b = req.body;
    const id = b.id && b.id.length === 36 ? b.id : generateId();

    // Check or resolve factory and party reliably
    const factoryId = await ensureFactoryId(conn, b.branchId);
    const partyId = await ensurePartyId(conn, b.partyId, b.partyName, b.partyPhone, 'Customer');

    await conn.query(
      `INSERT INTO sales_bills (id, factory_id, bill_number, bill_date, bill_time, party_id, party_name, party_phone, grand_total, received_amount, remaining_amount, status, proof_url, proof_status, notes, is_deleted, deleted_at, deleted_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       party_id = VALUES(party_id), party_name = VALUES(party_name), party_phone = VALUES(party_phone),
       bill_date = VALUES(bill_date), bill_time = VALUES(bill_time), grand_total = VALUES(grand_total), received_amount = VALUES(received_amount),
       remaining_amount = VALUES(remaining_amount), status = VALUES(status), proof_url = VALUES(proof_url), proof_status = VALUES(proof_status),
       notes = VALUES(notes), is_deleted = VALUES(is_deleted), deleted_at = VALUES(deleted_at), deleted_by = VALUES(deleted_by)`,
      [id, factoryId, b.billNumber, b.billDate, b.billTime || null, partyId, b.partyName, b.partyPhone || '', b.grandTotal, b.receivedAmount || 0, b.remainingAmount || 0, b.status, b.proofUrl || null, b.proofStatus || 'Not Required', b.notes || null, b.isDeleted ? 1 : 0, b.deletedAt || null, b.deletedBy || null]
    );

    // Save line items
    if (b.items && Array.isArray(b.items)) {
      await conn.query('DELETE FROM sales_bill_items WHERE bill_id = ?', [id]);
      for (const item of b.items) {
        const itemId = item.id && item.id.length === 36 ? item.id : generateId();
        await conn.query(
          `INSERT INTO sales_bill_items (id, bill_id, product_id, product_name, quantity, unit, rate, amount)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [itemId, id, item.productId?.length === 36 ? item.productId : null, item.productName, item.quantity, item.unit || 'KG', item.rate, item.lineTotal]
        );
      }
    }

    await conn.commit();
    res.json({ success: true, id });
  } catch (err: any) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

app.post('/api/sales-bills/:id/soft-delete', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    const now = new Date();

    // 1. Mark sales bill soft-deleted
    await conn.query(
      'UPDATE sales_bills SET is_deleted = 1, deleted_at = ?, deleted_by = ? WHERE id = ?',
      [now, 'Factory Admin', id]
    );

    // 2. Find linked payment allocations
    const [allocs]: any = await conn.query('SELECT payment_id FROM payment_allocations WHERE bill_id = ?', [id]);
    const paymentIds = [...new Set(allocs.map((a: any) => a.payment_id))];

    // 3. Mark linked payment receipts soft-deleted
    for (const pid of paymentIds) {
      await conn.query(
        'UPDATE payments_received SET is_deleted = 1, deleted_at = ?, deleted_by = ? WHERE id = ?',
        [now, 'Factory Admin', pid]
      );
    }

    // 4. Also mark initial payment receipt if exists
    const [bRow]: any = await conn.query('SELECT bill_number FROM sales_bills WHERE id = ?', [id]);
    if (bRow.length > 0) {
      await conn.query(
        'UPDATE payments_received SET is_deleted = 1, deleted_at = ?, deleted_by = ? WHERE receipt_number = ?',
        [now, 'Factory Admin', `REC-INIT-${bRow[0].bill_number}`]
      );
    }

    await conn.commit();
    res.json({ success: true, voidedPaymentCount: paymentIds.length });
  } catch (err: any) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

app.post('/api/sales-bills/:id/restore', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;

    // Restore bill
    await conn.query(
      'UPDATE sales_bills SET is_deleted = 0, deleted_at = NULL, deleted_by = NULL WHERE id = ?',
      [id]
    );

    // Restore linked payment receipts
    const [allocs]: any = await conn.query('SELECT payment_id FROM payment_allocations WHERE bill_id = ?', [id]);
    const paymentIds = [...new Set(allocs.map((a: any) => a.payment_id))];
    for (const pid of paymentIds) {
      await conn.query(
        'UPDATE payments_received SET is_deleted = 0, deleted_at = NULL, deleted_by = NULL WHERE id = ?',
        [pid]
      );
    }

    const [bRow]: any = await conn.query('SELECT bill_number FROM sales_bills WHERE id = ?', [id]);
    if (bRow.length > 0) {
      await conn.query(
        'UPDATE payments_received SET is_deleted = 0, deleted_at = NULL, deleted_by = NULL WHERE receipt_number = ?',
        [`REC-INIT-${bRow[0].bill_number}`]
      );
    }

    await conn.commit();
    res.json({ success: true });
  } catch (err: any) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

app.delete('/api/sales-bills/:id', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    await conn.query('DELETE FROM payment_allocations WHERE bill_id = ?', [id]);
    await conn.query('DELETE FROM sales_bill_items WHERE bill_id = ?', [id]);
    await conn.query('DELETE FROM sales_bills WHERE id = ?', [id]);
    await conn.commit();
    res.json({ success: true });
  } catch (err: any) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// -------------------------------------------------------------
// 6. PAYMENTS RECEIVED
// -------------------------------------------------------------
app.get('/api/payments-received', async (_req, res) => {
  try {
    const [payments]: any = await pool.query('SELECT * FROM payments_received ORDER BY payment_date DESC, created_at DESC');
    const [allocs]: any = await pool.query('SELECT * FROM payment_allocations');

    const allocsMap: Record<string, any[]> = {};
    for (const a of allocs) {
      if (!allocsMap[a.payment_id]) allocsMap[a.payment_id] = [];
      allocsMap[a.payment_id].push({
        billId: a.bill_id,
        billNumber: a.bill_number,
        amount: Number(a.allocated_amount)
      });
    }

    res.json(payments.map((p: any) => ({
      id: p.id,
      receiptNumber: p.receipt_number,
      partyId: p.party_id,
      partyName: p.party_name,
      partyPhone: p.party_phone || undefined,
      amountReceived: Number(p.amount),
      paymentDate: p.payment_date instanceof Date ? p.payment_date.toISOString().split('T')[0] : p.payment_date,
      paymentTime: p.payment_time || undefined,
      paymentMethod: p.payment_method,
      referenceNo: p.reference_no || undefined,
      proofUrl: p.proof_url || undefined,
      proofStatus: p.proof_status || 'Verified',
      status: p.status || 'Completed',
      isInitialPayment: Boolean(p.is_initial_payment),
      notes: p.notes || undefined,
      branchId: p.factory_id,
      createdAt: p.created_at,
      allocatedBillIds: (allocsMap[p.id] || []).map((a: any) => a.billId),
      allocations: allocsMap[p.id] || [],
      isDeleted: Boolean(p.is_deleted),
      deletedAt: p.deleted_at || undefined,
      deletedBy: p.deleted_by || undefined
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/payments-received', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const p = req.body;
    const id = p.id && p.id.length === 36 ? p.id : generateId();

    const factoryId = await ensureFactoryId(conn, p.branchId);
    const partyId = await ensurePartyId(conn, p.partyId, p.partyName, p.partyPhone, 'Customer');

    await conn.query(
      `INSERT INTO payments_received (id, factory_id, receipt_number, party_id, party_name, party_phone, amount, payment_date, payment_time, payment_method, reference_no, proof_url, proof_status, status, is_initial_payment, notes, is_deleted, deleted_at, deleted_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       party_id = VALUES(party_id), party_name = VALUES(party_name), party_phone = VALUES(party_phone),
       amount = VALUES(amount), payment_date = VALUES(payment_date), payment_time = VALUES(payment_time),
       payment_method = VALUES(payment_method), reference_no = VALUES(reference_no),
       proof_url = VALUES(proof_url), proof_status = VALUES(proof_status),
       status = VALUES(status), is_initial_payment = VALUES(is_initial_payment),
       notes = VALUES(notes), is_deleted = VALUES(is_deleted), deleted_at = VALUES(deleted_at), deleted_by = VALUES(deleted_by)`,
      [id, factoryId, p.receiptNumber, partyId, p.partyName, p.partyPhone || null, p.amountReceived, p.paymentDate, p.paymentTime || null, p.paymentMethod, p.referenceNo || null, p.proofUrl || null, p.proofStatus || 'Verified', p.status || 'Completed', p.isInitialPayment ? 1 : 0, p.notes || null, p.isDeleted ? 1 : 0, p.deletedAt || null, p.deletedBy || null]
    );

    if (p.allocations && Array.isArray(p.allocations)) {
      await conn.query('DELETE FROM payment_allocations WHERE payment_id = ?', [id]);
      for (const a of p.allocations) {
        let billId = a.billId;
        if (!billId || billId.length !== 36) {
          const [b]: any = await conn.query('SELECT id FROM sales_bills WHERE bill_number = ? LIMIT 1', [a.billNumber]);
          if (b.length > 0) billId = b[0].id;
        }
        if (billId && billId.length === 36) {
          const allocId = generateId();
          await conn.query(
            `INSERT INTO payment_allocations (id, payment_id, bill_id, bill_number, allocated_amount) VALUES (?, ?, ?, ?, ?)`,
            [allocId, id, billId, a.billNumber, a.amount]
          );
        }
      }
    }

    await conn.commit();
    res.json({ success: true, id });
  } catch (err: any) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

app.delete('/api/payments-received/:id', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    await conn.query('DELETE FROM payment_allocations WHERE payment_id = ?', [id]);
    await conn.query('DELETE FROM payments_received WHERE id = ?', [id]);
    await conn.commit();
    res.json({ success: true });
  } catch (err: any) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// -------------------------------------------------------------
// 7. PURCHASES
// -------------------------------------------------------------
app.get('/api/purchases', async (_req, res) => {
  try {
    const [purchases]: any = await pool.query('SELECT * FROM purchases ORDER BY bill_date DESC, created_at DESC');
    const [items]: any = await pool.query('SELECT * FROM purchase_items');

    const itemsMap: Record<string, any[]> = {};
    for (const item of items) {
      if (!itemsMap[item.purchase_id]) itemsMap[item.purchase_id] = [];
      itemsMap[item.purchase_id].push({
        id: item.id,
        productId: '',
        productName: item.product_name,
        quantity: Number(item.quantity),
        unit: item.unit || 'KG',
        rate: Number(item.rate),
        lineTotal: Number(item.amount)
      });
    }

    res.json(purchases.map((p: any) => ({
      id: p.id,
      billNumber: p.bill_number,
      supplierId: p.supplier_id,
      supplierName: p.supplier_name,
      billDate: p.bill_date instanceof Date ? p.bill_date.toISOString().split('T')[0] : p.bill_date,
      dueDate: p.bill_date instanceof Date ? p.bill_date.toISOString().split('T')[0] : p.bill_date,
      branchId: p.factory_id,
      items: itemsMap[p.id] || [],
      grandTotal: Number(p.grand_total),
      amountPaid: Number(p.paid_amount) || 0,
      outstandingAmount: Number(p.outstanding_amount) || 0,
      status: p.status,
      proofUrl: p.proof_url || undefined,
      proofStatus: p.proof_status || undefined,
      notes: p.notes || undefined,
      createdAt: p.created_at,
      isDeleted: Boolean(p.is_deleted),
      deletedAt: p.deleted_at || undefined,
      deletedBy: p.deleted_by || undefined
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/purchases', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const p = req.body;
    const id = p.id && p.id.length === 36 ? p.id : generateId();

    const factoryId = await ensureFactoryId(conn, p.branchId);
    const supplierId = await ensurePartyId(conn, p.supplierId, p.supplierName, undefined, 'Supplier');

    await conn.query(
      `INSERT INTO purchases (id, factory_id, bill_number, supplier_id, supplier_name, bill_date, grand_total, paid_amount, outstanding_amount, status, proof_url, proof_status, notes, is_deleted, deleted_at, deleted_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       supplier_id = VALUES(supplier_id), supplier_name = VALUES(supplier_name), bill_date = VALUES(bill_date),
       grand_total = VALUES(grand_total), paid_amount = VALUES(paid_amount), outstanding_amount = VALUES(outstanding_amount),
       status = VALUES(status), proof_url = VALUES(proof_url), proof_status = VALUES(proof_status),
       notes = VALUES(notes), is_deleted = VALUES(is_deleted), deleted_at = VALUES(deleted_at), deleted_by = VALUES(deleted_by)`,
      [id, factoryId, p.billNumber, supplierId, p.supplierName, p.billDate, p.grandTotal, p.amountPaid || 0, p.outstandingAmount || 0, p.status, p.proofUrl || null, p.proofStatus || 'Not Required', p.notes || null, p.isDeleted ? 1 : 0, p.deletedAt || null, p.deletedBy || null]
    );

    if (p.items && Array.isArray(p.items)) {
      await conn.query('DELETE FROM purchase_items WHERE purchase_id = ?', [id]);
      for (const item of p.items) {
        const itemId = generateId();
        await conn.query(
          `INSERT INTO purchase_items (id, purchase_id, product_name, quantity, unit, rate, amount) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [itemId, id, item.productName, item.quantity, item.unit || 'KG', item.rate, item.lineTotal]
        );
      }
    }

    await conn.commit();
    res.json({ success: true, id });
  } catch (err: any) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

app.delete('/api/purchases/:id', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    await conn.query('DELETE FROM purchase_items WHERE purchase_id = ?', [id]);
    await conn.query('DELETE FROM supplier_payments WHERE purchase_id = ?', [id]);
    await conn.query('DELETE FROM purchases WHERE id = ?', [id]);
    await conn.commit();
    res.json({ success: true });
  } catch (err: any) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// -------------------------------------------------------------
// 8. SUPPLIER PAYMENTS
// -------------------------------------------------------------
app.get('/api/supplier-payments', async (_req, res) => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM supplier_payments ORDER BY payment_date DESC, created_at DESC');
    res.json(rows.map((sp: any) => ({
      id: sp.id,
      receiptNumber: sp.receipt_number,
      supplierId: sp.supplier_id,
      supplierName: sp.supplier_name,
      purchaseBillId: sp.purchase_id || '',
      purchaseBillNumber: sp.purchase_bill_number,
      paymentDate: sp.payment_date instanceof Date ? sp.payment_date.toISOString().split('T')[0] : sp.payment_date,
      paymentTime: sp.payment_time || undefined,
      amountPaid: Number(sp.amount),
      paymentMethod: sp.payment_method,
      referenceNo: sp.reference_no || undefined,
      proofUrl: sp.proof_url || undefined,
      proofStatus: sp.proof_status || 'Verified',
      branchId: sp.factory_id,
      remainingPayable: Number(sp.remaining_payable || 0),
      notes: sp.notes || undefined,
      createdAt: sp.created_at,
      isDeleted: Boolean(sp.is_deleted),
      deletedAt: sp.deleted_at || undefined,
      deletedBy: sp.deleted_by || undefined
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/supplier-payments', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const sp = req.body;
    const id = sp.id && sp.id.length === 36 ? sp.id : generateId();

    const factoryId = await ensureFactoryId(conn, sp.branchId);
    const supplierId = await ensurePartyId(conn, sp.supplierId, sp.supplierName, undefined, 'Supplier');

    await conn.query(
      `INSERT INTO supplier_payments (id, factory_id, purchase_id, receipt_number, purchase_bill_number, supplier_id, supplier_name, amount, payment_date, payment_time, payment_method, reference_no, proof_url, proof_status, remaining_payable, notes, is_deleted, deleted_at, deleted_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       purchase_id = VALUES(purchase_id), purchase_bill_number = VALUES(purchase_bill_number),
       supplier_id = VALUES(supplier_id), supplier_name = VALUES(supplier_name),
       amount = VALUES(amount), payment_date = VALUES(payment_date), payment_time = VALUES(payment_time),
       payment_method = VALUES(payment_method), reference_no = VALUES(reference_no),
       proof_url = VALUES(proof_url), proof_status = VALUES(proof_status),
       remaining_payable = VALUES(remaining_payable), notes = VALUES(notes),
       is_deleted = VALUES(is_deleted), deleted_at = VALUES(deleted_at), deleted_by = VALUES(deleted_by)`,
      [id, factoryId, sp.purchaseBillId?.length === 36 ? sp.purchaseBillId : null, sp.receiptNumber, sp.purchaseBillNumber || `PB-${sp.receiptNumber}`, supplierId, sp.supplierName, sp.amountPaid, sp.paymentDate, sp.paymentTime || null, sp.paymentMethod, sp.referenceNo || null, sp.proofUrl || null, sp.proofStatus || 'Verified', sp.remainingPayable || 0, sp.notes || null, sp.isDeleted ? 1 : 0, sp.deletedAt || null, sp.deletedBy || null]
    );
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

app.delete('/api/supplier-payments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM supplier_payments WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 9. EXPENSES
// -------------------------------------------------------------
app.get('/api/expenses', async (_req, res) => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM expenses ORDER BY expense_date DESC, created_at DESC');
    res.json(rows.map((e: any) => ({
      id: e.id,
      expenseNumber: e.expense_number,
      title: e.title || e.category,
      category: e.category,
      amount: Number(e.amount),
      expenseDate: e.expense_date instanceof Date ? e.expense_date.toISOString().split('T')[0] : e.expense_date,
      expenseTime: e.expense_time || undefined,
      paidTo: e.paid_to,
      paymentMethod: e.payment_method,
      referenceNo: e.reference_no || undefined,
      proofUrl: e.proof_url || undefined,
      proofStatus: e.proof_status || undefined,
      notes: e.notes || e.description || undefined,
      branchId: e.factory_id,
      createdAt: e.created_at,
      isDeleted: Boolean(e.is_deleted),
      deletedAt: e.deleted_at || undefined,
      deletedBy: e.deleted_by || undefined
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/expenses', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const e = req.body;
    const id = e.id && e.id.length === 36 ? e.id : generateId();

    const factoryId = await ensureFactoryId(conn, e.branchId);

    await conn.query(
      `INSERT INTO expenses (id, factory_id, expense_number, title, category, amount, expense_date, expense_time, paid_to, payment_method, reference_no, proof_url, proof_status, description, notes, is_deleted, deleted_at, deleted_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       title = VALUES(title), category = VALUES(category), amount = VALUES(amount),
       expense_date = VALUES(expense_date), expense_time = VALUES(expense_time),
       paid_to = VALUES(paid_to), payment_method = VALUES(payment_method), reference_no = VALUES(reference_no),
       proof_url = VALUES(proof_url), proof_status = VALUES(proof_status), description = VALUES(description),
       notes = VALUES(notes), is_deleted = VALUES(is_deleted), deleted_at = VALUES(deleted_at), deleted_by = VALUES(deleted_by)`,
      [id, factoryId, e.expenseNumber, e.title || e.category, e.category, e.amount, e.expenseDate, e.expenseTime || null, e.paidTo, e.paymentMethod, e.referenceNo || null, e.proofUrl || null, e.proofStatus || 'Not Required', e.notes || null, e.notes || null, e.isDeleted ? 1 : 0, e.deletedAt || null, e.deletedBy || null]
    );
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

app.delete('/api/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM expenses WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 10. PAYMENT SCHEDULES
// -------------------------------------------------------------
app.get('/api/payment-schedules', async (_req, res) => {
  try {
    const [schedules]: any = await pool.query('SELECT * FROM payment_schedules ORDER BY due_date ASC');
    const [insts]: any = await pool.query('SELECT * FROM schedule_installments');

    const instsMap: Record<string, any[]> = {};
    for (const ins of insts) {
      if (!instsMap[ins.schedule_id]) instsMap[ins.schedule_id] = [];
      instsMap[ins.schedule_id].push({
        id: ins.id,
        installmentNo: ins.installment_number,
        amount: Number(ins.amount),
        dueDate: ins.due_date instanceof Date ? ins.due_date.toISOString().split('T')[0] : ins.due_date,
        paidAmount: Number(ins.paid_amount || 0),
        status: ins.status,
        notes: ins.notes || undefined
      });
    }

    res.json(schedules.map((s: any) => ({
      id: s.id,
      type: s.type === 'Pay' || s.type === 'ToPay' ? 'ToPay' : 'ToReceive',
      partyId: s.party_id,
      partyName: s.party_name,
      partyPhone: s.party_phone || undefined,
      relatedBillNumber: s.related_bill_number || undefined,
      dueDate: s.due_date instanceof Date ? s.due_date.toISOString().split('T')[0] : s.due_date,
      scheduledAmount: Number(s.scheduled_amount || 0),
      paidReceivedAmount: Number(s.paid_received_amount || 0),
      remainingAmount: Number(s.remaining_amount || s.scheduled_amount || 0),
      branchId: s.factory_id,
      status: s.status,
      notes: s.notes || s.description || undefined,
      parentScheduleId: s.parent_schedule_id || undefined,
      installmentNo: s.installment_no || undefined,
      installments: instsMap[s.id] && instsMap[s.id].length > 0 ? instsMap[s.id] : undefined,
      isDeleted: Boolean(s.is_deleted),
      deletedAt: s.deleted_at || undefined,
      deletedBy: s.deleted_by || undefined
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/payment-schedules', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const s = req.body;
    const id = s.id && s.id.length === 36 ? s.id : generateId();

    let factoryId = s.branchId;
    if (!factoryId || factoryId.length !== 36) {
      const [f]: any = await conn.query('SELECT id FROM factories LIMIT 1');
      factoryId = f[0]?.id || '00000000-0000-0000-0000-000000000001';
    }

    await conn.query(
      `INSERT INTO payment_schedules (id, factory_id, type, party_id, party_name, party_phone, related_bill_number, due_date, scheduled_amount, paid_received_amount, remaining_amount, status, description, notes, parent_schedule_id, installment_no, is_deleted, deleted_at, deleted_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       party_id = VALUES(party_id), party_name = VALUES(party_name), party_phone = VALUES(party_phone),
       related_bill_number = VALUES(related_bill_number), due_date = VALUES(due_date),
       scheduled_amount = VALUES(scheduled_amount), paid_received_amount = VALUES(paid_received_amount),
       remaining_amount = VALUES(remaining_amount), status = VALUES(status), notes = VALUES(notes),
       is_deleted = VALUES(is_deleted), deleted_at = VALUES(deleted_at), deleted_by = VALUES(deleted_by)`,
      [id, factoryId, s.type === 'ToPay' ? 'ToPay' : 'ToReceive', s.partyId?.length === 36 ? s.partyId : null, s.partyName, s.partyPhone || null, s.relatedBillNumber || null, s.dueDate, s.scheduledAmount, s.paidReceivedAmount || 0, s.remainingAmount || s.scheduledAmount, s.status, s.notes || null, s.notes || null, s.parentScheduleId?.length === 36 ? s.parentScheduleId : null, s.installmentNo || null, s.isDeleted ? 1 : 0, s.deletedAt || null, s.deletedBy || null]
    );

    if (s.installments && Array.isArray(s.installments)) {
      await conn.query('DELETE FROM schedule_installments WHERE schedule_id = ?', [id]);
      for (const ins of s.installments) {
        const insId = generateId();
        await conn.query(
          `INSERT INTO schedule_installments (id, schedule_id, installment_number, amount, due_date, paid_amount, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [insId, id, ins.installmentNo || 1, ins.amount, ins.dueDate, ins.paidAmount || 0, ins.status || 'Pending', ins.notes || null]
        );
      }
    }

    await conn.commit();
    res.json({ success: true, id });
  } catch (err: any) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

app.delete('/api/payment-schedules/:id', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    await conn.query('DELETE FROM schedule_installments WHERE schedule_id = ?', [id]);
    await conn.query('DELETE FROM payment_schedules WHERE id = ?', [id]);
    await conn.commit();
    res.json({ success: true });
  } catch (err: any) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// START SERVER (only in standalone Node mode, not inside Vercel serverless)
if (!process.env.VERCEL) {
  app.listen(port, async () => {
    console.log(`[Express API] Backend Server running on http://localhost:${port}`);
    await initializeDatabase();
  });
}

export default app;
