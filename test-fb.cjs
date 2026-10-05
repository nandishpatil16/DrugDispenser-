const https = require('https');

const API_KEY = 'AIzaSyAgDMg4MCMmO5aGKhzf1fI0mi5SZgLpHOo';
const email = 'admin@smartdose.com';
const password = 'password123'; // wait, I don't know if they changed it, but let's try 'password123' first, or whatever they set

const payload = JSON.stringify({ email, password, returnSecureToken: true });

const req = https.request({
  hostname: 'identitytoolkit.googleapis.com',
  path: `/v1/accounts:signInWithPassword?key=${API_KEY}`,
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    const authRes = JSON.parse(data);
    if (!authRes.idToken) { console.log("Auth failed:", authRes); return; }
    
    https.get(`https://smartdose-573bb-default-rtdb.firebaseio.com/devices.json?auth=${authRes.idToken}`, (res2) => {
      let data2 = '';
      res2.on('data', d => data2 += d);
      res2.on('end', () => console.log("DB DATA:", data2));
    });
  });
});
req.write(payload);
req.end();
