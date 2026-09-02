-- ============================================================================
-- RotiKita Bakery POS - Complete Supabase Database Schema
-- Point of Sale & Bakery Management Web Application
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. MENU ITEMS (Katalog Produk Roti & Minuman)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.menu_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN (
        'Roti Manis',
        'Roti Tawar',
        'Cake & Tart',
        'Pastry & Croissant',
        'Donat & Cookies',
        'Minuman'
    )),
    price NUMERIC NOT NULL DEFAULT 0 CHECK (price >= 0),
    cost_price NUMERIC NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
    availability BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    image_url TEXT,
    ingredients JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_category ON public.menu_items(category);
CREATE INDEX IF NOT EXISTS idx_menu_items_availability ON public.menu_items(availability);
CREATE INDEX IF NOT EXISTS idx_menu_items_created_at ON public.menu_items(created_at DESC);

-- ============================================================================
-- 2. INVENTORY (Persediaan Bahan Baku Dapur Bakery)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.inventory (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN (
        'Tepung & Ragi',
        'Dairy, Mentega & Telur',
        'Gula & Pemanis',
        'Isian & Topping',
        'Kemasan & Dus Roti',
        'Perlengkapan & Kebersihan'
    )),
    quantity NUMERIC NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    min_threshold NUMERIC NOT NULL DEFAULT 0 CHECK (min_threshold >= 0),
    unit_type TEXT NOT NULL DEFAULT 'kg',
    cost_per_unit NUMERIC NOT NULL DEFAULT 0 CHECK (cost_per_unit >= 0),
    supplier TEXT,
    expiration_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_category ON public.inventory(category);
CREATE INDEX IF NOT EXISTS idx_inventory_quantity ON public.inventory(quantity);

