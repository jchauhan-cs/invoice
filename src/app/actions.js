'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db, getSettings, getClient, getInvoiceFull } from '@/lib/db';
import { toMinor, lineTotal, financialYear, todayISO } from '@/lib/money';

const str = (fd, key) => String(fd.get(key) ?? '').trim();

export async function saveSettings(formData) {
  const sql = db();
  const prefix = (str(formData, 'prefix') || 'CS').toUpperCase().replace(/[^A-Z0-9]/g, '');
  await sql`
    UPDATE settings SET
      company_name = ${str(formData, 'company_name') || 'Your company name'},
      address = ${str(formData, 'address')},
      email = ${str(formData, 'email')},
      phone = ${str(formData, 'phone')},
      gstin = ${str(formData, 'gstin').toUpperCase()},
      state_name = ${str(formData, 'state_name')},
      state_code = ${str(formData, 'state_code')},
      default_hsn = ${str(formData, 'default_hsn')},
      invoice_title = ${str(formData, 'invoice_title') || 'Tax Invoice'},
      export_statement = ${str(formData, 'export_statement')},
      declaration = ${str(formData, 'declaration')},
      bank_holder = ${str(formData, 'bank_holder')},
      bank_name = ${str(formData, 'bank_name')},
      bank_account = ${str(formData, 'bank_account')},
      bank_branch_ifsc = ${str(formData, 'bank_branch_ifsc')},
      currency = ${(str(formData, 'currency') || 'USD').toUpperCase()},
      prefix = ${prefix},
      payment_terms_days = ${Math.max(0, parseInt(str(formData, 'payment_terms_days'), 10) || 0)}
    WHERE id = 1`;

  // Optionally set the next invoice number for the current financial year, so numbering
  // can continue from the existing sequence (for example 198 after CS/2026-27/197).
  const next = parseInt(str(formData, 'next_number'), 10);
  if (next >= 1) {
    const series = `${prefix}/${financialYear(todayISO())}`;
    const [row] = await sql`SELECT next_value FROM counters WHERE series = ${series}`;
    if ((row?.next_value ?? 1) !== next) {
      await sql`
        INSERT INTO counters (series, next_value) VALUES (${series}, ${next})
        ON CONFLICT (series) DO UPDATE SET next_value = EXCLUDED.next_value`;
    }
  }
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
  const country = str(formData, 'country');
  if (id) {
    await sql`UPDATE clients SET name=${name}, email=${email}, address=${address}, tax_id=${taxId}, country=${country} WHERE id=${id}`;
  } else {
    await sql`INSERT INTO clients (name, email, address, tax_id, country) VALUES (${name}, ${email}, ${address}, ${taxId}, ${country})`;
  }
  revalidatePath('/clients');
  redirect('/clients');
}

