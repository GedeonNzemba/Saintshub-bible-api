import puppeteer, { PuppeteerLaunchOptions } from 'puppeteer';
import dotenv from 'dotenv';
import { Response } from 'express';
import cron from 'node-cron';
import { createClient } from 'redis';

dotenv.config();

// Create Redis client with cloud configuration 
// PEtYICqIGgSnuWH8jXBS1rPX9vV1q8W7
const redisClient = createClient({
  username: 'default',
  password: 'PEtYICqIGgSnuWH8jXBS1rPX9vV1q8W7',
  socket: {
    host: 'redis-16326.c15.us-east-1-4.ec2.redns.redis-cloud.com',
    port: 16326
  }
});

redisClient.on('error', err => console.log('Redis Client Error', err));

// Connect to Redis
(async () => {
  await redisClient.connect();
})();

async function setupPage(browser: any) {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1920, height: 1080 });
  
  // Add request interception to block unnecessary resources
  await page.setRequestInterception(true);
  page.on('request', (request: any) => {
    if (['image', 'stylesheet', 'font', 'script'].includes(request.resourceType())) {
      request.abort();
    } else {
      request.continue();
    }
  });
  
  return page;
}

export async function scrapeVerse() {
  let browser = null;
  let retries = 3;
  
  while (retries > 0) {
    try {
      console.log(`Attempt ${4 - retries}: Launching browser...`);
      const isProduction = process.env.NODE_ENV === "production";
      
      const launchOptions: PuppeteerLaunchOptions = {
        headless: "new" as const,
        args: [
          "--disable-setuid-sandbox",
          "--no-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--disable-gpu",
          "--window-size=1920x1080"
        ],
        ignoreHTTPSErrors: true,
        executablePath: isProduction
          ? process.env.PUPPETEER_EXECUTABLE_PATH
          : puppeteer.executablePath()
      };

      browser = await puppeteer.launch(launchOptions);
      const page = await setupPage(browser);
      
      console.log('Navigating to bible.com...');
      const response = await page.goto('https://www.bible.com/verse-of-the-day', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      if (!response || !response.ok()) {
        throw new Error(`Failed to load page: ${response?.status()}`);
      }

      console.log('Waiting for content...');
      await page.waitForSelector('main .items-center', { timeout: 30000 });

      console.log('Extracting verse data...');
      const verse = await page.evaluate(() => {
        const verseDate = document.querySelector('main .items-center > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > p')?.textContent;
        const verseImage = document.querySelector('main .items-center > div:nth-child(1) img')?.getAttribute('src');
        const verseText = document.querySelector('main .items-center > div:nth-child(1) div:nth-child(3) a:nth-child(1)')?.textContent;
        const referenceText = document.querySelector('main.items-center > div:nth-child(1) div:nth-child(3) a:nth-child(2)')?.textContent;

        if (!verseText || !referenceText) {
          throw new Error('Failed to extract verse data');
        }

        return {
          verseDate,
          verseImage,
          verseText,
          referenceText,
        };
      });

      console.log('Storing in Redis...');
      if (verse) {
        await redisClient.set('dailyVerse', JSON.stringify(verse), {
          EX: 24 * 60 * 60 // 24 hours in seconds
        });
      }

      return verse;
    } catch (error) {
      console.error(`Attempt ${4 - retries} failed:`, error);
      retries--;
      
      if (retries === 0) {
        throw new Error(`Failed to scrape after 3 attempts: ${error}`);
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 5000));
    } finally {
      if (browser) {
        console.log('Closing browser...');
        await browser.close();
      }
    }
  }
}

// HTTP endpoint handler
export default async function scrapeLogic(res: Response) {
  try {
    // Try to get verse from Redis first
    const cachedVerse = await redisClient.get('dailyVerse');
    if (cachedVerse) {
      return res.json(JSON.parse(cachedVerse));
    }

    // If not in cache, scrape new verse
    const verse = await scrapeVerse();
    res.json(verse);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch verse' });
  }
}

// Schedule daily scraping at midnight
cron.schedule('0 0 * * *', async () => {
  try {
    console.log('Running daily verse scraping...');
    await scrapeVerse();
    console.log('Daily verse updated successfully');
  } catch (error) {
    console.error('Failed to update daily verse:', error);
  }
});