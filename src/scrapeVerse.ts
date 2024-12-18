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
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    console.log('Creating new page...');
    const page = await browser.newPage();

    // Set viewport and user agent
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    console.log('Navigating to Bible.com...');
    await page.goto('https://www.bible.com/verse-of-the-day/', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Wait for content to load
    await page.waitForSelector('main', { timeout: 5000 });

    console.log('Extracting verse data...');
    const rawData = await page.evaluate(() => {
      const verseDate = document.querySelector('main .items-center > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > p')?.textContent;
      const verseImage = document.querySelector('main .items-center > div:nth-child(1) img')?.getAttribute('src');
      const verseText = document.querySelector('main .items-center > div:nth-child(1) > div:nth-child(3) a:nth-child(1)')?.textContent;
      const referenceText = document.querySelector('main.items-center > div:nth-child(1) div:nth-child(3) a:nth-child(2)')?.textContent;

      return {
        verseDate,
        verseImage,
        verseText,
        referenceText,
      };
    });

    console.log('Raw scraped data:', rawData);

    // Process the data and handle null values
    const data: VerseData = {
      verseDate: rawData.verseDate || new Date().toLocaleDateString(),
      verseImage: rawData.verseImage || undefined,
      verseText: rawData.verseText || 'Could not find verse text',
      referenceText: rawData.referenceText || 'Could not find reference'
    };

    // console.log('Processed data:', data);

    if (!data.verseText || data.verseText === 'Could not find verse text') {
      throw new Error('Failed to extract verse text from the page');
    }

    return data;
  } catch (error) {
    console.error('Scraping error:', error);
    throw error;
  } finally {
    if (browser) {
      console.log('Closing browser...');
      await browser.close();
    }
  }
}
