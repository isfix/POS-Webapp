import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

// Load environment variables
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase URL and Anon/Service Key must be configured in .env.local');
  process.exit(1);
}

// Expected tables and columns derived from supabase/schema.sql
const EXPECTED_SCHEMA = {
  menu_items: [
    'id', 'name', 'category', 'price', 'cost_price', 'description',
    'image_url', 'availability', 'ingredients', 'created_at', 'updated_at'
  ],
  inventory: [
    'id', 'name', 'category', 'quantity', 'unit_type', 'min_threshold',
    'supplier', 'expiration_date', 'cost_per_unit', 'created_at', 'updated_at'
  ],
  orders: [
    'id', 'items', 'gross_revenue', 'total_cost', 'total_profit', 'total',
    'payment_method', 'cash_given', 'change_due', 'customer_name', 'status', 'created_at'
  ],
  expenses: [
    'id', 'title', 'category', 'amount', 'description', 'notes', 'expense_date', 'created_at'
  ],
  assets: [
    'id', 'name', 'category', 'status', 'cost', 'purchase_date',
    'assigned_to', 'location', 'notes', 'condition', 'image_url',
    'maintenance_date', 'useful_life_years', 'created_at', 'updated_at'
  ],
  activity_logs: [
    'id', 'user_name', 'action', 'details', 'created_at'
  ],
  daily_insights: [
    'id', 'overall_summary', 'low_stock_items', 'top_selling_items',
    'slow_moving_items', 'idle_assets', 'profit_anomalies', 'created_at', 'updated_at'
  ],
  daily_summaries: [
    'id', 'total_revenue', 'total_orders', 'top_items', 'low_stock_count',
    'maintenance_assets_count', 'low_stock_items', 'maintenance_assets', 'created_at'
  ],
  notifications: [
    'id', 'title', 'body', 'type', 'seen', 'created_at'
  ],
  cash_reconciliations: [
    'id', 'date', 'opened_by', 'closed_by', 'opened_at', 'closed_at',
    'opening_float', 'expected_cash', 'counted_cash', 'variance', 'notes',
    'cash_sales', 'qris_sales', 'total_orders', 'status', 'created_at', 'updated_at'
  ]
};

async function checkTable(tableName, columns) {
  const queryUrl = `${supabaseUrl}/rest/v1/${tableName}?select=${columns.join(',')}&limit=0`;
  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
  };

  try {
    const res = await fetch(queryUrl, { headers });
    if (res.ok) {
      return { ok: true, missingColumns: [] };
    }

    const errBody = await res.json().catch(() => ({ message: res.statusText }));
    
    // Check individual columns if table batch failed
    const missing = [];
    for (const col of columns) {
      const colUrl = `${supabaseUrl}/rest/v1/${tableName}?select=${col}&limit=0`;
      const colRes = await fetch(colUrl, { headers });
      if (!colRes.ok) {
        missing.push(col);
      }
    }

    return {
      ok: missing.length === 0,
      error: errBody.message || 'Error querying table',
      missingColumns: missing,
      tableMissing: res.status === 404 || errBody.message?.includes('does not exist')
    };
  } catch (err) {
    return { ok: false, error: err.message, missingColumns: [] };
  }
}

async function main() {
  console.log(`🔎 Comparing live database schema against supabase/schema.sql...`);
  console.log(`📡 Supabase Endpoint: ${supabaseUrl}\n`);

  let totalTables = 0;
  let healthyTables = 0;
  let driftCount = 0;
  const driftDetails = [];

  for (const [table, columns] of Object.entries(EXPECTED_SCHEMA)) {
    totalTables++;
    process.stdout.write(`  • Checking table public.${table.padEnd(16)} `);
    
    const result = await checkTable(table, columns);
    
    if (result.ok) {
      healthyTables++;
      console.log(`✅ MATCH (${columns.length} columns)`);
    } else {
      driftCount++;
      if (result.tableMissing) {
        console.log(`❌ MISSING TABLE`);
        driftDetails.push(`- Table 'public.${table}' is missing on live database.`);
      } else if (result.missingColumns && result.missingColumns.length > 0) {
        console.log(`⚠️  DRIFT: missing columns [${result.missingColumns.join(', ')}]`);
        driftDetails.push(`- Table 'public.${table}' missing columns: ${result.missingColumns.join(', ')}`);
      } else {
        console.log(`❌ ERROR: ${result.error}`);
        driftDetails.push(`- Table 'public.${table}' error: ${result.error}`);
      }
    }
  }

  console.log(`\n======================================================`);
  console.log(`Schema Diff Summary: ${healthyTables}/${totalTables} tables synchronized.`);

  if (driftCount > 0) {
    console.log(`\n⚠️  Drift Detected (${driftCount} issues):`);
    driftDetails.forEach(d => console.log(`  ${d}`));
    console.log(`\n💡 To sync your schema, run statements from supabase/schema.sql in the Supabase SQL editor.`);
    process.exit(1);
  }

  console.log(`✅ Schema is 100% synchronized with no drift!`);
  process.exit(0);
}

main().catch(err => {
  console.error(`❌ Unexpected error running schema diff:`, err);
  process.exit(1);
});
