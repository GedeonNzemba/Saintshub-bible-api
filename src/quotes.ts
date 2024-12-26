import puppeteer, { PuppeteerLaunchOptions } from 'puppeteer';
import dotenv from 'dotenv';
import { Response } from 'express';
import cron from 'node-cron';
import { createClient } from 'redis';

dotenv.config();

// Validate Redis configuration
if (!process.env.REDIS_PASSWORD || !process.env.REDIS_HOST) {
  console.error('Missing Redis configuration. Please check your .env file.');
  process.exit(1);
}

// Create Redis client with cloud configuration 
const redisClient = createClient({
  username: 'default',
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '16326')
  }
});

redisClient.on('error', (err) => {
  console.error('Redis Client Connection Error:', err);
  // Optionally, you can add more robust error handling here
});

// Connect to Redis with improved error handling
(async () => {
  try {
    await redisClient.connect();
    console.log('Successfully connected to Redis');
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    process.exit(1);
  }
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

export async function scrapeQuotes(language: 'en' | 'fr' = 'en') {
  let browser = null;
  let retries = 3;
  
  const url = `https://branham.org/${language}/QuoteOfTheDay`;
  
  while (retries > 0) {
    try {
      console.log(`Attempt ${4 - retries}: Launching browser for ${language} Quote Of The Day...`);
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
      
      console.log(`Navigating to ${url}...`);
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      if (!response || !response.ok()) {
        throw new Error(`Failed to load page: ${response?.status()}`);
      }

      console.log('Waiting for content...');
      await page.waitForSelector('.QOTD', { timeout: 30000 });

      console.log('Extracting Quote Of The Day data...');
      const quoteData = await page.evaluate(() => {
        try {
          const audio = document.querySelector(".QOTD #audioplayer audio source[type='audio/mpeg']")?.getAttribute("src") || null;
          const sermonDate = document.querySelector(".QOTDdate")?.textContent?.trim() || null;
          const sermonTitle = document.querySelector(".QOTDtitle span#summary")?.textContent?.trim() || null;
          // Updated selector for quote text
          const quote = document.querySelector(".QOTDtext span#content")?.textContent?.trim() || null;

          const scriptureReference = document.querySelector(".dailybread_title span#scripturereference")?.textContent?.trim() || null;
          const scriptureText = document.querySelector(".dailybread_text span#scripturetext")?.textContent?.trim() || null;

          return {
            quoteOfTheDay: {
              audio,
              sermonDate,
              sermonTitle,
              quote
            },
            dailyBread: {
              scriptureReference,
              scriptureText
            }
          };
        } catch (error) {
          console.error('Error during page evaluation:', error);
          return null;
        }
      });

      console.log('Storing in Redis...');
      if (quoteData) {
        // Add language to the data after page.evaluate()
        const dataWithLanguage = {
          ...quoteData,
          language
        };

        // Validate the data structure before storing
        if (
          dataWithLanguage.quoteOfTheDay &&
          dataWithLanguage.dailyBread &&
          Object.keys(dataWithLanguage.quoteOfTheDay).length > 0 &&
          Object.keys(dataWithLanguage.dailyBread).length > 0
        ) {
          await redisClient.set(`${language}DailyQuote`, JSON.stringify(dataWithLanguage), {
            EX: 24 * 60 * 60 // 24 hours in seconds
          });
          return dataWithLanguage;
        } else {
          console.error('Invalid data structure:', dataWithLanguage);
          throw new Error('Failed to extract valid quote data');
        }
      }

      throw new Error('Failed to extract quote data');
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
export default async function scrapeQuotesLogic(req: { query: { lang?: string } }, res: Response) {
  const language = req.query.lang === 'fr' ? 'fr' : 'en';
  
  try {
    // Try to get quotes from Redis first
    const cachedQuotes = await redisClient.get(`${language}DailyQuote`);
    if (cachedQuotes) {
      return res.json(JSON.parse(cachedQuotes));
    }

    // If not in cache, scrape new quotes
    const quotes = await scrapeQuotes(language);
    res.json(quotes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
}

// Schedule daily scraping at midnight for both languages
cron.schedule('0 0 * * *', async () => {
  try {
    console.log('Running daily quotes scraping...');
    await scrapeQuotes('en');
    await scrapeQuotes('fr');
    console.log('Daily quotes updated successfully');
  } catch (error) {
    console.error('Failed to update daily quotes:', error);
  }
});