import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
import { Response } from 'express';

dotenv.config();

export default async function scrapeLogic(res: Response) {
  const browser = await puppeteer.launch({
    args: [
      "--disable-setuid-sandbox",
      "--no-sandbox",
      "--single-process",
      "--no-zygote",
    ],
    headless: true,
    executablePath:
      process.env.NODE_ENV === "production"
        ? process.env.PUPPETEER_EXECUTABLE_PATH
        : puppeteer.executablePath(),
  });
  try {
    const page = await browser.newPage();

    await page.goto('https://www.bible.com/verse-of-the-day/');

    const verse = await page?.evaluate(() => {
      const verseDate = document.querySelector('main .items-center > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > p')?.textContent;
      const verseImage = document.querySelector('main .items-center > div:nth-child(1) img')?.getAttribute('src');
      const verseText = document.querySelector('main .items-center > div:nth-child(1) div:nth-child(3) a:nth-child(1)')?.textContent;
      const referenceText = document.querySelector('main.items-center > div:nth-child(1) div:nth-child(3) a:nth-child(2)')?.textContent;

      return {
        verseDate,
        verseImage,
        verseText,
        referenceText,
      };
    })

    console.log(verse);
    res.json(verse); // Send the verse data as JSON instead of just logging it
  } catch (e) {
    console.error(e);
    res.send(`Something went wrong while running Puppeteer: ${e}`);
  } finally {
    await browser.close();
  }
};