export async function saveInvoice(formData) {
  const sql = db();
  const id = parseInt(str(formData, 'id'), 10) || null;
  const clientId = parseInt(str(formData, 'client_id'), 10);
  if (!clientId) throw new Error('Choose a client.');

  const get = (k) => formData.getAll(k).map((v) => String(v));
  const descriptions = get('description');
  const detailsList = get('details');
  const hsnList = get('hsn_sac');
  const quantities = get('quantity');
  const units = get('unit');
  const prices = get('unit_price');
  const items = descriptions
    .map((description, i) => ({
      description: description.trim(),
      details: (detailsList[i] ?? '').trim(),
      hsn_sac: (hsnList[i] ?? '').trim(),
      quantity: parseFloat(quantities[i]) || 0,
      unit: (units[i] ?? '').trim(),
      unit_price_minor: toMinor(prices[i] ?? 0),
    }))
    .filter((it) => it.description && it.quantity > 0);
  if (items.length === 0) throw new Error('Add at least one line item.');

  const settings = await getSettings();
  const currencyInput = str(formData, 'currency').toUpperCase();
  const currency = /^[A-Z]{3}$/.test(currencyInput) ? currencyInput : settings.currency;
  const issueDate = str(formData, 'issue_date');
  const dueDate = str(formData, 'due_date');
  const f = {
    notes: str(formData, 'notes'),
    isExport: formData.get('is_export') === 'on',
    paymentTerms: str(formData, 'payment_terms'),
    referenceNo: str(formData, 'reference_no'),
    otherReferences: str(formData, 'other_references'),
    buyerOrderNo: str(formData, 'buyer_order_no'),
    buyerOrderDate: str(formData, 'buyer_order_date') || null,
    deliveryTerms: str(formData, 'delivery_terms'),
  };

  const invoiceId = await sql.begin(async (tx) => {
    let invId = id;
    if (invId) {
      const [existing] = await tx`SELECT status FROM invoices WHERE id = ${invId} FOR UPDATE`;
      if (!existing || existing.status !== 'draft') throw new Error('Only draft invoices can be edited.');
      await tx`
        UPDATE invoices SET client_id=${clientId}, issue_date=${issueDate}, due_date=${dueDate}, currency=${currency},
          notes=${f.notes}, is_export=${f.isExport}, payment_terms=${f.paymentTerms}, reference_no=${f.referenceNo},
          other_references=${f.otherReferences}, buyer_order_no=${f.buyerOrderNo}, buyer_order_date=${f.buyerOrderDate},
          delivery_terms=${f.deliveryTerms}
        WHERE id=${invId}`;
      await tx`DELETE FROM invoice_items WHERE invoice_id = ${invId}`;
    } else {
      const [row] = await tx`
        INSERT INTO invoices (client_id, issue_date, due_date, currency, notes, is_export, payment_terms, reference_no,
                              other_references, buyer_order_no, buyer_order_date, delivery_terms)
        VALUES (${clientId}, ${issueDate}, ${dueDate}, ${currency}, ${f.notes}, ${f.isExport}, ${f.paymentTerms},
                ${f.referenceNo}, ${f.otherReferences}, ${f.buyerOrderNo}, ${f.buyerOrderDate}, ${f.deliveryTerms})
        RETURNING id`;
      invId = row.id;
    }
    const rows = items.map((it, i) => ({ invoice_id: invId, position: i, ...it }));
    await tx`INSERT INTO invoice_items ${tx(rows, 'invoice_id', 'position', 'description', 'details', 'hsn_sac', 'quantity', 'unit', 'unit_price_minor')}`;
    const total = items.reduce((s, it) => s + lineTotal(it.quantity, it.unit_price_minor), 0);
    await tx`UPDATE invoices SET total_minor = ${total} WHERE id = ${invId}`;
    return invId;
  });

  revalidatePath('/invoices');
  redirect(`/invoices/${invoiceId}`);
}

// Gives the invoice its number and locks it. Numbers look like CS/2026-27/198: prefix,
// Indian financial year (April to March), then a running number that restarts each year.
// The number is assigned inside one transaction with a row lock, so numbers stay in sequence
// with no gaps or duplicates.
export async function issueInvoice(invoiceId) {
  const sql = db();
  await sql.begin(async (tx) => {
    const [locked] = await tx`SELECT status FROM invoices WHERE id = ${invoiceId} FOR UPDATE`;
    if (!locked || locked.status !== 'draft') throw new Error('Only draft invoices can be issued.');
    const full = await getInvoiceFull(invoiceId, tx);
    if (full.items.length === 0) throw new Error('Add line items before issuing.');

    const settings = await getSettings(tx);
    const client = await getClient(full.invoice.client_id, tx);
    const series = `${settings.prefix}/${financialYear(full.invoice.issue_date)}`;
    const [{ n }] = await tx`
      INSERT INTO counters (series, next_value) VALUES (${series}, 2)
      ON CONFLICT (series) DO UPDATE SET next_value = counters.next_value + 1
      RETURNING next_value - 1 AS n`;
    const number = `${series}/${n}`;
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
