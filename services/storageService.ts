
import { User, QuizResult, GlobalState, Question, Badge, UserBadge, DailyQuiz } from '../types';
import { Pool } from '@neondatabase/serverless';
import { apiGet, apiPost, apiDelete, hasApiBase } from './apiClient';

const CURRENT_USER_KEY = 'asaa_current_user';
const LS_USERS_KEY = 'asaa_db_users';
const LS_RESULTS_KEY = 'asaa_db_results';
const LS_GLOBAL_KEY = 'asaa_db_global_state';
const LS_QUESTIONS_KEY = 'asaa_db_questions';
const LS_BADGES_KEY = 'asaa_user_badges';
const LS_DAILY_QUIZ_KEY = 'asaa_daily_quiz';

const preferApi = hasApiBase();

// Try to initialize pool only if no API base is provided
const dbUrl = !preferApi ? ((import.meta as any).env?.VITE_DATABASE_URL || '') : '';
let pool: Pool | null = null;

if (dbUrl) {
  pool = new Pool({ connectionString: dbUrl });
} else if (!preferApi) {
  console.warn("VITE_DATABASE_URL is not set. The app will use LocalStorage as a fallback.");
}

// --- Badge Definitions ---
export const BADGE_DEFINITIONS: Badge[] = [
  { id: 'FIRST_STEP', name: 'Premier Pas', description: 'Terminer son premier quiz', icon: '🦶', conditionType: 'COUNT', threshold: 1 },
  { id: 'REGULAR', name: 'Habitué', description: 'Jouer 10 fois', icon: '🎗️', conditionType: 'COUNT', threshold: 10 },
  { id: 'VETERAN', name: 'Vétéran', description: 'Jouer 50 fois', icon: '🛡️', conditionType: 'COUNT', threshold: 50 },
  { id: 'PERFECTIONIST', name: 'Sans Faute', description: 'Obtenir 100% de bonnes réponses', icon: '💎', conditionType: 'PERFECT', threshold: 1 },
  { id: 'SCHOLAR', name: 'Savant', description: 'Cumuler 500 points au total', icon: '📜', conditionType: 'TOTAL_SCORE', threshold: 500 },
  { id: 'MASTER', name: 'Maître', description: 'Cumuler 1000 points au total', icon: '👑', conditionType: 'TOTAL_SCORE', threshold: 1000 },
];

