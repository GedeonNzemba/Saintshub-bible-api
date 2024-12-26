import { Router } from 'express';
import scrapeQuotesLogic from '../quotes';

const router = Router();

// Get quotes in specified language (defaults to English)
router.get('/', async (req, res, next) => {
    try {
        const quotes = await scrapeQuotesLogic(req, res);
        res.json(quotes);
    } catch (error) {
        next(error);
    }
});

// Get quotes in English
router.get('/en', async (req, res, next) => {
    try {
        req.query.lang = 'en';
        const quotes = await scrapeQuotesLogic(req, res);
        res.json(quotes);
    } catch (error) {
        next(error);
    }
});

// Get quotes in French
router.get('/fr', async (req, res, next) => {
    try {
        req.query.lang = 'fr';
        const quotes = await scrapeQuotesLogic(req, res);
        res.json(quotes);
    } catch (error) {
        next(error);
    }
});

export default router;
