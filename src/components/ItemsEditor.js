'use client';

import { useRef, useState } from 'react';

export default function ItemsEditor({ initialItems, currency, defaultHsn }) {
  const nextKey = useRef(0);
  const blank = () => ({ key: nextKey.current++, description: '', details: '', hsn_sac: defaultHsn ?? '', quantity: '1', unit: '', unit_price: '' });
  const [rows, setRows] = useState(() =>
    initialItems.length ? initialItems.map((r) => ({ ...r, key: nextKey.current++ })) : [blank()]
  );

  const update = (key, field, value) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  const remove = (key) => setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : rs));
  const amount = (r) => (parseFloat(r.quantity) || 0) * (parseFloat(String(r.unit_price).replace(/,/g, '')) || 0);
  const total = rows.reduce((s, r) => s + amount(r), 0);
  const money = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="items">
      {rows.map((r, i) => (
        <div className="item-card" key={r.key}>
          <input name="description" value={r.description} onChange={(e) => update(r.key, 'description', e.target.value)} placeholder="Service title, for example Software Development" aria-label={`Line ${i + 1} title`} />
          <textarea name="details" rows={2} value={r.details} onChange={(e) => update(r.key, 'details', e.target.value)} placeholder="Details (optional, printed in italics under the title)" aria-label={`Line ${i + 1} details`} />
          <div className="item-grid">
            <label>HSN/SAC<input name="hsn_sac" value={r.hsn_sac} onChange={(e) => update(r.key, 'hsn_sac', e.target.value)} /></label>
            <label>Quantity<input name="quantity" type="number" min="0" step="any" value={r.quantity} onChange={(e) => update(r.key, 'quantity', e.target.value)} /></label>
            <label>Unit (optional)<input name="unit" value={r.unit} onChange={(e) => update(r.key, 'unit', e.target.value)} placeholder="hrs" /></label>
            <label>Rate<input name="unit_price" type="number" min="0" step="0.01" value={r.unit_price} onChange={(e) => update(r.key, 'unit_price', e.target.value)} placeholder="0.00" /></label>
            <div className="item-amount">
              <div className="item-amount-value">{money(amount(r))}</div>
              <button type="button" className="btn small" onClick={() => remove(r.key)}>Remove line</button>
            </div>
          </div>
        </div>
      ))}
      <div className="hint">Quantity 1 with no unit prints as a lump sum, with only the amount shown, like your existing invoices.</div>
      <div>
        <button type="button" className="btn small" onClick={() => setRows((rs) => [...rs, blank()])}>Add line</button>
      </div>
      <div className="total-line">
        <span>Total</span>
        <span>{money(total)} {currency}</span>
      </div>
    </div>
  );
}
