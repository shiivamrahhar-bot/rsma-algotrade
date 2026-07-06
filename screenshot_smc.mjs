import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "screenshots");

async function capture() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });

  await page.goto("http://localhost:5173/demo", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.click('button:has-text("Smart Money (SMC)")');
  await page.waitForTimeout(500);
  await page.click('button:has-text("Load SMC Leaderboard")');
  await page.waitForTimeout(1200);
  await page.screenshot({
    path: path.join(outDir, "smc-leaderboard.png"),
    fullPage: false,
  });

  const analyzeBtn = page.locator('button:has-text("Analyze")').first();
  if (await analyzeBtn.count()) {
    await analyzeBtn.click();
    await page.waitForTimeout(700);
    await page.screenshot({
      path: path.join(outDir, "smc-detail.png"),
      fullPage: false,
    });
  }

  await browser.close();
  console.log("Screenshots saved to screenshots/");
}

capture().catch(console.error);
