'use client';

import { useRef, useState } from 'react';

export default function ItemsEditor({ initialItems, currency }) {
  const nextKey = useRef(0);
  const blank = () => ({ key: nextKey.current++, description: '', quantity: '1', unit_price: '' });
  const [rows, setRows] = useState(() =>
    initialItems.length ? initialItems.map((r) => ({ ...r, key: nextKey.current++ })) : [blank()]
  );

  const update = (key, field, value) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  const remove = (key) => setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : rs));
  const amount = (r) => (parseFloat(r.quantity) || 0) * (parseFloat(String(r.unit_price).replace(/,/g, '')) || 0);
  const total = rows.reduce((s, r) => s + amount(r), 0);
  const money = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="items">
      <div className="item-row item-head">
        <span>Description</span>
        <span>Quantity</span>
        <span>Unit price</span>
        <span className="item-amount">Amount</span>
        <span />
      </div>
      {rows.map((r) => (
        <div className="item-row" key={r.key}>
          <input name="description" value={r.description} onChange={(e) => update(r.key, 'description', e.target.value)} placeholder="Service or product" aria-label="Description" />
          <input name="quantity" type="number" min="0" step="any" value={r.quantity} onChange={(e) => update(r.key, 'quantity', e.target.value)} aria-label="Quantity" />
          <input name="unit_price" type="number" min="0" step="0.01" value={r.unit_price} onChange={(e) => update(r.key, 'unit_price', e.target.value)} placeholder="0.00" aria-label="Unit price" />
          <span className="item-amount">{money(amount(r))}</span>
          <button type="button" className="btn small" onClick={() => remove(r.key)} aria-label="Remove line">×</button>
        </div>
      ))}
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
