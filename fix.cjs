const fs = require('fs');
let c = fs.readFileSync('src/lib/store.ts', 'utf8');
const s = c.indexOf('}).catch((err) => {');
const e = c.indexOf('});', s) + 3;
const newCode = `}).catch((err) => {
  const code = String(err?.code || '');
  let errMsg = 'Connection failed';
  if (code.includes('auth/invalid') || code.includes('auth/wrong') || code.includes('auth/user-not')) errMsg = 'Login failed. Check Email and Password.';
  else if (code.includes('auth/unauthorized')) errMsg = 'Domain not authorized in Firebase Console.';
  else if (code.includes('network')) errMsg = 'Network request failed.';
  else errMsg = \`\${code}: \${err?.message || 'Check Firebase settings'}\`;
  setState((s) => ({ ...s, isConnecting: false, firebaseError: errMsg, mqtt: { ...s.mqtt, connected: false } }));
});`;
c = c.substring(0, s) + newCode + c.substring(e);
fs.writeFileSync('src/lib/store.ts', c, 'utf8');
console.log('Replaced successfully via node file');
