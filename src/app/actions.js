'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db, getSettings, getClient, getInvoiceFull } from '@/lib/db';
import { toMinor, lineTotal } from '@/lib/money';

const str = (fd, key) => String(fd.get(key) ?? '').trim();

export async function saveSettings(formData) {
  const sql = db();
  await sql`
    UPDATE settings SET
      company_name = ${str(formData, 'company_name') || 'Your company name'},
      address = ${str(formData, 'address')},
      email = ${str(formData, 'email')},
      phone = ${str(formData, 'phone')},
      payment_details = ${str(formData, 'payment_details')},
      footer_note = ${str(formData, 'footer_note')},
      currency = ${(str(formData, 'currency') || 'USD').toUpperCase()},
      prefix = ${(str(formData, 'prefix') || 'CS').toUpperCase().replace(/[^A-Z0-9]/g, '')},
      payment_terms_days = ${Math.max(0, parseInt(str(formData, 'payment_terms_days'), 10) || 0)}
    WHERE id = 1`;
  revalidatePath('/', 'layout');
  redirect('/settings?saved=1');
}

export async function saveClient(formData) {
  const sql = db();
  const id = parseInt(str(formData, 'id'), 10) || null;
  const name = str(formData, 'name');
  if (!name) throw new Error('Client name is required.');
  const email = str(formData, 'email');
  const address = str(formData, 'address');
  const taxId = str(formData, 'tax_id');
  if (id) {
    await sql`UPDATE clients SET name=${name}, email=${email}, address=${address}, tax_id=${taxId} WHERE id=${id}`;
  } else {
    await sql`INSERT INTO clients (name, email, address, tax_id) VALUES (${name}, ${email}, ${address}, ${taxId})`;
  }
  revalidatePath('/clients');
  redirect('/clients');
}

export async function saveInvoice(formData) {
  const sql = db();
  const id = parseInt(str(formData, 'id'), 10) || null;
  const clientId = parseInt(str(formData, 'client_id'), 10);
  if (!clientId) throw new Error('Choose a client.');

  const descriptions = formData.getAll('description').map((v) => String(v).trim());
  const quantities = formData.getAll('quantity');
  const prices = formData.getAll('unit_price');
  const items = descriptions
    .map((description, i) => ({
      description,
      quantity: parseFloat(quantities[i]) || 0,
      unit_price_minor: toMinor(prices[i] ?? 0),
    }))
    .filter((it) => it.description && it.quantity > 0);
  if (items.length === 0) throw new Error('Add at least one line item.');

  const settings = await getSettings();
  const issueDate = str(formData, 'issue_date');
  const dueDate = str(formData, 'due_date');
  const notes = str(formData, 'notes');

  const invoiceId = await sql.begin(async (tx) => {
    let invId = id;
    if (invId) {
      const [existing] = await tx`SELECT status FROM invoices WHERE id = ${invId} FOR UPDATE`;
      if (!existing || existing.status !== 'draft') throw new Error('Only draft invoices can be edited.');
      await tx`UPDATE invoices SET client_id=${clientId}, issue_date=${issueDate}, due_date=${dueDate}, notes=${notes} WHERE id=${invId}`;
      await tx`DELETE FROM invoice_items WHERE invoice_id = ${invId}`;
    } else {
      const [row] = await tx`
        INSERT INTO invoices (client_id, issue_date, due_date, currency, notes)
        VALUES (${clientId}, ${issueDate}, ${dueDate}, ${settings.currency}, ${notes})
        RETURNING id`;
      invId = row.id;
    }
    const rows = items.map((it, i) => ({
      invoice_id: invId,
      position: i,
      description: it.description,
      quantity: it.quantity,
      unit_price_minor: it.unit_price_minor,
    }));
    await tx`INSERT INTO invoice_items ${tx(rows, 'invoice_id', 'position', 'description', 'quantity', 'unit_price_minor')}`;
    const total = items.reduce((s, it) => s + lineTotal(it.quantity, it.unit_price_minor), 0);
    await tx`UPDATE invoices SET total_minor = ${total} WHERE id = ${invId}`;
    return invId;
  });

  revalidatePath('/invoices');
  redirect(`/invoices/${invoiceId}`);
}

// Gives the invoice its number and locks it. The number is assigned inside one
// transaction with a row lock, so numbers stay sequential with no gaps or duplicates.
export async function issueInvoice(invoiceId) {
  const sql = db();
  await sql.begin(async (tx) => {
    const [locked] = await tx`SELECT status FROM invoices WHERE id = ${invoiceId} FOR UPDATE`;
    if (!locked || locked.status !== 'draft') throw new Error('Only draft invoices can be issued.');
    const full = await getInvoiceFull(invoiceId, tx);
    if (full.items.length === 0) throw new Error('Add line items before issuing.');

    const settings = await getSettings(tx);
    const client = await getClient(full.invoice.client_id, tx);
    const series = `${settings.prefix}-${full.invoice.issue_date.slice(0, 4)}`;
    const [{ n }] = await tx`
      INSERT INTO counters (series, next_value) VALUES (${series}, 2)
      ON CONFLICT (series) DO UPDATE SET next_value = counters.next_value + 1
      RETURNING next_value - 1 AS n`;
    const number = `${series}-${String(n).padStart(4, '0')}`;
    const total = full.items.reduce((s, it) => s + it.total_minor, 0);

    await tx`
      UPDATE invoices SET number = ${number}, status = 'issued', total_minor = ${total}, issued_at = now(),
        client_snapshot = ${tx.json(client)}, company_snapshot = ${tx.json(settings)}
      WHERE id = ${invoiceId}`;
  });
  revalidatePath('/invoices');
  redirect(`/invoices/${invoiceId}`);
}

export async function recordPayment(invoiceId, formData) {
  const sql = db();
  const amount = toMinor(str(formData, 'amount'));
  if (amount <= 0) throw new Error('Enter a payment amount greater than zero.');
  const paidOn = str(formData, 'paid_on');
  const method = str(formData, 'method');

  await sql.begin(async (tx) => {
    const [inv] = await tx`SELECT status, total_minor FROM invoices WHERE id = ${invoiceId} FOR UPDATE`;
    if (!inv || inv.status !== 'issued') throw new Error('Payments can only be recorded on issued invoices.');
    await tx`INSERT INTO payments (invoice_id, amount_minor, paid_on, method) VALUES (${invoiceId}, ${amount}, ${paidOn}, ${method})`;
    const [{ s }] = await tx`SELECT COALESCE(SUM(amount_minor), 0)::bigint AS s FROM payments WHERE invoice_id = ${invoiceId}`;
    if (s >= inv.total_minor) await tx`UPDATE invoices SET status = 'paid' WHERE id = ${invoiceId}`;
  });
  revalidatePath('/invoices');
  redirect(`/invoices/${invoiceId}`);
}

export async function voidInvoice(invoiceId) {
  await db()`UPDATE invoices SET status = 'void' WHERE id = ${invoiceId} AND status = 'issued'`;
  revalidatePath('/invoices');
  redirect(`/invoices/${invoiceId}`);
}

export async function deleteDraft(invoiceId) {
  await db()`DELETE FROM invoices WHERE id = ${invoiceId} AND status = 'draft'`;
  revalidatePath('/invoices');
  redirect('/invoices');
}
