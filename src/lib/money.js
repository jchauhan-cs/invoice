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
