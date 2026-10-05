const https = require('https');
https.get('https://smartdose-573bb-default-rtdb.firebaseio.com/devices.json?auth=AIzaSyAgDMg4MCMmO5aGKhzf1fI0mi5SZgLpHOo', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log("DB DATA:", data));
});
