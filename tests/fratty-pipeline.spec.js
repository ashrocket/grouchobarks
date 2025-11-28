// @ts-check
const { test, expect } = require('@playwright/test');

const GAME_URL = 'https://grouchobarks.bandmusicgames.party/fratty-pipeline/';

test.describe('Fratty Pipeline Game', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(GAME_URL);
    // Wait for Phaser to initialize
    await page.waitForFunction(() => window.gameScene !== undefined, { timeout: 10000 });
  });

  test('game loads successfully', async ({ page }) => {
    // Check game canvas exists
    const canvas = await page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Check game scene is initialized
    const gameReady = await page.evaluate(() => {
      return window.gameScene && !window.gameScene.gameOver;
    });
    expect(gameReady).toBe(true);
  });

  test('player can move left and right', async ({ page }) => {
    // Get initial position
    const initialCol = await page.evaluate(() => window.gameScene.playerCol);

    // Move right
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(100);

    const afterRightCol = await page.evaluate(() => window.gameScene.playerCol);
    expect(afterRightCol).toBe(initialCol + 1);

    // Move left
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(100);

    const afterLeftCol = await page.evaluate(() => window.gameScene.playerCol);
    expect(afterLeftCol).toBe(initialCol);
  });

  test('character can be cycled with C key', async ({ page }) => {
    const initialChar = await page.evaluate(() => window.gameScene.currentCharacter);

    await page.keyboard.press('c');
    await page.waitForTimeout(100);

    const newChar = await page.evaluate(() => window.gameScene.currentCharacter);
    expect(newChar).toBe((initialChar + 1) % 5);
  });

  test('skin tone can be cycled with S key', async ({ page }) => {
    const initialSkin = await page.evaluate(() => window.gameScene.skinTone);

    await page.keyboard.press('s');
    await page.waitForTimeout(100);

    const newSkin = await page.evaluate(() => window.gameScene.skinTone);
    expect(newSkin).toBe((initialSkin + 1) % 3);
  });

  test('game can be paused with spacebar', async ({ page }) => {
    await page.keyboard.press('Space');
    await page.waitForTimeout(100);

    const isPaused = await page.evaluate(() => window.gameScene.isPaused);
    expect(isPaused).toBe(true);

    // Unpause
    await page.keyboard.press('Space');
    await page.waitForTimeout(100);

    const isUnpaused = await page.evaluate(() => !window.gameScene.isPaused);
    expect(isUnpaused).toBe(true);
  });

  test('score increases over time', async ({ page }) => {
    const initialScore = await page.evaluate(() => window.gameScene.score);

    // Wait for score to increase
    await page.waitForTimeout(2000);

    const newScore = await page.evaluate(() => window.gameScene.score);
    expect(newScore).toBeGreaterThan(initialScore);
  });

  test('transformation meter starts at zero', async ({ page }) => {
    const transformLevel = await page.evaluate(() => window.gameScene.transformationLevel);
    expect(transformLevel).toBe(0);
  });

  test('player stays within bounds', async ({ page }) => {
    // Try to move past left boundary
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(50);
    }

    const leftCol = await page.evaluate(() => window.gameScene.playerCol);
    expect(leftCol).toBeGreaterThanOrEqual(1);

    // Try to move past right boundary
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(50);
    }

    const rightCol = await page.evaluate(() => window.gameScene.playerCol);
    const maxCol = await page.evaluate(() => window.gameScene.COLS - 2);
    expect(rightCol).toBeLessThanOrEqual(maxCol);
  });

  test('gameplay session - survive for 30 seconds', async ({ page }) => {
    // Dodge hazards by moving randomly
    const startScore = await page.evaluate(() => window.gameScene.score);

    for (let i = 0; i < 60; i++) {
      // Random movement
      const direction = Math.random() > 0.5 ? 'ArrowLeft' : 'ArrowRight';
      await page.keyboard.press(direction);
      await page.waitForTimeout(500);

      // Check if still playing
      const gameOver = await page.evaluate(() => window.gameScene.gameOver);
      const transformed = await page.evaluate(() => window.gameScene.isTransformed);

      if (gameOver || transformed) {
        console.log(`Game ended at iteration ${i}`);
        break;
      }
    }

    const finalScore = await page.evaluate(() => window.gameScene.score);
    console.log(`Final score: ${Math.floor(finalScore)}`);
    expect(finalScore).toBeGreaterThan(startScore);
  });

});

test.describe('Mobile Controls', () => {

  test('mobile left button works', async ({ page }) => {
    await page.goto(GAME_URL);
    await page.waitForFunction(() => window.gameScene !== undefined, { timeout: 10000 });

    const leftBtn = page.locator('#mobile-left');
    if (await leftBtn.isVisible()) {
      const initialCol = await page.evaluate(() => window.gameScene.playerCol);

      await leftBtn.click();
      await page.waitForTimeout(100);

      const newCol = await page.evaluate(() => window.gameScene.playerCol);
      // Should move left if not at boundary
      if (initialCol > 1) {
        expect(newCol).toBe(initialCol - 1);
      }
    }
  });

});
