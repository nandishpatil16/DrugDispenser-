
const fs = require("fs");
let indexCode = fs.readFileSync("src/routes/index.tsx", "utf8");

const badBlock = `                return (
                  const rowCls`;

if (indexCode.includes(badBlock)) {
    indexCode = indexCode.replace(/return \(\s*const rowCls([^]*?)return \(\s*<div/m, "const rowCls$1return (\n                  <div");
    fs.writeFileSync("src/routes/index.tsx", indexCode);
    console.log("Syntax fixed!");
} else {
    console.log("Could not find the bad block!");
}

