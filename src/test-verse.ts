import { scrapeVerse } from './scrapeVerse';
import { createClient } from 'redis';

async function testVerseImplementation() {
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
    
    try {
        // Connect to Redis
        await redisClient.connect();
        
        console.log('1. Testing initial verse scraping...');
        const verse = await scrapeVerse();
        console.log('Scraped verse:', verse);
        
        console.log('\n2. Testing Redis cache...');
        const cachedVerse = await redisClient.get('dailyVerse');
        console.log('Cached verse:', JSON.parse(cachedVerse!));
        
        console.log('\n3. Testing TTL (should be close to 24 hours)...');
        const ttl = await redisClient.ttl('dailyVerse');
        console.log(`Time to live: ${ttl} seconds (${ttl/3600} hours)`);
        
    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await redisClient.quit();
    }
}

async function testCacheBehavior() {
    const redisClient = createClient({
        username: 'default',
        password: 'PEtYICqIGgSnuWH8jXBS1rPX9vV1q8W7',
        socket: {
            host: 'redis-16326.c15.us-east-1-4.ec2.redns.redis-cloud.com',
            port: 16326
        }
    });
    
    redisClient.on('error', err => console.log('Redis Client Error', err));
    
    try {
        await redisClient.connect();
        
        console.log('1. First request - Should get from Redis cache...');
        console.time('First Request');
        const cachedVerse = await redisClient.get('dailyVerse');
        console.timeEnd('First Request');
        
        if (cachedVerse) {
            console.log('✅ Successfully retrieved from cache:');
            console.log(JSON.parse(cachedVerse));
            
            console.log('\n2. Checking TTL...');
            const ttl = await redisClient.ttl('dailyVerse');
            console.log(`Time remaining: ${ttl} seconds (${ttl/3600} hours)`);
            
            // Simulate multiple quick requests
            console.log('\n3. Making multiple quick requests to verify caching...');
            for(let i = 1; i <= 3; i++) {
                console.time(`Request ${i}`);
                const quickCachedVerse = await redisClient.get('dailyVerse');
                console.timeEnd(`Request ${i}`);
                if (quickCachedVerse === cachedVerse) {
                    console.log(`✅ Request ${i}: Cache hit - Same data returned`);
                } else {
                    console.log(`❌ Request ${i}: Unexpected different data`);
                }
            }
        } else {
            console.log('❌ No cached verse found - Cache miss');
            console.log('Triggering new scrape...');
            const newVerse = await scrapeVerse();
            console.log('New verse scraped and cached:', newVerse);
        }
        
    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await redisClient.quit();
    }
}

// Run the tests
testVerseImplementation();
console.log('\n\nTesting Redis Cache Behavior...\n');
testCacheBehavior();
