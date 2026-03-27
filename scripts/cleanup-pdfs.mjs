// One-time script to remove all PDF metadata from Redis and all blobs from Vercel Blob
import { list, del } from '@vercel/blob';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redisSet(key, value) {
  const res = await fetch(`${REDIS_URL}/set/${key}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(value),
  });
  return res.json();
}

async function clearBlobs() {
  let cursor = undefined;
  let total = 0;
  do {
    const result = await list({ cursor, limit: 100 });
    if (result.blobs.length > 0) {
      const urls = result.blobs.map(b => b.url);
      await del(urls);
      total += urls.length;
      console.log(`Deleted ${urls.length} blobs...`);
    }
    cursor = result.cursor;
  } while (cursor);
  console.log(`Total blobs deleted: ${total}`);
}

console.log('Clearing Redis PDF metadata...');
await redisSet('yhl:pdfs', []);
console.log('Redis yhl:pdfs cleared.');

console.log('Deleting all Vercel Blob files...');
await clearBlobs();

console.log('Done!');
