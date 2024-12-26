import { scrapeQuotes } from './quotes';
import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

async function testQuotesImplementation() {
    // Create Redis client with cloud configuration
    const redisClient = createClient({
        username: 'default',
        password: process.env.REDIS_PASSWORD,
        socket: {
            host: process.env.REDIS_HOST,
            port: parseInt(process.env.REDIS_PORT || '16326')
        }
    });
    
    redisClient.on('error', err => console.log('Redis Client Error', err));
    
    try {
        // Connect to Redis
        await redisClient.connect();
        
        // Test English quotes
        console.log('\n=== Testing English Quotes ===');
        console.log('1. Testing initial English quotes scraping...');
        const enQuotes = await scrapeQuotes('en');
        console.log('Scraped English quotes:', JSON.stringify(enQuotes, null, 2));
        
        console.log('\n2. Testing English Redis cache...');
        const cachedEnQuotes = await redisClient.get('enDailyQuote');
        console.log('Cached English quotes:', JSON.stringify(JSON.parse(cachedEnQuotes!), null, 2));
        
        console.log('\n3. Testing English TTL (should be close to 24 hours)...');
        const enTtl = await redisClient.ttl('enDailyQuote');
        console.log(`Time to live: ${enTtl} seconds (${enTtl/3600} hours)`);

        // Test French quotes
        console.log('\n=== Testing French Quotes ===');
        console.log('1. Testing initial French quotes scraping...');
        const frQuotes = await scrapeQuotes('fr');
        console.log('Scraped French quotes:', JSON.stringify(frQuotes, null, 2));
        
        console.log('\n2. Testing French Redis cache...');
        const cachedFrQuotes = await redisClient.get('frDailyQuote');
        console.log('Cached French quotes:', JSON.stringify(JSON.parse(cachedFrQuotes!), null, 2));
        
        console.log('\n3. Testing French TTL (should be close to 24 hours)...');
        const frTtl = await redisClient.ttl('frDailyQuote');
        console.log(`Time to live: ${frTtl} seconds (${frTtl/3600} hours)`);
        
    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await redisClient.quit();
    }
}

async function testCacheBehavior() {
    const redisClient = createClient({
        username: 'default',
        password: process.env.REDIS_PASSWORD,
        socket: {
            host: process.env.REDIS_HOST,
            port: parseInt(process.env.REDIS_PORT || '16326')
        }
    });
    
    redisClient.on('error', err => console.log('Redis Client Error', err));
    
    try {
        await redisClient.connect();
        
        // Test English cache
        console.log('\n=== Testing English Cache ===');
        console.log('1. First request - Should get from Redis cache...');
        console.time('First English Request');
        const cachedEnQuotes = await redisClient.get('enDailyQuote');
        console.timeEnd('First English Request');
        
        if (cachedEnQuotes) {
            console.log('✅ Successfully retrieved English quotes from cache:');
            const parsedQuotes = JSON.parse(cachedEnQuotes);
            console.log(JSON.stringify(parsedQuotes, null, 2));
            
            console.log('\n2. Checking English TTL...');
            const enTtl = await redisClient.ttl('enDailyQuote');
            console.log(`Time remaining: ${enTtl} seconds (${enTtl/3600} hours)`);
            
            // Simulate multiple quick requests for English
            console.log('\n3. Making multiple quick requests to verify English caching...');
            for(let i = 1; i <= 3; i++) {
                console.time(`English Request ${i}`);
                const quickCachedQuotes = await redisClient.get('enDailyQuote');
                console.timeEnd(`English Request ${i}`);
                if (quickCachedQuotes === cachedEnQuotes) {
                    console.log(`✅ Request ${i}: Cache hit - Same data returned`);
                } else {
                    console.log(`❌ Request ${i}: Unexpected different data`);
                }
            }
        } else {
            console.log('❌ No cached English quotes found - Cache miss');
            console.log('Triggering new English scrape...');
            const newQuotes = await scrapeQuotes('en');
            console.log('New English quotes scraped and cached:', newQuotes);
        }

        // Test French cache
        console.log('\n=== Testing French Cache ===');
        console.log('1. First request - Should get from Redis cache...');
        console.time('First French Request');
        const cachedFrQuotes = await redisClient.get('frDailyQuote');
        console.timeEnd('First French Request');
        
        if (cachedFrQuotes) {
            console.log('✅ Successfully retrieved French quotes from cache:');
            const parsedQuotes = JSON.parse(cachedFrQuotes);
            console.log(JSON.stringify(parsedQuotes, null, 2));
            
            console.log('\n2. Checking French TTL...');
            const frTtl = await redisClient.ttl('frDailyQuote');
            console.log(`Time remaining: ${frTtl} seconds (${frTtl/3600} hours)`);
            
            // Simulate multiple quick requests for French
            console.log('\n3. Making multiple quick requests to verify French caching...');
            for(let i = 1; i <= 3; i++) {
                console.time(`French Request ${i}`);
                const quickCachedQuotes = await redisClient.get('frDailyQuote');
                console.timeEnd(`French Request ${i}`);
                if (quickCachedQuotes === cachedFrQuotes) {
                    console.log(`✅ Request ${i}: Cache hit - Same data returned`);
                } else {
                    console.log(`❌ Request ${i}: Unexpected different data`);
                }
            }
        } else {
            console.log('❌ No cached French quotes found - Cache miss');
            console.log('Triggering new French scrape...');
            const newQuotes = await scrapeQuotes('fr');
            console.log('New French quotes scraped and cached:', newQuotes);
        }
        
    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await redisClient.quit();
    }
}

// Run the tests
console.log('\n=== Starting Quote Tests ===\n');
testQuotesImplementation();
console.log('\n=== Testing Redis Cache Behavior ===\n');
testCacheBehavior();
