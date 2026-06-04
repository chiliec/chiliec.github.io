// Renders index.html to ../out/VladimirBabin_Portfolio_Academy.pdf (A4, backgrounds, clickable links)
const path = require("path");
const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto("file://" + path.join(__dirname, "index.html"), { waitUntil: "networkidle0" });
  await page.pdf({
    path: path.join(__dirname, "..", "out", "VladimirBabin_Portfolio_Academy.pdf"),
    format: "A4",
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  await browser.close();
  console.log("portfolio pdf written");
})();
