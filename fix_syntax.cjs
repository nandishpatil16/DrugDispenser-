
const fs = require("fs");
let code = fs.readFileSync("src/lib/store.ts", "utf8");

code = code.replace(/if \(!isOnline\) \/\* offline alert disabled to prevent spam \*\//g, "/* offline alert disabled to prevent spam */");
code = code.replace(/if \(!e.online\) \/\* offline alert disabled to prevent spam \*\//g, "/* offline alert disabled to prevent spam */");

fs.writeFileSync("src/lib/store.ts", code);

