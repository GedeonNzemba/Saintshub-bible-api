import puppeteer from 'puppeteer';

interface VerseData {
  verseDate?: string;
  verseImage?: string;
  verseText?: string;
  referenceText?: string;
}

export async function scrapeVerse(): Promise<VerseData> {
  let browser;
  try {
    console.log('Launching browser...');
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-zygote',
        '--single-process'
      ]
    });

    console.log('Creating new page...');
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(30000);
    await page.setDefaultTimeout(30000);

    // Set a desktop viewport
    await page.setViewport({
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
    });

    console.log('Navigating to Bible.com...');
    const response = await page.goto('https://www.bible.com/verse-of-the-day', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    if (!response || !response.ok()) {
      throw new Error(`Failed to load page: ${response?.status() || 'No response'}`);
    }

    // Wait for main content to load
    await page.waitForSelector('main', { timeout: 10000 });
    
    console.log('Extracting verse data...');
    const rawData = await page.evaluate(() => {
      const verseDate = document.querySelector('main .items-center > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > p')?.textContent;
      const verseImage = document.querySelector('main .items-center > div:nth-child(1) img')?.getAttribute('src');
      const verseText = document.querySelector('main .items-center > div:nth-child(1) > div:nth-child(3) a:nth-child(1)')?.textContent;
      const referenceText = document.querySelector('main.items-center > div:nth-child(1) div:nth-child(3) a:nth-child(2)')?.textContent;

      console.log('Found data:', { verseDate, verseImage, verseText, referenceText });

      return {
        verseDate,
        verseImage,
        verseText,
        referenceText
      };
    });

    console.log('Scraped raw data:', rawData);

    // Process the data and handle null/undefined values
    const verseData: VerseData = {
      verseDate: rawData.verseDate || new Date().toLocaleDateString(),
      verseImage: rawData.verseImage || undefined,
      verseText: rawData.verseText || 'Verse not found',
      referenceText: rawData.referenceText || 'Reference not found'
    };

    if (!verseData.verseText || verseData.verseText === 'Verse not found') {
      throw new Error('Failed to extract verse data');
    }

    return verseData;

  } catch (error) {
    console.error('Scraping error:', error);
    throw error;
  } finally {
    if (browser) {
      console.log('Closing browser...');
      try {
        await browser.close();
      } catch (error) {
        console.error('Error closing browser:', error);
      }
    }
  }
}
