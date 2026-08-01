// Renders resources/portfolio/index.html to out/VladimirBabin_Portfolio.pdf
// (A4, backgrounds on, clickable links, zero margins — the stylesheet owns layout).
const path = require("path");
const puppeteer = require("puppeteer");

const repoRoot = path.join(__dirname, "..");
const source = path.join(repoRoot, "resources", "portfolio", "index.html");
const target = path.join(repoRoot, "out", "VladimirBabin_Portfolio.pdf");

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto("file://" + source, { waitUntil: "networkidle0" });
  await page.pdf({
    path: target,
    format: "A4",
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  await browser.close();
  console.log("wrote " + target);
})();
