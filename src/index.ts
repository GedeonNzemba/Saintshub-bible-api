import 'dotenv/config';
import express from 'express';
import config from './config';
import scrapeLogic from './scrapeVerse';
import musicRoutes from './routes/music';

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

// Music routes
app.use('/music', musicRoutes);

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
