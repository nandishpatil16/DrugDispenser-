
const fs = require("fs");
let code = fs.readFileSync("src/routes/alerts.tsx", "utf8");

// 1. Replace ackAll with clearAll
code = code.replace(
    /const ackAll = \(\) => setState\(\(s\) => \(\{ \.\.\.s, alerts: s\.alerts\.map\(\(a\) => \(\{ \.\.\.a, ack: true \}\)\) \}\)\);/,
    `const clearAll = () => setState((s) => ({ ...s, alerts: [] }));`
);

// 2. Replace the Acknowledge all button
code = code.replace(
    /action=\{alerts\.some\(\(a\) => !a\.ack\) && <Button variant="outline" onClick=\{ackAll\}><Check size=\{16\} \/> Acknowledge all<\/Button>\}/,
    `action={alerts.length > 0 && <Button variant="outline" onClick={clearAll}><Check size={16} /> Clear all</Button>}`
);

// 3. Replace the individual Acknowledge button to Clear
code = code.replace(
    /\{!a\.ack && <Button variant="ghost" onClick=\{\(\) => setState\(\(s\) => \(\{ \.\.\.s, alerts: s\.alerts\.map\(\(x\) => \(x\.id === a\.id \? \{ \.\.\.x, ack: true \} : x\)\) \}\)\)\}>Acknowledge<\/Button>\}/g,
    `<Button variant="ghost" onClick={() => setState((s) => ({ ...s, alerts: s.alerts.filter((x) => x.id !== a.id) }))}>Clear</Button>`
);

// 4. Remove the opacity check for a.ack since they are just deleted now
code = code.replace(
    /className=\{\`flex items-center gap-4 py-3 \$\{a\.ack \? "opacity-60" : ""\}\`\}/g,
    `className="flex items-center gap-4 py-3"`
);

fs.writeFileSync("src/routes/alerts.tsx", code);

