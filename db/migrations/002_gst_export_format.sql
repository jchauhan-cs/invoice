ALTER TABLE settings
  ADD COLUMN gstin text NOT NULL DEFAULT '',
  ADD COLUMN state_name text NOT NULL DEFAULT '',
  ADD COLUMN state_code text NOT NULL DEFAULT '',
  ADD COLUMN default_hsn text NOT NULL DEFAULT '998313',
  ADD COLUMN invoice_title text NOT NULL DEFAULT 'Tax Invoice',
  ADD COLUMN export_statement text NOT NULL DEFAULT '(SUPPLY MEANT FOR EXPORT/SUPPLY TO SEZ UNIT OR SEZ DEVELOPER FOR AUTHORISED OPERATIONS UNDER BOND OR LETTER OF UNDERTAKING WITHOUT PAYMENT OF IGST)',
  ADD COLUMN declaration text NOT NULL DEFAULT 'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.',
  ADD COLUMN bank_holder text NOT NULL DEFAULT '',
  ADD COLUMN bank_name text NOT NULL DEFAULT '',
  ADD COLUMN bank_account text NOT NULL DEFAULT '',
  ADD COLUMN bank_branch_ifsc text NOT NULL DEFAULT '';

ALTER TABLE clients
  ADD COLUMN country text NOT NULL DEFAULT '';

ALTER TABLE invoices
  ADD COLUMN is_export boolean NOT NULL DEFAULT true,
  ADD COLUMN payment_terms text NOT NULL DEFAULT '',
  ADD COLUMN reference_no text NOT NULL DEFAULT '',
  ADD COLUMN other_references text NOT NULL DEFAULT '',
  ADD COLUMN buyer_order_no text NOT NULL DEFAULT '',
  ADD COLUMN buyer_order_date date,
  ADD COLUMN delivery_terms text NOT NULL DEFAULT '';

ALTER TABLE invoice_items
  ADD COLUMN details text NOT NULL DEFAULT '',
  ADD COLUMN hsn_sac text NOT NULL DEFAULT '',
  ADD COLUMN unit text NOT NULL DEFAULT '';
