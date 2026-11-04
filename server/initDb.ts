import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const initializeDatabase = async () => {
  try {
    console.log('[MySQL] Initializing database tables...');
    const schemaSql = fs.readFileSync(path.resolve(__dirname, 'schema.sql'), 'utf8');

    // Split statements by semicolon
    const statements = schemaSql
      .split(/;\s*$/m)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const conn = await pool.getConnection();
    try {
      for (const statement of statements) {
        await conn.query(statement);
      }
      console.log('[MySQL] All database tables verified / created successfully.');

      // Safely ensure new columns exist in factories
      try { await conn.query('ALTER TABLE factories ADD COLUMN phone2 VARCHAR(50) NULL'); } catch {}
      try { await conn.query('ALTER TABLE factories ADD COLUMN owner_name VARCHAR(255) NULL'); } catch {}
      try { await conn.query('ALTER TABLE factories ADD COLUMN licence_number VARCHAR(100) NULL'); } catch {}
      try { await conn.query('ALTER TABLE factories ADD COLUMN licence_category VARCHAR(100) NULL'); } catch {}

      // Check if factories exist
      const [factories]: any = await conn.query('SELECT COUNT(*) as count FROM factories');
      if (factories[0].count === 0) {
        console.log('[MySQL] Seeding initial factories...');
        await conn.query(`
          INSERT INTO factories (id, code, name, city, address, phone, email, status, is_main, notes) VALUES
          ('00000000-0000-0000-0000-000000000001', 'MLT-01', 'Multan Main Processing Plant', 'Multan', 'Plot 12-A, Industrial Estate Phase II, Multan', '+92 61 6512345', 'processing.multan@masalafactory.pk', 'Active', 1, 'Primary spice cleaning, roasting, and packaging plant.'),
          ('00000000-0000-0000-0000-000000000002', 'MLT-02', 'Multan South Milling Facility', 'Multan', 'Shershah Bypass Road, Near Grain Market, Multan', '+92 61 6789012', 'milling.multan@masalafactory.pk', 'Active', 0, 'Secondary whole-spice pulverizing, milling, and warehouse.')
        `);
      }

      // Check if company profile exists
      const [profiles]: any = await conn.query('SELECT COUNT(*) as count FROM company_profiles');
      if (profiles[0].count === 0) {
        await conn.query(`
          INSERT INTO company_profiles (id, name, address, city, phone, email, tax_number) VALUES
          ('00000000-0000-0000-0000-000000000010', 'Masala Manufacturing & B2B Supply Factory', 'Plot 42-A, Industrial Estate Phase II', 'Multan', '+92 61 4567890', 'info@masalafactory.pk', 'NTN: 4419201-7 | STRN: 3277876123456')
        `);
      }

      // Check if parties exist
      const [parties]: any = await conn.query('SELECT COUNT(*) as count FROM parties');
      if (parties[0].count === 0) {
        console.log('[MySQL] Seeding initial parties...');
        await conn.query(`
          INSERT INTO parties (id, name, company_name, phone, whatsapp, address, city, type, notes) VALUES
          ('fc0928fb-a21c-4c8c-a77d-1aaa9e0c8466', 'Al-Madina Cash & Carry', 'Al-Madina Group', '+92 300 1234567', '+92 300 1234567', 'Main Boulevard, Gulberg III', 'Lahore', 'Customer', 'Key retail chain buyer. 15-day credit window.'),
          ('6f3d6a3a-4cdc-49b0-8027-1170ad61ca6b', 'Lahore Spice Center', 'LHR Traders', '+92 321 9876543', '+92 321 9876543', 'Akbari Mandi, Walled City', 'Lahore', 'Customer', 'Wholesale distributor for Central Punjab.'),
          ('eddc8fa3-74fe-4f5c-876e-c87b95bf5e89', 'Subhan Wholesale Traders', 'Subhan Enterprises', '+92 333 4567890', '+92 333 4567890', 'Jodia Bazaar', 'Karachi', 'Customer', 'Bulk purchaser of Tikka and Kabab Masala.'),
          ('2322f6a1-4f44-4a37-851d-b776cdf62b6b', 'Khyber Hotel & Restaurant Chain', 'Khyber Hospitality Ltd', '+92 345 6789012', '+92 345 6789012', 'University Road', 'Peshawar', 'Customer', 'Regular monthly commercial supply.'),
          ('e7e2aa5e-e95d-4704-b2d0-08a55c0e69c5', 'Chilli Growers Farmers Co-op', 'Sindh Spice Farms', '+92 301 5554433', '+92 301 5554433', 'Kunar Road, Kunri', 'Umerkot', 'Supplier', 'Direct supplier of premium Red Whole Chilli.'),
          ('421dfea0-7152-4f8a-8f38-82f00d9546b0', 'Packages Limited', 'Packages Packaging Div', '+92 42 35811111', '+92 42 35811111', 'Shahrah-e-Roomi, P.O. Amer Sidhu', 'Lahore', 'Supplier', 'Supplier of printed aluminum foil & carton boxes.'),
          ('f988f4c6-ca3a-4b7c-8818-f536e11350d6', 'National Agro & Spices', 'National Spice Importers', '+92 312 8887766', '+92 312 8887766', 'Grain Market', 'Multan', 'Both', 'Buys finished masala packets and supplies raw Cumin/Turmeric.')
        `);
      }

      // Check if products exist
      const [products]: any = await conn.query('SELECT COUNT(*) as count FROM products');
      if (products[0].count === 0) {
        console.log('[MySQL] Seeding initial products...');
        await conn.query(`
          INSERT INTO products (id, name, category, unit, default_rate, stock_qty, description) VALUES
          ('4c7473ab-47ef-4c2d-9db0-780e82fcf6d8', 'Special Chicken Masala', 'Formulated Spice Mix', '1kg Pack', 1250, 450, 'Premium aromatic chicken spice blend'),
          ('51770b6d-897d-466f-b9fa-f410145899b0', 'Smoky Tikka Masala', 'Formulated Spice Mix', '500g Pack', 700, 600, 'Barbecue style tikka spice mixture'),
          ('3c31c4d1-4b28-4531-94c8-d3c231512c59', 'Seekh Kabab Masala', 'Formulated Spice Mix', '1kg Pack', 1400, 320, 'Authentic coal-smoked seekh kabab blend'),
          ('4e897722-766a-4f46-aeac-e154d5341e07', 'Royal Garam Masala', 'Pure Spice Powder', '1kg Pack', 1800, 250, 'High-grade whole spices finely ground'),
          ('c5bb5da5-d889-4af2-a123-f24d97f066ae', 'Bombay Biryani Masala', 'Formulated Spice Mix', '1kg Pack', 1300, 500, 'Rich spiced biryani flavor enhancer'),
          ('23e37b7e-0d42-4c5c-b066-397b42f6deb8', 'Crushed Red Chilli (Stemless)', 'Raw Spice Material', '25kg Bag', 18500, 80, 'Directly sourced processed Kunri red chilli'),
          ('0400da24-21c4-4a92-8110-cde8bc0e09d6', 'Pure Turmeric Powder (Haldi)', 'Pure Spice Powder', '50kg Bag', 32000, 45, 'High-curcumin organic turmeric ground'),
          ('f3e33659-08e6-4694-a99c-17ab03c02cd0', 'Laminated Printed Pouches (1kg)', 'Packaging Material', '1000 Pcs', 8500, 50, 'Food-grade multi-layer foil pouches for packaging')
        `);
      }
    } finally {
      conn.release();
    }
  } catch (error: any) {
    console.error('[MySQL] Initialization error:', error.message);
  }
};
