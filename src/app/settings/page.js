import { db, getSettings } from '@/lib/db';
import { saveSettings } from '@/app/actions';
import { financialYear, todayISO } from '@/lib/money';

export default async function SettingsPage({ searchParams }) {
  const s = await getSettings();
  const series = `${s.prefix}/${financialYear(todayISO())}`;
  const [counter] = await db()`SELECT next_value FROM counters WHERE series = ${series}`;
  const nextNo = counter?.next_value ?? 1;

  return (
    <>
      <h1>Settings</h1>
      <p className="sub">These details are printed on every invoice. Issued invoices keep the details they were issued with.</p>
      {searchParams?.saved && <div className="notice">Settings saved.</div>}
      {searchParams?.error && (
        <div className="notice" style={{ background: '#fee2e2', color: '#991b1b' }}>{searchParams.error}</div>
      )}
      <form action={saveSettings} className="stack">
        <div className="panel stack">
          <h2 style={{ margin: 0 }}>Company</h2>
          <label>Company name<input name="company_name" required defaultValue={s.company_name} /></label>
          <label>Address<textarea name="address" defaultValue={s.address} /></label>
          <div className="grid2">
            <label>GSTIN/UIN<input name="gstin" defaultValue={s.gstin} /></label>
            <label>Default HSN/SAC for new lines<input name="default_hsn" defaultValue={s.default_hsn} /></label>
            <label>State name<input name="state_name" defaultValue={s.state_name} /></label>
            <label>State code<input name="state_code" defaultValue={s.state_code} /></label>
            <label>Email<input type="email" name="email" defaultValue={s.email} /></label>
            <label>Phone<input name="phone" defaultValue={s.phone} /></label>
          </div>
        </div>

        <div className="panel stack">
          <h2 style={{ margin: 0 }}>Bank details</h2>
          <div className="grid2">
            <label>A/c holder&apos;s name<input name="bank_holder" defaultValue={s.bank_holder} /></label>
            <label>Bank name<input name="bank_name" defaultValue={s.bank_name} /></label>
            <label>A/c No.<input name="bank_account" defaultValue={s.bank_account} /></label>
            <label>Branch &amp; IFS code<input name="bank_branch_ifsc" defaultValue={s.bank_branch_ifsc} /></label>
          </div>
        </div>

        <div className="panel stack">
          <h2 style={{ margin: 0 }}>Numbering and defaults</h2>
          <div className="grid2">
            <label>
              Invoice number prefix
              <input name="prefix" maxLength={12} required defaultValue={s.prefix} pattern="[A-Za-z0-9]+(-[A-Za-z0-9]+)*" title="Letters, numbers and dashes only" />
              <span className="hint">Letters, numbers and dashes, for example CS or CS-IN.</span>
            </label>
            <label>
              Next invoice number for {series}
              <input type="number" min="1" name="next_number" defaultValue={nextNo} />
              <span className="hint">Numbers are assigned automatically in order when you issue an invoice, and look like {series}/{nextNo}. To continue from your last invoice, enter the last number plus one. It must be higher than any number already issued.</span>
            </label>
            <label>Default currency (for example USD, INR)<input name="currency" maxLength={3} required defaultValue={s.currency} /></label>
            <label>Default payment terms (days)<input type="number" min="0" name="payment_terms_days" defaultValue={s.payment_terms_days} /></label>
          </div>
        </div>

        <div className="panel stack">
          <h2 style={{ margin: 0 }}>Printed text</h2>
          <label>Invoice title<input name="invoice_title" defaultValue={s.invoice_title} /></label>
          <label>Export statement (shown when an invoice is marked as export)<textarea name="export_statement" rows={3} defaultValue={s.export_statement} /></label>
          <label>Declaration<textarea name="declaration" rows={3} defaultValue={s.declaration} /></label>
        </div>

        <div className="actions"><button className="btn primary" type="submit">Save settings</button></div>
      </form>
    </>
  );
}
