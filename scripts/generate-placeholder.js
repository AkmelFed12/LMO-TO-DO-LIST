import fs from 'fs';

const API_BASE = process.env.API_BASE || 'https://asaaqi.vercel.app/api';
const TOTAL = parseInt(process.env.TOTAL || '50000', 10);
const START_AT = parseInt(process.env.START_AT || '1', 10);
const DELAY_MS = parseInt(process.env.DELAY_MS || '20', 10);
const PROGRESS_PATH = process.env.PROGRESS_PATH || 'scripts/.placeholder-progress.json';

const topics = [
  'CORAN',
  'HADITH',
  'FIQH',
  'SIRAH',
  'HISTOIRE',
  'AQIDA',
  'ARABE',
  'BIO'
];

const difficulties = ['EASY', 'MEDIUM', 'HARD', 'EXPERT'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

const loadProgress = () => {
  if (!fs.existsSync(PROGRESS_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'));
  } catch {
    return null;
  }
};

const saveProgress = (data) => {
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(data, null, 2));
};

const buildQuestion = (index) => {
  const topic = topics[index % topics.length];
  const difficulty = difficulties[index % difficulties.length];
  const questionText = `Question #${index} (${topic}) : Cette question est un placeholder et doit être remplacée par une question authentique.`;
  const options = [
    `Option A - Placeholder ${index}`,
    `Option B - Placeholder ${index}`,
    `Option C - Placeholder ${index}`,
    `Option D - Placeholder ${index}`
  ];
  const correctAnswerIndex = index % 4;
  const explanation = 'Placeholder : à remplacer par une explication correcte avec sources.';
  return {
    questionText,
    options,
    correctAnswerIndex,
    explanation,
    difficulty,
    topic,
    source: 'MANUAL'
  };
};

const run = async () => {
  console.log(`API_BASE=${API_BASE}`);
  console.log(`TOTAL=${TOTAL} START_AT=${START_AT} DELAY_MS=${DELAY_MS}`);

  let progress = loadProgress();
  let start = START_AT;
  if (progress && progress.nextIndex) {
    start = Math.max(start, progress.nextIndex);
    console.log(`Resuming from ${start}`);
  }

  for (let i = start; i <= TOTAL; i++) {
    const q = buildQuestion(i);
    await post('/questions', q);
    saveProgress({ nextIndex: i + 1, lastSavedAt: new Date().toISOString() });
    if (i % 500 === 0) {
      console.log(`Saved ${i}/${TOTAL}`);
    }
    if (DELAY_MS > 0) await sleep(DELAY_MS);
  }

  console.log('Done');
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