-- ============================================================================
-- 3. ORDERS (Transaksi Penjualan Kasir POS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    gross_revenue NUMERIC NOT NULL DEFAULT 0,
    total_cost NUMERIC NOT NULL DEFAULT 0,
    total_profit NUMERIC NOT NULL DEFAULT 0,
    total NUMERIC NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'Tunai' CHECK (payment_method IN ('Tunai', 'QRIS', 'Debit', 'Transfer', 'cash', 'qris')),
    cash_given NUMERIC NOT NULL DEFAULT 0,
    change_due NUMERIC NOT NULL DEFAULT 0,
    customer_name TEXT DEFAULT 'Walk-in Customer',
    status TEXT NOT NULL DEFAULT 'Completed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON public.orders(payment_method);

-- ============================================================================
-- 4. EXPENSES (Beban Biaya & Pengeluaran Operasional)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.expenses (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title TEXT,
    category TEXT NOT NULL CHECK (category IN (
        'Bahan Baku & Dapur',
        'Operasional & Utilitas (Listrik/Gas Oven)',
        'Gaji & Upah Karyawan',
        'Kemasan & Dus Roti',
        'Perawatan Mesin & Oven',
        'Sewa Tempat & Bangunan',
        'Lain-lain'
    )),
    amount NUMERIC NOT NULL DEFAULT 0 CHECK (amount >= 0),
    description TEXT,
    notes TEXT,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON public.expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON public.expenses(created_at DESC);

-- ============================================================================
-- 5. ASSETS (Peralatan & Mesin Bakery)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.assets (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN (
        'Oven & Pemanggang',
        'Mixer & Pengaduk Adonan',
        'Showcase & Etalase Kaca',
        'Peralatan Loyang & Dapur',
        'Elektronik Kasir & POS',
        'Lain-lain'
    )),
    quantity NUMERIC NOT NULL DEFAULT 1 CHECK (quantity >= 0),
    status TEXT NOT NULL DEFAULT 'Aktif',
    cost NUMERIC NOT NULL DEFAULT 0 CHECK (cost >= 0),
    purchase_date DATE,
    assigned_to TEXT,
    location TEXT DEFAULT 'Dapur Utama',
    notes TEXT,
    condition TEXT DEFAULT 'Baik',
    image_url TEXT,
    maintenance_date DATE,
    useful_life_years INTEGER DEFAULT 5 CHECK (useful_life_years > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assets_category ON public.assets(category);
CREATE INDEX IF NOT EXISTS idx_assets_status ON public.assets(status);

-- ============================================================================
-- 6. ACTIVITY LOGS (Log Audit Aktivitas Sistem)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_name TEXT NOT NULL DEFAULT 'Staf Kasir',
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS entity_id TEXT;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON public.activity_logs(entity_type, entity_id);

-- ============================================================================
-- 7. DAILY INSIGHTS (Wawasan Analisis Harian AI)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.daily_insights (
    id TEXT PRIMARY KEY, -- Date string YYYY-MM-DD
    overall_summary TEXT,
    low_stock_items JSONB DEFAULT '[]'::jsonb,
    top_selling_items JSONB DEFAULT '[]'::jsonb,
    slow_moving_items JSONB DEFAULT '[]'::jsonb,
    idle_assets JSONB DEFAULT '[]'::jsonb,
    profit_anomalies JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_insights_created_at ON public.daily_insights(created_at DESC);

-- ============================================================================
-- 8. DAILY SUMMARIES (Rekap Penjualan Harian)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.daily_summaries (
    id TEXT PRIMARY KEY, -- Date string YYYY-MM-DD
    total_revenue NUMERIC NOT NULL DEFAULT 0,
    total_orders INTEGER NOT NULL DEFAULT 0,
    top_items JSONB DEFAULT '[]'::jsonb,
    low_stock_count INTEGER NOT NULL DEFAULT 0,
    maintenance_assets_count INTEGER NOT NULL DEFAULT 0,
    low_stock_items JSONB DEFAULT '[]'::jsonb,
    maintenance_assets JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_summaries_created_at ON public.daily_summaries(created_at DESC);

-- ============================================================================
-- 9. NOTIFICATIONS (Notifikasi Sistem Kasir & Inventaris)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    seen BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_seen ON public.notifications(seen);
-- ============================================================================
-- 10. CASH RECONCILIATIONS (Rekonsiliasi Kasir & Tutup Buku Harian)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.cash_reconciliations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    date DATE NOT NULL UNIQUE,
    opened_by TEXT,
    closed_by TEXT,
    opened_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    opening_float NUMERIC NOT NULL DEFAULT 0,
    expected_cash NUMERIC NOT NULL DEFAULT 0,
    counted_cash NUMERIC,
    variance NUMERIC,
    notes TEXT,
    cash_sales NUMERIC NOT NULL DEFAULT 0,
    qris_sales NUMERIC NOT NULL DEFAULT 0,
    total_orders INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'counted', 'closed', 'discrepancy')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cash_reconciliations_date ON public.cash_reconciliations(date DESC);
CREATE INDEX IF NOT EXISTS idx_cash_reconciliations_status ON public.cash_reconciliations(status);

-- ============================================================================
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_reconciliations ENABLE ROW LEVEL SECURITY;

-- 10.1 MENU ITEMS
-- Public/anon can only view available items (for POS customer display / catalog)
DROP POLICY IF EXISTS "Allow anon read available menu_items" ON public.menu_items;
CREATE POLICY "Allow anon read available menu_items" ON public.menu_items
    FOR SELECT TO anon
    USING (availability = true);

-- Authenticated staff can view all items
DROP POLICY IF EXISTS "Allow authenticated read menu_items" ON public.menu_items;
CREATE POLICY "Allow authenticated read menu_items" ON public.menu_items
    FOR SELECT TO authenticated
    USING (auth.uid() IS NOT NULL);

-- Authenticated staff can insert/update/delete menu items
DROP POLICY IF EXISTS "Allow authenticated write menu_items" ON public.menu_items;
CREATE POLICY "Allow authenticated write menu_items" ON public.menu_items
    FOR ALL TO authenticated
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- 10.2 INVENTORY (Sensitive: requires authentication for all reads and writes)
DROP POLICY IF EXISTS "Allow authenticated all on inventory" ON public.inventory;
CREATE POLICY "Allow authenticated all on inventory" ON public.inventory
    FOR ALL TO authenticated
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- 10.3 ORDERS (Sensitive: requires authentication for all reads and writes)
DROP POLICY IF EXISTS "Allow authenticated all on orders" ON public.orders;
CREATE POLICY "Allow authenticated all on orders" ON public.orders
    FOR ALL TO authenticated
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- 10.4 EXPENSES (Sensitive: requires authentication for all reads and writes)
DROP POLICY IF EXISTS "Allow authenticated all on expenses" ON public.expenses;
CREATE POLICY "Allow authenticated all on expenses" ON public.expenses
    FOR ALL TO authenticated
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- 10.5 ASSETS (Sensitive: requires authentication for all reads and writes)
DROP POLICY IF EXISTS "Allow authenticated all on assets" ON public.assets;
CREATE POLICY "Allow authenticated all on assets" ON public.assets
    FOR ALL TO authenticated
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- 10.6 ACTIVITY LOGS (Sensitive: requires authentication for all reads and writes)
DROP POLICY IF EXISTS "Allow authenticated all on activity_logs" ON public.activity_logs;
CREATE POLICY "Allow authenticated all on activity_logs" ON public.activity_logs
    FOR ALL TO authenticated
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- 10.7 DAILY INSIGHTS (Sensitive: requires authentication for all reads and writes)
DROP POLICY IF EXISTS "Allow authenticated all on daily_insights" ON public.daily_insights;
CREATE POLICY "Allow authenticated all on daily_insights" ON public.daily_insights
    FOR ALL TO authenticated
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- 10.8 DAILY SUMMARIES (Sensitive: requires authentication for all reads and writes)
DROP POLICY IF EXISTS "Allow authenticated all on daily_summaries" ON public.daily_summaries;
CREATE POLICY "Allow authenticated all on daily_summaries" ON public.daily_summaries
    FOR ALL TO authenticated
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- 11.9 NOTIFICATIONS (Sensitive: requires authentication for all reads and writes)
DROP POLICY IF EXISTS "Allow authenticated all on notifications" ON public.notifications;
CREATE POLICY "Allow authenticated all on notifications" ON public.notifications
    FOR ALL TO authenticated
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- 11.10 CASH RECONCILIATIONS (Sensitive: requires authentication for all reads and writes)
DROP POLICY IF EXISTS "Allow authenticated all on cash_reconciliations" ON public.cash_reconciliations;
CREATE POLICY "Allow authenticated all on cash_reconciliations" ON public.cash_reconciliations
    FOR ALL TO authenticated
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- 12. STORAGE BUCKET CONFIGURATION (Assets & Product Images)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO NOTHING;

-- Public can read assets / product images
DROP POLICY IF EXISTS "Allow public bucket read on assets" ON storage.objects;
CREATE POLICY "Allow public bucket read on assets" ON storage.objects
    FOR SELECT TO anon, authenticated
    USING (bucket_id = 'assets');

-- Authenticated staff can upload assets
DROP POLICY IF EXISTS "Allow authenticated uploads to assets bucket" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to assets bucket" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'assets' AND auth.uid() IS NOT NULL);

-- Authenticated staff can update assets
DROP POLICY IF EXISTS "Allow authenticated updates to assets bucket" ON storage.objects;
CREATE POLICY "Allow authenticated updates to assets bucket" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'assets' AND auth.uid() IS NOT NULL);

-- Authenticated staff can delete assets
DROP POLICY IF EXISTS "Allow authenticated deletions from assets bucket" ON storage.objects;
CREATE POLICY "Allow authenticated deletions from assets bucket" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'assets' AND auth.uid() IS NOT NULL);
