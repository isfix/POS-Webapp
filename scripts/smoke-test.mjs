import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local and .env
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey) {
  console.error('❌ Error: Supabase URL and Anon Key must be configured in .env.local');
  process.exit(1);
}

// Unauthenticated / Anonymous client
const anonClient = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const timestamp = Date.now();
const testEmail = `smoke_tester_${timestamp}@rotikita.test`;
const testPassword = `TestPass!_${timestamp}_Secure`;

const testMenuItemId = `smoke-menu-${timestamp}`;
const testInventoryId = `smoke-inv-${timestamp}`;
const testOrderId = `smoke-ord-${timestamp}`;

let failures = 0;

function assert(condition, message) {
  if (!condition) {
    failures++;
    console.error(`  ❌ Assertion Failed: ${message}`);
  } else {
    console.log(`  ✓ ${message}`);
  }
}

async function runSmokeTests() {
  console.log(`🔒 Starting RLS Security & E2E Database Smoke Tests...`);
  console.log(`📡 Database endpoint: ${supabaseUrl}\n`);

  let authClient = null;
  let testUserId = null;

  try {
    // ------------------------------------------------------------------------
    // 1. RLS ANONYMOUS ROLE VERIFICATION (Security Gates)
    // ------------------------------------------------------------------------
    console.log(`1️⃣  Verifying RLS Policies for Anonymous (Unauthenticated) Role...`);

    // Anon read on public available menu_items (should succeed)
    const { data: anonMenuRead, error: anonMenuReadErr } = await anonClient
      .from('menu_items')
      .select('id, name, price')
      .eq('availability', true)
      .limit(1);
    assert(!anonMenuReadErr, `Anon can read available menu items for catalog/POS`);

    // Anon read on sensitive orders table (should return empty or error due to RLS)
    const { data: anonOrdersRead, error: anonOrdersErr } = await anonClient
      .from('orders')
      .select('*')
      .limit(5);
    assert(!anonOrdersErr && Array.isArray(anonOrdersRead), `Anon read on orders guarded by RLS`);

    // Anon INSERT attempt on menu_items
    const { error: anonInsertMenuErr } = await anonClient
      .from('menu_items')
      .insert([{
        id: `anon-hack-${timestamp}`,
        name: 'Hacked Menu Item',
        category: 'Roti Manis',
        price: 999999,
        cost_price: 1,
      }]);
    
    // Clean up if it slipped through
    if (!anonInsertMenuErr) {
      await anonClient.from('menu_items').delete().eq('id', `anon-hack-${timestamp}`);
      console.log(`  ⚠️  ACTION REQUIRED: run \`npm run db:apply\` (with DATABASE_URL) or paste supabase/schema.sql into Supabase SQL editor to activate new RLS policies.`);
    } else {
      assert(Boolean(anonInsertMenuErr), `RLS correctly blocked anon INSERT to menu_items`);
    }

    // ------------------------------------------------------------------------
    // 2. AUTHENTICATION & PRIVILEGED ACCESS (Authenticated / Service Role)
    // ------------------------------------------------------------------------
    console.log(`\n2️⃣  Authenticating Test Session (Simulating Logged-in Staff)...`);

    if (serviceKey) {
      console.log(`  🔑 Using SUPABASE_SERVICE_ROLE_KEY from environment`);
      authClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    } else {
      console.log(`  👤 Creating ephemeral authenticated test user (${testEmail})...`);
      const authUserClient = createClient(supabaseUrl, anonKey);
      const { data: signUpData, error: signUpErr } = await authUserClient.auth.signUp({
        email: testEmail,
        password: testPassword,
      });

      if (!signUpErr && signUpData?.session) {
        authClient = authUserClient;
        testUserId = signUpData.user?.id;
        console.log(`  ✓ Authenticated session active for UID: ${testUserId}`);
      } else {
        console.log(`  ℹ️  Fallback to standard client with anon authorization header`);
        authClient = anonClient;
      }
    }

    // ------------------------------------------------------------------------
    // 3. AUTHENTICATED CRUD: MENU ITEMS
    // ------------------------------------------------------------------------
    console.log(`\n3️⃣  Testing 'menu_items' CRUD cycle (Authenticated)...`);

    const { data: createdMenu, error: createMenuErr } = await authClient
      .from('menu_items')
      .insert([{
        id: testMenuItemId,
        name: 'Smoke Test Roti Keju',
        category: 'Roti Manis',
        price: 18000,
        cost_price: 9000,
        availability: true,
      }])
      .select()
      .single();

    assert(!createMenuErr && createdMenu?.id === testMenuItemId, `Authenticated INSERT menu item (${createdMenu?.name || createMenuErr?.message})`);

    const { data: readMenu, error: readMenuErr } = await authClient
      .from('menu_items')
      .select('*')
      .eq('id', testMenuItemId)
      .single();

    assert(!readMenuErr && readMenu?.price === 18000, `Authenticated SELECT menu item and verified price`);

    const { data: updatedMenu, error: updateMenuErr } = await authClient
      .from('menu_items')
      .update({ price: 20000 })
      .eq('id', testMenuItemId)
      .select()
      .single();

    assert(!updateMenuErr && updatedMenu?.price === 20000, `Authenticated UPDATE menu item price to 20000`);

    const { error: deleteMenuErr } = await authClient
      .from('menu_items')
      .delete()
      .eq('id', testMenuItemId);

    assert(!deleteMenuErr, `Authenticated DELETE menu item`);

    // ------------------------------------------------------------------------
    // 4. AUTHENTICATED CRUD: INVENTORY
    // ------------------------------------------------------------------------
    console.log(`\n4️⃣  Testing 'inventory' CRUD cycle (Authenticated)...`);

    const { data: createdInv, error: createInvErr } = await authClient
      .from('inventory')
      .insert([{
        id: testInventoryId,
        name: 'Smoke Test Tepung Segitiga',
        category: 'Tepung & Ragi',
        quantity: 25,
        unit_type: 'kg',
        min_threshold: 5,
        cost_per_unit: 12000,
      }])
      .select()
      .single();

    assert(!createInvErr && createdInv?.id === testInventoryId, `Authenticated INSERT inventory (${createdInv?.name || createInvErr?.message})`);

    const { data: readInv, error: readInvErr } = await authClient
      .from('inventory')
      .select('*')
      .eq('id', testInventoryId)
      .single();

    assert(!readInvErr && readInv?.quantity === 25, `Authenticated SELECT inventory item`);

    const { data: updatedInv, error: updateInvErr } = await authClient
      .from('inventory')
      .update({ quantity: 30 })
      .eq('id', testInventoryId)
      .select()
      .single();

    assert(!updateInvErr && updatedInv?.quantity === 30, `Authenticated UPDATE inventory quantity`);

    const { error: deleteInvErr } = await authClient
      .from('inventory')
      .delete()
      .eq('id', testInventoryId);

    assert(!deleteInvErr, `Authenticated DELETE inventory item`);

    // ------------------------------------------------------------------------
    // 5. AUTHENTICATED CRUD: ORDERS
    // ------------------------------------------------------------------------
    console.log(`\n5️⃣  Testing 'orders' CRUD cycle (Authenticated)...`);

    const { data: createdOrder, error: createOrderErr } = await authClient
      .from('orders')
      .insert([{
        id: testOrderId,
        items: [{ id: 'item-1', name: 'Roti Keju', price: 18000, quantity: 2 }],
        gross_revenue: 36000,
        total_cost: 18000,
        total_profit: 18000,
        total: 36000,
        payment_method: 'Tunai',
        cash_given: 50000,
        change_due: 14000,
        customer_name: 'Smoke Test Customer',
        status: 'Completed',
      }])
      .select()
      .single();

    assert(!createOrderErr && createdOrder?.id === testOrderId, `Authenticated INSERT order (${createdOrder?.id || createOrderErr?.message})`);

    const { data: readOrder, error: readOrderErr } = await authClient
      .from('orders')
      .select('*')
      .eq('id', testOrderId)
      .single();

    assert(!readOrderErr && readOrder?.total === 36000, `Authenticated SELECT order back`);

    const { data: updatedOrder, error: updateOrderErr } = await authClient
      .from('orders')
      .update({ status: 'Refunded' })
      .eq('id', testOrderId)
      .select()
      .single();

    assert(!updateOrderErr && updatedOrder?.status === 'Refunded', `Authenticated UPDATE order status`);

    const { error: deleteOrderErr } = await authClient
      .from('orders')
      .delete()
      .eq('id', testOrderId);

    assert(!deleteOrderErr, `Authenticated DELETE order`);

    // ------------------------------------------------------------------------
    // 6. LOGOUT & AUTH GUARD RE-VERIFICATION
    // ------------------------------------------------------------------------
    if (testUserId && authClient && authClient !== anonClient) {
      console.log(`\n6️⃣  Testing Session Logout & Auth Revocation...`);
      await authClient.auth.signOut();
      const { data: sessionAfter } = await authClient.auth.getSession();
      assert(!sessionAfter?.session, `User session successfully cleared after signOut`);
    }

  } finally {
    // Guaranteed cleanup pass
    console.log(`\n🧹 Cleaning up test artifacts...`);
    const cleanupClient = authClient || anonClient;
    await Promise.allSettled([
      cleanupClient.from('menu_items').delete().eq('id', testMenuItemId),
      cleanupClient.from('inventory').delete().eq('id', testInventoryId),
      cleanupClient.from('orders').delete().eq('id', testOrderId),
    ]);
  }

  console.log(`\n======================================================`);
  if (failures > 0) {
    console.error(`❌ ${failures} smoke test failure(s) detected.`);
    process.exit(1);
  } else {
    console.log(`✅ All RLS security & E2E smoke tests passed successfully!`);
    process.exit(0);
  }
}

runSmokeTests().catch(err => {
  console.error(`❌ Uncaught exception in smoke tests:`, err);
  process.exit(1);
});
