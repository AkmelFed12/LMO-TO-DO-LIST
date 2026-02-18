import express from 'express';
import { Pool } from '@neondatabase/serverless';
import { GoogleGenAI, Type } from '@google/genai';

const app = express();
app.use(express.json({ limit: '2mb' }));

// Normalize Vercel /api prefix so routes work the same locally and in prod
app.use((req, _res, next) => {
  if (req.url.startsWith('/api/')) {
    req.url = req.url.replace(/^\/api/, '');
  }
  next();
});

const dbUrl = process.env.DATABASE_URL || '';
const pool = dbUrl ? new Pool({ connectionString: dbUrl }) : null;

const aiKey = process.env.GEMINI_API_KEY || '';
const ai = aiKey ? new GoogleGenAI({ apiKey: aiKey }) : null;

const ensureDb = () => {
  if (!pool) throw new Error('DATABASE_URL not configured');
};

const initDb = async () => {
  ensureDb();
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        role TEXT NOT NULL,
        last_played_date TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS results (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL,
        score INTEGER NOT NULL,
        total_questions INTEGER NOT NULL,
        date TEXT NOT NULL,
        difficulty_level TEXT
      );
    `);
    await client.query(`ALTER TABLE results ADD COLUMN IF NOT EXISTS difficulty_level TEXT;`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id SERIAL PRIMARY KEY,
        question_text TEXT NOT NULL,
        options JSONB NOT NULL,
        correct_index INTEGER NOT NULL,
        explanation TEXT,
        difficulty TEXT,
        topic TEXT,
        source TEXT
      );
    `);
    await client.query(`ALTER TABLE questions ADD COLUMN IF NOT EXISTS topic TEXT;`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_badges (
        username TEXT NOT NULL,
        badge_id TEXT NOT NULL,
        date_earned TEXT NOT NULL,
        PRIMARY KEY (username, badge_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS global_state (
        key TEXT PRIMARY KEY,
        value JSONB
      );
    `);
    await client.query(
      `INSERT INTO global_state (key, value)
       VALUES ($1, $2)
       ON CONFLICT (key) DO NOTHING`,
      ['config', JSON.stringify({ isManualOverride: false, isQuizOpen: false })]
    );

    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_quiz (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL UNIQUE,
        question_ids JSONB NOT NULL,
        created_at TEXT NOT NULL,
        closes_at TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true
      );
    `);
  } finally {
    client.release();
  }
};

app.get('/health', (_req, res) => res.json({ ok: true }));

