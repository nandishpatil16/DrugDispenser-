
const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");

const tags = `    <meta name="theme-color" content="#ffffff" />
    <link rel="apple-touch-icon" href="/icon.svg" />
`;

if (!html.includes("theme-color")) {
    html = html.replace("<title>", tags + "    <title>");
    fs.writeFileSync("index.html", html);
    console.log("Added PWA tags to index.html");
}

