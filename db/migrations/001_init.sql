CREATE TABLE settings (
  id integer PRIMARY KEY CHECK (id = 1),
  company_name text NOT NULL DEFAULT 'Your company name',
  address text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  payment_details text NOT NULL DEFAULT '',
  footer_note text NOT NULL DEFAULT 'Thank you for your business.',
  currency text NOT NULL DEFAULT 'USD',
  prefix text NOT NULL DEFAULT 'CS',
  payment_terms_days integer NOT NULL DEFAULT 14
);
INSERT INTO settings (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE clients (
  id serial PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  tax_id text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE invoices (
  id serial PRIMARY KEY,
  client_id integer NOT NULL REFERENCES clients(id),
  number text UNIQUE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','issued','paid','void')),
  issue_date date NOT NULL,
  due_date date NOT NULL,
  currency text NOT NULL,
  notes text NOT NULL DEFAULT '',
  total_minor bigint NOT NULL DEFAULT 0,
  client_snapshot jsonb,
  company_snapshot jsonb,
  issued_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX invoices_client_id_idx ON invoices (client_id);

CREATE TABLE invoice_items (
  id serial PRIMARY KEY,
  invoice_id integer NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  position integer NOT NULL,
  description text NOT NULL,
  quantity double precision NOT NULL,
  unit_price_minor bigint NOT NULL
);
CREATE INDEX invoice_items_invoice_id_idx ON invoice_items (invoice_id);

CREATE TABLE payments (
  id serial PRIMARY KEY,
  invoice_id integer NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount_minor bigint NOT NULL,
  paid_on date NOT NULL,
  method text NOT NULL DEFAULT ''
);
CREATE INDEX payments_invoice_id_idx ON payments (invoice_id);

CREATE TABLE counters (
  series text PRIMARY KEY,
  next_value integer NOT NULL
);
