
const fs = require("fs");
let code = fs.readFileSync("src/routes/alerts.tsx", "utf8");

code = code.replace(
    /dose: \{ label: "Dose", icon: <Pill size=\{18\} \/>, tone: "warn" \},/,
    `dose: { label: "Dose", icon: <Pill size={18} />, tone: "warn" },
  missed: { label: "Missed", icon: <Pill size={18} />, tone: "warn" },`
);

fs.writeFileSync("src/routes/alerts.tsx", code);

