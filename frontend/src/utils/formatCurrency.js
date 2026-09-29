export function formatCurrency(amount, lang) {
  const currentLang = lang || (typeof document !== 'undefined' ? document.documentElement.lang : 'en') || 'en';
  if (amount === null || amount === undefined) return '₹0';
  const num = Number(amount);
  if (isNaN(num)) return '₹0';

  const isHi = currentLang === 'hi';
  const crUnit = isHi ? ' करोड़' : ' Cr';
  const lUnit = isHi ? ' लाख' : ' L';

  if (num >= 10000000) {
    return `₹${(num / 10000000).toFixed(2)}${crUnit}`;
  }
  if (num >= 100000) {
    return `₹${(num / 100000).toFixed(2)}${lUnit}`;
  }
  return `₹${num.toLocaleString('en-IN')}`;
}

export function formatCompactCurrency(amount, lang) {
  const currentLang = lang || (typeof document !== 'undefined' ? document.documentElement.lang : 'en') || 'en';
  if (!amount) return '₹0';
  const num = Number(amount);
  const isHi = currentLang === 'hi';

  if (num >= 1000000000) {
    return `₹${(num / 1000000000).toFixed(1)}${isHi ? ' हजार करोड़' : 'K Cr'}`;
  }
  if (num >= 10000000) {
    return `₹${(num / 10000000).toFixed(0)}${isHi ? ' करोड़' : 'Cr'}`;
  }
  if (num >= 100000) {
    return `₹${(num / 100000).toFixed(0)}${isHi ? ' लाख' : 'L'}`;
  }
  return `₹${num.toLocaleString('en-IN')}`;
}
