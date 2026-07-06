import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "screenshots");

async function capture() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  await page.goto("http://localhost:5173/login", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: path.join(outDir, "login-page.png"),
    fullPage: true,
  });

  await page.goto("http://localhost:5173/demo", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.click('button:has-text("Momentum Scanner")');
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(outDir, "momentum-scanner.png"),
    fullPage: false,
  });

  await page.goto("http://localhost:5173/demo", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: path.join(outDir, "dashboard-overview.png"),
    fullPage: false,
  });

  await page.click('button:has-text("Holdings")');
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(outDir, "dashboard-holdings.png"),
    fullPage: false,
  });

  await browser.close();
  console.log("Screenshots saved to screenshots/");
}

capture().catch(console.error);