// --- Database Initialization ---
export const initDB = async (): Promise<void> => {
  if (preferApi) {
    await apiPost<{ ok: boolean }>('/init');
    return;
  }
  if (!pool) {
    initLocalStorage();
    return;
  }

  try {
    const client = await pool.connect();
    
    // Create Users Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        role TEXT NOT NULL,
        last_played_date TEXT
      );
    `);

    // Create Results Table
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

    // Create Questions Bank Table
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

    // Create Daily Quiz Table
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

    // Create User Badges Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_badges (
        username TEXT NOT NULL,
        badge_id TEXT NOT NULL,
        date_earned TEXT NOT NULL,
        PRIMARY KEY (username, badge_id)
      );
    `);

    // Create Global State Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS global_state (
        key TEXT PRIMARY KEY,
        value JSONB
      );
    `);

    const stateCheck = await client.query('SELECT value FROM global_state WHERE key = $1', ['config']);
    if (stateCheck.rowCount === 0) {
      await client.query('INSERT INTO global_state (key, value) VALUES ($1, $2)', ['config', JSON.stringify({ isManualOverride: false, isQuizOpen: false })]);
    }

    client.release();
    console.log("Neon Database initialized successfully");
  } catch (err) {
    console.error("Error initializing database (Switching to LocalStorage fallback):", err);
    pool = null; 
    initLocalStorage();
  }
};

const initLocalStorage = () => {
  if (!localStorage.getItem(LS_USERS_KEY)) localStorage.setItem(LS_USERS_KEY, JSON.stringify([]));
  if (!localStorage.getItem(LS_RESULTS_KEY)) localStorage.setItem(LS_RESULTS_KEY, JSON.stringify([]));
  if (!localStorage.getItem(LS_QUESTIONS_KEY)) localStorage.setItem(LS_QUESTIONS_KEY, JSON.stringify([]));
  if (!localStorage.getItem(LS_BADGES_KEY)) localStorage.setItem(LS_BADGES_KEY, JSON.stringify([]));
  if (!localStorage.getItem(LS_DAILY_QUIZ_KEY)) localStorage.setItem(LS_DAILY_QUIZ_KEY, JSON.stringify([]));
  if (!localStorage.getItem(LS_GLOBAL_KEY)) {
    localStorage.setItem(LS_GLOBAL_KEY, JSON.stringify({ isManualOverride: false, isQuizOpen: false }));
  }
  console.log("LocalStorage initialized (Fallback mode)");
};

// --- User Management ---
export const saveUser = async (user: User): Promise<void> => {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));

  if (preferApi) {
    await apiPost('/users', user);
    return;
  }

  if (pool) {
    try {
      const client = await pool.connect();
      await client.query(
        `INSERT INTO users (username, role, last_played_date) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (username) 
         DO UPDATE SET role = $2, last_played_date = $3`,
        [user.username, user.role, user.lastPlayedDate]
      );
      client.release();
      return;
    } catch (err) {
      console.error("DB Error saveUser:", err);
    }
  }

  const users = JSON.parse(localStorage.getItem(LS_USERS_KEY) || '[]');
  const index = users.findIndex((u: User) => u.username === user.username);
  if (index >= 0) users[index] = user;
  else users.push(user);
  localStorage.setItem(LS_USERS_KEY, JSON.stringify(users));
};

export const getUsers = async (): Promise<User[]> => {
  if (preferApi) {
    return apiGet<User[]>('/users');
  }
  if (pool) {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT username, role, last_played_date as "lastPlayedDate" FROM users');
      client.release();
      return result.rows;
    } catch (err) {
      console.error("DB Error getUsers:", err);
    }
  }
  return JSON.parse(localStorage.getItem(LS_USERS_KEY) || '[]');
};

export const getCurrentUser = (): User | null => {
  const data = localStorage.getItem(CURRENT_USER_KEY);
  return data ? JSON.parse(data) : null;
};

export const logoutUser = (): void => {
  localStorage.removeItem(CURRENT_USER_KEY);
};

// --- Results Management & Badge Logic ---
export const saveResult = async (result: QuizResult): Promise<void> => {
  const currentUser = getCurrentUser();
  const today = new Date().toISOString().split('T')[0];
  
  if (currentUser && currentUser.username === result.username) {
    currentUser.lastPlayedDate = today;
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
  }

  // 1. Save Result
  if (preferApi) {
    await apiPost('/results', result);
    if (currentUser && currentUser.username === result.username) {
      currentUser.lastPlayedDate = today;
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
    }
  } else if (pool) {
    try {
      const client = await pool.connect();
      await client.query(
        'INSERT INTO results (username, score, total_questions, date, difficulty_level) VALUES ($1, $2, $3, $4, $5)',
        [result.username, result.score, result.totalQuestions, result.date, result.difficultyLevel || null]
      );
      await client.query(
        'UPDATE users SET last_played_date = $1 WHERE username = $2',
        [today, result.username]
      );
      client.release();
    } catch (err) {
      console.error("DB Error saveResult:", err);
    }
  } else {
    const results = JSON.parse(localStorage.getItem(LS_RESULTS_KEY) || '[]');
    results.push(result);
    localStorage.setItem(LS_RESULTS_KEY, JSON.stringify(results));

    const users = JSON.parse(localStorage.getItem(LS_USERS_KEY) || '[]');
    const userIdx = users.findIndex((u: User) => u.username === result.username);
    if (userIdx >= 0) {
      users[userIdx].lastPlayedDate = today;
      localStorage.setItem(LS_USERS_KEY, JSON.stringify(users));
    }
  }

  // 2. Check and Award Badges
  await checkBadges(result.username, result);
};

export const getResults = async (): Promise<QuizResult[]> => {
  if (preferApi) {
    return apiGet<QuizResult[]>('/results');
  }
  if (pool) {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT username, score, total_questions as "totalQuestions", date, difficulty_level as "difficultyLevel" FROM results ORDER BY id DESC');
      client.release();
      return result.rows;
    } catch (err) {
      console.error("DB Error getResults:", err);
    }
  }
  const results = JSON.parse(localStorage.getItem(LS_RESULTS_KEY) || '[]');
  return results.sort((a: QuizResult, b: QuizResult) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

// --- Badge Internal Logic ---

const checkBadges = async (username: string, currentResult: QuizResult) => {
  // Get all results for this user to calculate stats
  const allResults = await getResults();
  const userResults = allResults.filter(r => r.username === username);
  
  // Calculate Stats
  const gamesPlayed = userResults.length;
  const totalScore = userResults.reduce((acc, curr) => acc + curr.score, 0);
  const isPerfect = currentResult.score === (currentResult.totalQuestions * 5); // Assuming 5pts per question

  // Get existing badges
  const earnedBadges = await getUserBadges(username);
  const earnedIds = new Set(earnedBadges.map(b => b.badgeId));

  const badgesToAward: string[] = [];

  for (const def of BADGE_DEFINITIONS) {
    if (earnedIds.has(def.id)) continue;

    let awarded = false;
    switch(def.conditionType) {
      case 'COUNT':
        if (gamesPlayed >= def.threshold) awarded = true;
        break;
      case 'TOTAL_SCORE':
        if (totalScore >= def.threshold) awarded = true;
        break;
      case 'PERFECT':
        if (isPerfect) awarded = true;
        break;
    }

    if (awarded) {
      badgesToAward.push(def.id);
    }
  }

  for (const badgeId of badgesToAward) {
    await awardBadge(username, badgeId);
  }
};

const awardBadge = async (username: string, badgeId: string) => {
  const dateEarned = new Date().toISOString();
  
  if (preferApi) {
    await apiPost('/badges', { username, badgeId, dateEarned });
  } else if (pool) {
    try {
      const client = await pool.connect();
      await client.query(
        `INSERT INTO user_badges (username, badge_id, date_earned) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [username, badgeId, dateEarned]
      );
      client.release();
    } catch (err) { console.error("DB Award Badge error", err); }
  } else {
    const badges = JSON.parse(localStorage.getItem(LS_BADGES_KEY) || '[]');
    if (!badges.some((b: UserBadge) => b.username === username && b.badgeId === badgeId)) {
      badges.push({ username, badgeId, dateEarned });
      localStorage.setItem(LS_BADGES_KEY, JSON.stringify(badges));
    }
  }
};

