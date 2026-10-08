import postgres from 'postgres';
import { lineTotal, todayISO, financialYear } from './money';

// Return bigint columns as JS numbers and date columns as 'YYYY-MM-DD' strings.
const types = {
  bigint: { to: 20, from: [20], serialize: (x) => String(x), parse: (x) => Number(x) },
  date: { to: 1082, from: [1082], serialize: (x) => x, parse: (x) => x },
};

// The connection is created on first use so builds do not need a database.
export function db() {
  if (!globalThis.__csSql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set. See .env.example.');
    globalThis.__csSql = postgres(url, {
      prepare: false, // required for pooled connections (Neon, Supabase, pgbouncer)
      max: 5,
      idle_timeout: 20,
      types,
    });
  }
  return globalThis.__csSql;
}

export async function getSettings(q = db()) {
  const [row] = await q`SELECT * FROM settings WHERE id = 1`;
  return row;
}

export async function listClients() {
  return db()`SELECT * FROM clients ORDER BY lower(name)`;
}

export async function getClient(id, q = db()) {
  if (!Number.isInteger(id)) return null;
  const [row] = await q`SELECT * FROM clients WHERE id = ${id}`;
  return row ?? null;
}

export function displayStatus(inv) {
  if (inv.status === 'issued') {
    const today = todayISO();
    if (inv.due_date < today) return 'overdue';
  }
  return inv.status;
}

export async function listInvoices() {
  const rows = await db()`
    SELECT i.*, c.name AS client_name,
           COALESCE((SELECT SUM(amount_minor) FROM payments p WHERE p.invoice_id = i.id), 0)::bigint AS paid_minor
    FROM invoices i
    JOIN clients c ON c.id = i.client_id
    ORDER BY i.id DESC`;
  return rows.map((r) => ({ ...r, display_status: displayStatus(r) }));
}

export async function getInvoiceFull(id, q = db()) {
  if (!Number.isInteger(id)) return null;
  const [invoice] = await q`SELECT * FROM invoices WHERE id = ${id}`;
  if (!invoice) return null;

  const rawItems = await q`SELECT * FROM invoice_items WHERE invoice_id = ${id} ORDER BY position`;
  const items = rawItems.map((it) => ({ ...it, total_minor: lineTotal(it.quantity, it.unit_price_minor) }));
  const payments = await q`SELECT * FROM payments WHERE invoice_id = ${id} ORDER BY paid_on, id`;
  const paid_minor = payments.reduce((s, p) => s + p.amount_minor, 0);

  const isDraft = invoice.status === 'draft';
  const client = isDraft ? await getClient(invoice.client_id, q) : invoice.client_snapshot;
  const company = isDraft ? await getSettings(q) : invoice.company_snapshot;
  const total_minor = isDraft ? items.reduce((s, it) => s + it.total_minor, 0) : invoice.total_minor;

  return {
    invoice: { ...invoice, total_minor, display_status: displayStatus(invoice) },
    items,
    payments,
    paid_minor,
    balance_minor: total_minor - paid_minor,
    client,
    company,
  };
}

// Highest running number already issued in a series like "CS/2026-27" (0 if none).
export async function highestNumberInSeries(series, q = db()) {
  const [r] = await q`
    SELECT COALESCE(MAX(split_part(number, '/', 3)::int), 0)::bigint AS m
    FROM invoices
    WHERE number LIKE ${`${series}/%`} AND split_part(number, '/', 3) ~ '^[0-9]+$'`;
  return r.m;
}

// The number the next issued invoice would get for a given invoice date (preview only;
// the real number is assigned inside the issue transaction).
export async function previewNextNumber(issueDate, q = db()) {
  const settings = await getSettings(q);
  const series = `${settings.prefix}/${financialYear(issueDate)}`;
  const [c] = await q`SELECT next_value FROM counters WHERE series = ${series}`;
  let n = c?.next_value ?? 1;
  for (let i = 0; i < 1000; i++, n++) {
    const [taken] = await q`SELECT 1 FROM invoices WHERE number = ${`${series}/${n}`}`;
    if (!taken) break;
  }
  return `${series}/${n}`;
}
