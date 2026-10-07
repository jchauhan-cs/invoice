import { getSettings } from '@/lib/db';
import { saveSettings } from '@/app/actions';

export default async function SettingsPage({ searchParams }) {
  const s = await getSettings();
  return (
    <>
      <h1>Settings</h1>
      <p className="sub">Your company details appear at the top of every invoice.</p>
      {searchParams?.saved && <div className="notice">Settings saved.</div>}
      <form action={saveSettings} className="panel stack">
        <label>Company name<input name="company_name" required defaultValue={s.company_name} /></label>
        <label>Address<textarea name="address" defaultValue={s.address} /></label>
        <div className="grid2">
          <label>Email<input type="email" name="email" defaultValue={s.email} /></label>
          <label>Phone<input name="phone" defaultValue={s.phone} /></label>
        </div>
        <label>Payment details (bank account, UPI, payment link)<textarea name="payment_details" defaultValue={s.payment_details} /></label>
        <div className="grid2">
          <label>Currency code (for example USD, INR, EUR)<input name="currency" maxLength={3} required defaultValue={s.currency} /></label>
          <label>Invoice number prefix<input name="prefix" maxLength={8} required defaultValue={s.prefix} /></label>
        </div>
        <label>Default payment terms (days)<input type="number" min="0" name="payment_terms_days" defaultValue={s.payment_terms_days} /></label>
        <label>Footer note<input name="footer_note" defaultValue={s.footer_note} /></label>
        <div className="actions"><button className="btn primary" type="submit">Save settings</button></div>
      </form>
    </>
  );
}
