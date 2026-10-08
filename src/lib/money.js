// All amounts are stored as integers in minor units (e.g. cents/paise).

export function toMinor(value) {
  const n = parseFloat(String(value).replace(/,/g, ''));
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

export function lineTotal(quantity, unitPriceMinor) {
  return Math.round(Number(quantity) * Number(unitPriceMinor));
}

export function fmtNumber(minor) {
  return (minor / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function fmtMoney(minor, currency) {
  return `${currency} ${fmtNumber(minor)}`;
}

// Symbols that the built-in PDF font can print. Other currencies print their code.
const SYMBOLS = { USD: '$', EUR: '€', GBP: '£' };
export function currencySymbol(code) {
  return SYMBOLS[code] ?? `${code} `;
}

// Today's date as YYYY-MM-DD in India time, so dates are right even when the server runs in UTC.
export function todayISO() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

export function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// 2026-10-06 -> 6-Oct-26
export function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return `${d}-${MONTHS[m - 1]}-${String(y).slice(2)}`;
}

// Indian financial year (April to March): 2026-10-06 -> 2026-27
export function financialYear(iso) {
  const [y, m] = String(iso).slice(0, 10).split('-').map(Number);
  const start = m >= 4 ? y : y - 1;
  return `${start}-${String(start + 1).slice(2)}`;
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
  'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function below100(n) {
  return n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ''}`;
}

function below1000(n) {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return [h ? `${ONES[h]} Hundred` : '', rest ? below100(rest) : ''].filter(Boolean).join(' ');
}

function westernWords(n) {
  if (n === 0) return 'Zero';
  const units = ['', 'Thousand', 'Million', 'Billion', 'Trillion'];
  const parts = [];
  for (let i = 0; n > 0; i++, n = Math.floor(n / 1000)) {
    const chunk = n % 1000;
    if (chunk) parts.unshift(`${below1000(chunk)}${units[i] ? ` ${units[i]}` : ''}`);
  }
  return parts.join(' ');
}

function indianWords(n) {
  if (n === 0) return 'Zero';
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;
  return [
    crore ? `${indianWords(crore)} Crore` : '',
    lakh ? `${below100(lakh)} Lakh` : '',
    thousand ? `${below100(thousand)} Thousand` : '',
    rest ? below1000(rest) : '',
  ].filter(Boolean).join(' ');
}

const CURRENCY_NAMES = {
  USD: { major: 'Dollar', minor: 'Cents' },
  EUR: { major: 'Euro', minor: 'Cents' },
  GBP: { major: 'Pound', minor: 'Pence' },
  INR: { major: 'INR', minor: 'Paise', indian: true },
  AUD: { major: 'Australian Dollar', minor: 'Cents' },
  CAD: { major: 'Canadian Dollar', minor: 'Cents' },
  SGD: { major: 'Singapore Dollar', minor: 'Cents' },
  AED: { major: 'Dirham', minor: 'Fils' },
};

// 160000 USD minor units -> "Dollar One Thousand Six Hundred Only"
export function amountInWords(minor, currency) {
  const c = CURRENCY_NAMES[currency] ?? { major: currency, minor: 'Cents' };
  const words = c.indian ? indianWords : westernWords;
  const whole = Math.floor(minor / 100);
  const frac = minor % 100;
  let s = `${c.major} ${words(whole)}`;
  if (frac) s += ` and ${words(frac)} ${c.minor}`;
  return `${s} Only`;
}
