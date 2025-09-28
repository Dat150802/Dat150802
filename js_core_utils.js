// Utils: id, date, format, validate
function makeId(prefix='id') {
  return prefix + '_' + Math.random().toString(36).substr(2,9);
}
function now() {
  return new Date().toISOString();
}
function formatDate(d) {
  if (!d) return '';
  const date = new Date(d);
  return date.toLocaleDateString('vi-VN');
}
function formatMoney(n) {
  return (n||0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
}
function validatePhone(phone) {
  return /^0\d{9,10}$/.test(phone);
}
function validateRequired(val) {
  return val != null && val !== '';
}
function sha256(str) {
  // Client-side SHA-256 (simple, for demo purpose)
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
    .then(buf => Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join(''));
}