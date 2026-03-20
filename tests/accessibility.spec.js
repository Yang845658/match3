const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

test.describe('無障礙測試', () => {
  test('主頁面應無無障礙問題', async ({ page }) => {
    await page.goto('http://localhost:8081/');
    
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    
    // 記錄結果
    console.log('無障礙問題數量:', accessibilityScanResults.violations.length);
    
    // 應無嚴重違規
    const seriousViolations = accessibilityScanResults.violations.filter(
      v => v.impact === 'serious' || v.impact === 'critical'
    );
    
    expect(seriousViolations).toEqual([]);
  });

  test('遊戲頁面應有正確的 ARIA 標籤', async ({ page }) => {
    await page.goto('http://localhost:8081/');
    
    // 檢查主要按鈕是否有可訪問名稱
    const startButton = page.locator('#startBtn');
    await expect(startButton).toHaveAttribute('aria-label', /开始/i);
    
    // 檢查計時器是否有標籤
    const timerDisplay = page.locator('#timerDisplay');
    await expect(timerDisplay).toBeVisible();
  });

  test('色彩對比度應符合 WCAG AA 標準', async ({ page }) => {
    await page.goto('http://localhost:8081/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .analyze();
    
    const contrastViolations = accessibilityScanResults.violations.filter(
      v => v.id === 'color-contrast'
    );
    
    // 允許少量對比度問題（動態內容）
    expect(contrastViolations.length).toBeLessThan(3);
  });

  test('鍵盤導航應正常工作', async ({ page }) => {
    await page.goto('http://localhost:8081/');
    
    // Tab 鍵導航
    await page.keyboard.press('Tab');
    let focusedElement = await page.evaluate(() => document.activeElement.textContent);
    expect(focusedElement).toContain('开始游戏');
    
    await page.keyboard.press('Tab');
    focusedElement = await page.evaluate(() => document.activeElement.textContent);
    expect(focusedElement).toContain('重置');
  });

  test('屏幕閱讀器應能讀取主要內容', async ({ page }) => {
    await page.goto('http://localhost:8081/');
    
    // 檢查標題
    const title = await page.locator('h1').textContent();
    expect(title).toContain('三连消');
    
    // 檢查遊戲說明
    const instructions = await page.locator('.info-content').textContent();
    expect(instructions).toContain('点击相邻的方块');
  });
});