export const getUserBadges = async (username: string): Promise<UserBadge[]> => {
  if (preferApi) {
    return apiGet<UserBadge[]>(`/badges/${encodeURIComponent(username)}`);
  }
  if (pool) {
    try {
      const client = await pool.connect();
      const res = await client.query('SELECT username, badge_id as "badgeId", date_earned as "dateEarned" FROM user_badges WHERE username = $1', [username]);
      client.release();
      return res.rows;
    } catch (err) { console.error("DB Get Badge error", err); }
  }
  const badges = JSON.parse(localStorage.getItem(LS_BADGES_KEY) || '[]');
  return badges.filter((b: UserBadge) => b.username === username);
};

// --- Question Bank Management ---

export const saveQuestion = async (question: Question): Promise<void> => {
  if (preferApi) {
    await apiPost('/questions', question);
    return;
  }
  if (pool) {
    try {
      const client = await pool.connect();
      if (question.id) {
         // Update
         await client.query(
             `UPDATE questions SET question_text=$1, options=$2, correct_index=$3, explanation=$4, difficulty=$5, topic=$6, source=$7 WHERE id=$8`,
             [question.questionText, JSON.stringify(question.options), question.correctAnswerIndex, question.explanation, question.difficulty, question.topic || null, question.source || 'MANUAL', question.id]
         );
      } else {
         // Insert
         await client.query(
            `INSERT INTO questions (question_text, options, correct_index, explanation, difficulty, topic, source) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [question.questionText, JSON.stringify(question.options), question.correctAnswerIndex, question.explanation, question.difficulty, question.topic || null, question.source || 'MANUAL']
         );
      }
      client.release();
      return;
    } catch (err) {
      console.error("DB Error saveQuestion:", err);
    }
  }

  const questions = JSON.parse(localStorage.getItem(LS_QUESTIONS_KEY) || '[]');
  if (question.id) {
      const idx = questions.findIndex((q: any) => q.id === question.id);
      if (idx >= 0) questions[idx] = question;
  } else {
      question.id = Date.now(); // Fake ID for LS
      questions.push(question);
  }
  localStorage.setItem(LS_QUESTIONS_KEY, JSON.stringify(questions));
};

export const deleteQuestion = async (id: number): Promise<void> => {
    if (preferApi) {
        await apiDelete(`/questions/${id}`);
        return;
    }
    if (pool) {
        try {
            const client = await pool.connect();
            await client.query('DELETE FROM questions WHERE id = $1', [id]);
            client.release();
            return;
        } catch (err) {
            console.error(err);
        }
    }
    const questions = JSON.parse(localStorage.getItem(LS_QUESTIONS_KEY) || '[]');
    const newQuestions = questions.filter((q: any) => q.id !== id);
    localStorage.setItem(LS_QUESTIONS_KEY, JSON.stringify(newQuestions));
};

export const getQuestionsBank = async (): Promise<Question[]> => {
    if (preferApi) {
        return apiGet<Question[]>('/questions');
    }
    if (pool) {
        try {
            const client = await pool.connect();
            const result = await client.query(`
                SELECT id, question_text as "questionText", options, correct_index as "correctAnswerIndex", explanation, difficulty, topic, source 
                FROM questions ORDER BY id DESC
            `);
            client.release();
            return result.rows; 
        } catch (err) {
            console.error("DB Error getQuestionsBank:", err);
        }
    }
  return JSON.parse(localStorage.getItem(LS_QUESTIONS_KEY) || '[]');
};

export const getQuestionsByIds = async (ids: number[]): Promise<Question[]> => {
  if (ids.length === 0) return [];

  if (preferApi) {
    const query = ids.join(',');
    return apiGet<Question[]>(`/questions/by-ids?ids=${encodeURIComponent(query)}`);
  }
  if (pool) {
    try {
      const client = await pool.connect();
      const result = await client.query(`
        SELECT id, question_text as "questionText", options, correct_index as "correctAnswerIndex", explanation, difficulty, topic, source
        FROM questions WHERE id = ANY($1::int[])
      `, [ids]);
      client.release();
      const map = new Map(result.rows.map((q: Question) => [q.id, q]));
      return ids.map(id => map.get(id)).filter(Boolean) as Question[];
    } catch (err) {
      console.error("DB Error getQuestionsByIds:", err);
    }
  }

  const questions = JSON.parse(localStorage.getItem(LS_QUESTIONS_KEY) || '[]');
  const map = new Map(questions.map((q: Question) => [q.id, q]));
  return ids.map(id => map.get(id)).filter(Boolean) as Question[];
};

// --- Global State Management ---
export const getGlobalState = async (): Promise<GlobalState> => {
  if (preferApi) {
    return apiGet<GlobalState>('/global');
  }
  if (pool) {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT value FROM global_state WHERE key = $1', ['config']);
      client.release();
      if (result.rows.length > 0) return result.rows[0].value;
    } catch (err) {
      console.error("DB Error getGlobalState:", err);
    }
  }
  const data = localStorage.getItem(LS_GLOBAL_KEY);
  return data ? JSON.parse(data) : { isManualOverride: false, isQuizOpen: false };
};

export const saveGlobalState = async (state: GlobalState): Promise<void> => {
  if (preferApi) {
    await apiPost('/global', state);
    return;
  }
  if (pool) {
    try {
      const client = await pool.connect();
      await client.query(
        `INSERT INTO global_state (key, value) VALUES ($1, $2) 
         ON CONFLICT (key) DO UPDATE SET value = $2`,
        ['config', JSON.stringify(state)]
      );
      client.release();
      return;
    } catch (err) {
      console.error("DB Error saveGlobalState:", err);
    }
  }
  localStorage.setItem(LS_GLOBAL_KEY, JSON.stringify(state));
};

// --- Daily Quiz Management ---

const getUtcDateKey = (date: Date) => date.toISOString().split('T')[0];

export const getDailyQuiz = async (dateKey: string): Promise<DailyQuiz | null> => {
  if (preferApi) {
    return apiGet<DailyQuiz | null>(`/daily-quiz/${encodeURIComponent(dateKey)}`);
  }
  if (pool) {
    try {
      const client = await pool.connect();
      const res = await client.query(`
        SELECT id, date, question_ids as "questionIds", created_at as "createdAt", closes_at as "closesAt", is_active as "isActive"
        FROM daily_quiz WHERE date = $1
      `, [dateKey]);
      client.release();
      return res.rows[0] || null;
    } catch (err) {
      console.error("DB Error getDailyQuiz:", err);
    }
  }

  const rows = JSON.parse(localStorage.getItem(LS_DAILY_QUIZ_KEY) || '[]') as DailyQuiz[];
  return rows.find(r => r.date === dateKey) || null;
};

export const saveDailyQuiz = async (quiz: DailyQuiz): Promise<void> => {
  if (preferApi) {
    await apiPost('/daily-quiz', quiz);
    return;
  }
  if (pool) {
    try {
      const client = await pool.connect();
      await client.query(`
        INSERT INTO daily_quiz (date, question_ids, created_at, closes_at, is_active)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (date) DO UPDATE SET question_ids=$2, created_at=$3, closes_at=$4, is_active=$5
      `, [quiz.date, JSON.stringify(quiz.questionIds), quiz.createdAt, quiz.closesAt, quiz.isActive]);
      client.release();
      return;
    } catch (err) {
      console.error("DB Error saveDailyQuiz:", err);
    }
  }

  const rows = JSON.parse(localStorage.getItem(LS_DAILY_QUIZ_KEY) || '[]') as DailyQuiz[];
  const idx = rows.findIndex(r => r.date === quiz.date);
  if (idx >= 0) rows[idx] = quiz;
  else rows.push(quiz);
  localStorage.setItem(LS_DAILY_QUIZ_KEY, JSON.stringify(rows));
};

export const deactivateExpiredDailyQuiz = async (nowUtc: Date): Promise<void> => {
  const nowIso = nowUtc.toISOString();

  if (preferApi) {
    await apiPost('/daily-quiz/deactivate', { nowIso });
    return;
  }
  if (pool) {
    try {
      const client = await pool.connect();
      await client.query(`
        UPDATE daily_quiz SET is_active = false
        WHERE is_active = true AND closes_at < $1
      `, [nowIso]);
      client.release();
      return;
    } catch (err) {
      console.error("DB Error deactivateExpiredDailyQuiz:", err);
    }
  }

  const rows = JSON.parse(localStorage.getItem(LS_DAILY_QUIZ_KEY) || '[]') as DailyQuiz[];
  let changed = false;
  const updated = rows.map(r => {
    if (r.isActive && r.closesAt < nowIso) {
      changed = true;
      return { ...r, isActive: false };
    }
    return r;
  });
  if (changed) localStorage.setItem(LS_DAILY_QUIZ_KEY, JSON.stringify(updated));
};

export const getUsedQuestionIds = async (): Promise<Set<number>> => {
  if (preferApi) {
    const ids = await apiGet<number[]>('/questions/used-ids');
    return new Set(ids);
  }
  if (pool) {
    try {
      const client = await pool.connect();
      const res = await client.query(`SELECT question_ids FROM daily_quiz`);
      client.release();
      const used = new Set<number>();
      res.rows.forEach(r => {
        const ids = r.question_ids || [];
        ids.forEach((id: number) => used.add(id));
      });
      return used;
    } catch (err) {
      console.error("DB Error getUsedQuestionIds:", err);
    }
  }

  const rows = JSON.parse(localStorage.getItem(LS_DAILY_QUIZ_KEY) || '[]') as DailyQuiz[];
  const used = new Set<number>();
  rows.forEach(r => r.questionIds.forEach(id => used.add(id)));
  return used;
};

export const createDailyQuizIfNeeded = async (
  nowUtc: Date,
  totalQuestions = 10
): Promise<DailyQuiz | null> => {
  if (preferApi) {
    return apiPost<DailyQuiz | null>('/daily-quiz/create-if-needed', {
      nowUtc: nowUtc.toISOString(),
      totalQuestions
    });
  }
  const dateKey = getUtcDateKey(nowUtc);
  const existing = await getDailyQuiz(dateKey);
  if (existing) return existing.isActive ? existing : null;

  const questions = await getQuestionsBank();
  if (questions.length === 0) return null;

  const usedIds = await getUsedQuestionIds();
  const hardFirst = questions.filter(q => (q.difficulty === 'HARD' || q.difficulty === 'EXPERT'));
  const candidates = hardFirst.length >= totalQuestions ? hardFirst : questions;

  const available = candidates.filter(q => q.id && !usedIds.has(q.id));
  const fallback = candidates.filter(q => q.id && usedIds.has(q.id));

  const pick = (list: Question[], count: number) => {
    const copy = [...list];
    const out: Question[] = [];
    while (copy.length > 0 && out.length < count) {
      const idx = Math.floor(Math.random() * copy.length);
      const [q] = copy.splice(idx, 1);
      out.push(q);
    }
    return out;
  };

  let selected = pick(available, totalQuestions);
  if (selected.length < totalQuestions) {
    selected = selected.concat(pick(fallback, totalQuestions - selected.length));
  }

  const questionIds = selected.map(q => q.id!).slice(0, totalQuestions);
  if (questionIds.length === 0) return null;

  const createdAt = nowUtc.toISOString();
  const closesAt = new Date(Date.UTC(nowUtc.getUTCFullYear(), nowUtc.getUTCMonth(), nowUtc.getUTCDate(), 23, 50, 0)).toISOString();

  const quiz: DailyQuiz = {
    date: dateKey,
    questionIds,
    createdAt,
    closesAt,
    isActive: true
  };

  await saveDailyQuiz(quiz);
  return quiz;
};
