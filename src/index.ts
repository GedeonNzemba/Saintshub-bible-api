import 'dotenv/config';
import express from 'express';
import config from './config';
import scrapeLogic from './scrapeVerse';
import musicRoutes from './routes/music';
import quotesRoutes from './routes/quotes';
import { createClient } from 'redis';

const app = express();
const port = config.port;

app.use(express.json());

// Base API route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to SaintsHub Daily Verse API' });
});

// Bible verse route
app.get('/verse-of-day', async (req, res, next) => {
    try {
        const verseData = await scrapeLogic(res);
        res.json(verseData);
    } catch (error) {
        next(error);
    }
});

// Daily Verse endpoint
app.get('/api/daily-verse', async (req: any, res: any) => {
  try {
    const redisClient = createClient({
      username: 'default',
      password: 'PEtYICqIGgSnuWH8jXBS1rPX9vV1q8W7',
      socket: {
        host: 'redis-16326.c15.us-east-1-4.ec2.redns.redis-cloud.com',
        port: 16326
      }
    });

    redisClient.on('error', err => console.error('Redis Client Error', err));
    await redisClient.connect();

    // Try to get verse from Redis first
    const cachedVerse = await redisClient.get('dailyVerse');
    
    if (cachedVerse) {
      await redisClient.quit();
      return res.json(JSON.parse(cachedVerse));
    }

    // If not in cache, scrape new verse
    const verse = await scrapeLogic(res);
    await redisClient.quit();
    res.json(verse);
  } catch (error) {
    console.error('Error fetching daily verse:', error);
    res.status(500).json({ 
      error: 'Failed to fetch daily verse',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Mount routes
app.use('/music', musicRoutes);
app.use('/quotes', quotesRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Global Error Handler:', err);
    res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || 'An unexpected error occurred'
    });
});

app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
