import express, { Express, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import scrapeLogic from './scrapeVerse';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 4000;

app.use(express.json());

app.get('/', (req: Request, res: Response, next: NextFunction) => {
  res.json({ message: 'Welcome to SaintsHub Daily Verse API' });
});

//  route: /verse-of-day
app.get('/verse-of-day', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const verseData = await scrapeLogic(res);
    res.json(verseData);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch verse of the day' });
  }
});

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
