
const fs = require("fs");
let code = fs.readFileSync("src/routes/index.tsx", "utf8");

const startTag = "{/* Vitals row */}";
const endTag = "</div>\n\n      {/* Box tray + DFPlayer status */}";

const startIdx = code.indexOf(startTag);
const endIdx = code.indexOf("{/* Box tray + DFPlayer status */}");

if (startIdx !== -1 && endIdx !== -1) {
    code = code.substring(0, startIdx) + code.substring(endIdx);
    fs.writeFileSync("src/routes/index.tsx", code);
    console.log("Removed vitals row");
} else {
    console.log("Failed to find tags");
}

