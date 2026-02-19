const API_BASE = process.env.API_BASE || 'https://asaaqi.vercel.app/api';
const TOTAL = parseInt(process.env.TOTAL || '50000', 10);
const BATCH = parseInt(process.env.BATCH || '20', 10);
const PER_MIN = parseInt(process.env.PER_MIN || '10', 10);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const intervalMs = Math.ceil(60000 / Math.max(1, PER_MIN));

const post = async (path, body) => {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${text}`);
  }
  return res.json();
};

const run = async () => {
  console.log(`API_BASE=${API_BASE}`);
  console.log(`TOTAL=${TOTAL} BATCH=${BATCH}`);

  let saved = 0;
  const seen = new Set();

  while (saved < TOTAL) {
    const remaining = TOTAL - saved;
    const count = Math.min(BATCH, remaining);

    const generated = await post('/questions/generate', { count, mode: 'bank' });
    for (const q of generated) {
      const key = String(q.questionText || '').trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      await post('/questions', q);
      saved += 1;
      if (saved >= TOTAL) break;
    }

    console.log(`Saved ${saved}/${TOTAL}`);
    await sleep(intervalMs);
  }

  console.log('Done');
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
