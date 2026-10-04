import sys

with open("src/lib/store.ts", "r", encoding="utf-8") as f:
    c = f.read()

s = c.find("}).catch((err) => {")
e = c.find("});", s) + 3

if s != -1 and e != -1:
    new_code = \"\"\"}).catch((err) => {
      const code = String(err?.code || "");
      let errMsg = "Connection failed";
      if (code.includes("auth/invalid") || code.includes("auth/wrong") || code.includes("auth/user-not")) errMsg = "Login failed. Check Email and Password.";
      else if (code.includes("auth/unauthorized")) errMsg = "Domain not authorized in Firebase Console.";
      else if (code.includes("network")) errMsg = "Network request failed.";
      else errMsg = \: \;
      setState((s) => ({ ...s, isConnecting: false, firebaseError: errMsg, mqtt: { ...s.mqtt, connected: false } }));
    });\"\"\"
    
    c = c[:s] + new_code + c[e:]
    
    with open("src/lib/store.ts", "w", encoding="utf-8") as f:
        f.write(c)
    print("Done")
else:
    print("Not found")
