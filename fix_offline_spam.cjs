
const fs = require("fs");
let code = fs.readFileSync("src/lib/store.ts", "utf8");

// Remove pushAlertThrottled("offline" everywhere
code = code.replace(/pushAlertThrottled\("offline", [^)]+\);/g, "/* offline alert disabled to prevent spam */");

fs.writeFileSync("src/lib/store.ts", code);