app.post('/init', async (_req, res) => {
  try {
    await initDb();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Users
app.get('/users', async (_req, res) => {
  try {
    ensureDb();
    const client = await pool.connect();
    const result = await client.query('SELECT username, role, last_played_date as "lastPlayedDate" FROM users');
    client.release();
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/users', async (req, res) => {
  try {
    ensureDb();
    const { username, role, lastPlayedDate } = req.body;
    const client = await pool.connect();
    await client.query(
      `INSERT INTO users (username, role, last_played_date)
       VALUES ($1, $2, $3)
       ON CONFLICT (username)
       DO UPDATE SET role = $2, last_played_date = $3`,
      [username, role, lastPlayedDate]
    );
    client.release();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Results
app.get('/results', async (_req, res) => {
  try {
    ensureDb();
    const client = await pool.connect();
    const result = await client.query(
      'SELECT username, score, total_questions as "totalQuestions", date, difficulty_level as "difficultyLevel" FROM results ORDER BY id DESC'
    );
    client.release();
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/results', async (req, res) => {
  try {
    ensureDb();
    const { username, score, totalQuestions, date, difficultyLevel } = req.body;
    const today = new Date().toISOString().split('T')[0];
    const client = await pool.connect();
    await client.query(
      'INSERT INTO results (username, score, total_questions, date, difficulty_level) VALUES ($1, $2, $3, $4, $5)',
      [username, score, totalQuestions, date, difficultyLevel || null]
    );
    await client.query('UPDATE users SET last_played_date = $1 WHERE username = $2', [today, username]);
    client.release();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Badges
app.get('/badges/:username', async (req, res) => {
  try {
    ensureDb();
    const client = await pool.connect();
    const result = await client.query(
      'SELECT username, badge_id as "badgeId", date_earned as "dateEarned" FROM user_badges WHERE username = $1',
      [req.params.username]
    );
    client.release();
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/badges', async (req, res) => {
  try {
    ensureDb();
    const { username, badgeId, dateEarned } = req.body;
    const client = await pool.connect();
    await client.query(
      `INSERT INTO user_badges (username, badge_id, date_earned)
       VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [username, badgeId, dateEarned]
    );
    client.release();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Global
app.get('/global', async (_req, res) => {
  try {
    ensureDb();
    const client = await pool.connect();
    const result = await client.query('SELECT value FROM global_state WHERE key = $1', ['config']);
    client.release();
    res.json(result.rows[0]?.value || { isManualOverride: false, isQuizOpen: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/global', async (req, res) => {
  try {
    ensureDb();
    const client = await pool.connect();
    await client.query(
      `INSERT INTO global_state (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = $2`,
      ['config', JSON.stringify(req.body)]
    );
    client.release();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Questions
app.get('/questions', async (_req, res) => {
  try {
    ensureDb();
    const client = await pool.connect();
    const result = await client.query(`
      SELECT id, question_text as "questionText", options, correct_index as "correctAnswerIndex", explanation, difficulty, topic, source
      FROM questions ORDER BY id DESC
    `);
    client.release();
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/questions', async (req, res) => {
  try {
    ensureDb();
    const q = req.body;
    const client = await pool.connect();
    if (q.id) {
      await client.query(
        `UPDATE questions SET question_text=$1, options=$2, correct_index=$3, explanation=$4, difficulty=$5, topic=$6, source=$7 WHERE id=$8`,
        [q.questionText, JSON.stringify(q.options), q.correctAnswerIndex, q.explanation, q.difficulty, q.topic || null, q.source || 'MANUAL', q.id]
      );
    } else {
      await client.query(
        `INSERT INTO questions (question_text, options, correct_index, explanation, difficulty, topic, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [q.questionText, JSON.stringify(q.options), q.correctAnswerIndex, q.explanation, q.difficulty, q.topic || null, q.source || 'MANUAL']
      );
    }
    client.release();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/questions/:id', async (req, res) => {
  try {
    ensureDb();
    const client = await pool.connect();
    await client.query('DELETE FROM questions WHERE id = $1', [req.params.id]);
    client.release();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/questions/by-ids', async (req, res) => {
  try {
    ensureDb();
    const ids = String(req.query.ids || '')
      .split(',')
      .map(v => parseInt(v, 10))
      .filter(v => !Number.isNaN(v));
    if (ids.length === 0) return res.json([]);
    const client = await pool.connect();
    const result = await client.query(
      `SELECT id, question_text as "questionText", options, correct_index as "correctAnswerIndex", explanation, difficulty, topic, source
       FROM questions WHERE id = ANY($1::int[])`,
      [ids]
    );
    client.release();
    const map = new Map(result.rows.map(q => [q.id, q]));
    res.json(ids.map(id => map.get(id)).filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/questions/used-ids', async (_req, res) => {
  try {
    ensureDb();
    const client = await pool.connect();
    const result = await client.query('SELECT question_ids FROM daily_quiz');
    client.release();
    const used = new Set();
    result.rows.forEach(r => {
      const ids = r.question_ids || [];
      ids.forEach(id => used.add(id));
    });
    res.json(Array.from(used));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Daily Quiz
app.get('/daily-quiz/:date', async (req, res) => {
  try {
    ensureDb();
    const client = await pool.connect();
    const result = await client.query(
      `SELECT id, date, question_ids as "questionIds", created_at as "createdAt", closes_at as "closesAt", is_active as "isActive"
       FROM daily_quiz WHERE date = $1`,
      [req.params.date]
    );
    client.release();
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/daily-quiz', async (req, res) => {
  try {
    ensureDb();
    const quiz = req.body;
    const client = await pool.connect();
    await client.query(
      `INSERT INTO daily_quiz (date, question_ids, created_at, closes_at, is_active)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (date) DO UPDATE SET question_ids=$2, created_at=$3, closes_at=$4, is_active=$5`,
      [quiz.date, JSON.stringify(quiz.questionIds), quiz.createdAt, quiz.closesAt, quiz.isActive]
    );
    client.release();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/daily-quiz/deactivate', async (req, res) => {
  try {
    ensureDb();
    const { nowIso } = req.body;
    const client = await pool.connect();
    await client.query(
      `UPDATE daily_quiz SET is_active = false
       WHERE is_active = true AND closes_at < $1`,
      [nowIso]
    );
    client.release();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/daily-quiz/create-if-needed', async (req, res) => {
  try {
    ensureDb();
    const nowUtc = new Date(req.body.nowUtc);
    const totalQuestions = req.body.totalQuestions || 10;
    const dateKey = nowUtc.toISOString().split('T')[0];

    const client = await pool.connect();
    const existing = await client.query(
      `SELECT id, date, question_ids as "questionIds", created_at as "createdAt", closes_at as "closesAt", is_active as "isActive"
       FROM daily_quiz WHERE date = $1`,
      [dateKey]
    );
    if (existing.rows[0]) {
      client.release();
      return res.json(existing.rows[0].isActive ? existing.rows[0] : null);
    }

    const usedRes = await client.query('SELECT question_ids FROM daily_quiz');
    const usedIds = new Set();
    usedRes.rows.forEach(r => (r.question_ids || []).forEach(id => usedIds.add(id)));
    const usedArray = Array.from(usedIds);

    const preferred = await client.query(
      `SELECT id FROM questions
       WHERE difficulty IN ('HARD','EXPERT') AND id <> ALL($1::int[])
       ORDER BY RANDOM()
       LIMIT $2`,
      [usedArray, totalQuestions]
    );
    let selectedIds = preferred.rows.map(r => r.id);

    if (selectedIds.length < totalQuestions) {
      const fallback = await client.query(
        `SELECT id FROM questions
         WHERE id <> ALL($1::int[])
         ORDER BY RANDOM()
         LIMIT $2`,
        [usedArray, totalQuestions - selectedIds.length]
      );
      selectedIds = selectedIds.concat(fallback.rows.map(r => r.id));
    }

    if (selectedIds.length === 0) {
      client.release();
      return res.json(null);
    }

    const createdAt = nowUtc.toISOString();
    const closesAt = new Date(Date.UTC(nowUtc.getUTCFullYear(), nowUtc.getUTCMonth(), nowUtc.getUTCDate(), 23, 50, 0)).toISOString();

    await client.query(
      `INSERT INTO daily_quiz (date, question_ids, created_at, closes_at, is_active)
       VALUES ($1, $2, $3, $4, $5)`,
      [dateKey, JSON.stringify(selectedIds.slice(0, totalQuestions)), createdAt, closesAt, true]
    );

    client.release();

    res.json({
      date: dateKey,
      questionIds: selectedIds.slice(0, totalQuestions),
      createdAt,
      closesAt,
      isActive: true
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Generation
app.post('/questions/generate', async (req, res) => {
  try {
    if (!ai) return res.status(400).json({ error: 'GEMINI_API_KEY not configured' });
    const { count = 10, difficulty = 'ADAPTIVE', mode = 'quiz' } = req.body || {};

    let prompt = '';
    if (mode === 'bank') {
      prompt = `
        Génère ${count} questions QCM difficiles sur l'Islam en français.
        Couvre TOUS les thèmes: Coran, Hadith, Fiqh, Sirah, Histoire, Aqida, Langue arabe, Biographies.
        Règles:
        1. Questions difficiles et précises.
        2. 4 options, 1 seule correcte.
        3. Donne une explication concise.
        4. difficulty doit être HARD ou EXPERT.
        5. Ajoute un champ topic parmi: CORAN, HADITH, FIQH, SIRAH, HISTOIRE, AQIDA, ARABE, BIO.
        6. Pas de répétitions dans le lot.
      `;
    } else {
      let difficultyPrompt = '';
      switch (difficulty) {
        case 'EASY':
          difficultyPrompt = 'NIVEAU: DÉBUTANT (Facile). Questions accessibles à tous.';
          break;
        case 'MEDIUM':
          difficultyPrompt = 'NIVEAU: INTERMÉDIAIRE. Questions demandant un peu de réflexion.';
          break;
        case 'HARD':
          difficultyPrompt = 'NIVEAU: AVANCÉ. Questions difficiles sur des détails précis.';
          break;
        case 'EXPERT':
          difficultyPrompt = 'NIVEAU: EXPERT / SAVANT. Questions très pointues.';
          break;
        default:
          difficultyPrompt = `
            NIVEAU PROGRESSIF (ADAPTIVE):
            - La 1ère et 2ème question doivent être de niveau FACILE.
            - La 3ème et 4ème question doivent être de niveau MOYEN.
            - La 5ème question doit être de niveau DIFFICILE.
            - La 6ème question doit être de niveau EXPERT.
          `;
      }

      prompt = `
        Génère ${count} questions à choix multiples (QCM) sur l'Islam (Histoire, Coran, Hadith, Fiqh, Sirah) en français.
        ${difficultyPrompt}
        Les questions doivent être:
        1. Basées sur des sources authentiques (Coran et Sounnah).
        2. Variées (ne pas répéter les mêmes sujets).
        3. Chaque question doit avoir 4 options dont 1 seule bonne réponse.
        4. Le champ "difficulty" doit refléter le niveau (EASY, MEDIUM, HARD, EXPERT).
      `;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              questionText: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswerIndex: { type: Type.INTEGER },
              explanation: { type: Type.STRING },
              difficulty: { type: Type.STRING },
              topic: { type: Type.STRING }
            },
            required: ['questionText', 'options', 'correctAnswerIndex', 'explanation', 'difficulty']
          }
        }
      }
    });

    const text = response.text;
    const questions = text ? JSON.parse(text) : [];
    const normalized = questions.map(q => ({ ...q, source: 'AI' }));
    res.json(normalized);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default (req, res) => {
  app(req, res);
};
