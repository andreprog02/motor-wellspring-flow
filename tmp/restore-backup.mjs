import fs from 'node:fs';

const backupPath = '/dev-server/tmp/source_backup.json';
const tenantId = '1677feb6-9714-4b55-8fe5-ea039b718b5b';
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes.');
}

const orderedTables = [
  'locations',
  'oil_types',
  'manufacturers',
  'manufacturer_models',
  'component_manufacturers',
  'component_models',
  'maintenance_plan_templates',
  'maintenance_plan_template_tasks',
  'maintenance_descriptions',
  'equipments',
  'equipment_sub_components',
  'cylinder_components',
  'component_maintenance_plans',
  'inventory_items',
  'maintenance_logs',
  'maintenance_log_items',
  'cylinder_heads',
  'cylinder_head_installations',
  'cylinder_head_maintenances',
  'cylinder_head_components',
  'oil_collections',
  'oil_analyses',
  'turbos',
  'turbo_installations',
  'turbo_maintenances',
  'turbo_components',
];

const raw = fs.readFileSync(backupPath, 'utf8');
const parsed = JSON.parse(raw);
const backup = parsed.tables ?? parsed;

const baseHeaders = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json',
};

async function rest(path, options = {}) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      ...baseHeaders,
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${options.method || 'GET'} ${path} -> ${res.status}: ${text}`);
  }

  return res;
}

function chunk(array, size) {
  const out = [];
  for (let i = 0; i < array.length; i += size) out.push(array.slice(i, i + size));
  return out;
}

const summary = [];

for (const table of [...orderedTables].reverse()) {
  await rest(`${table}?tenant_id=eq.${tenantId}`, {
    method: 'DELETE',
    headers: { Prefer: 'return=minimal' },
  });
}

for (const table of orderedTables) {
  const rows = Array.isArray(backup[table]) ? backup[table] : [];
  if (!rows.length) continue;

  const prepared = rows.map((row) => ({ ...row, tenant_id: tenantId }));

  for (const batch of chunk(prepared, 200)) {
    await rest(`${table}?on_conflict=id`, {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(batch),
    });
  }

  summary.push({ table, inserted: prepared.length });
}

console.log(JSON.stringify({ ok: true, tenantId, summary }, null, 2));
