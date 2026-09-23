import { integrationConfig, isAiConfigured } from '../config/integrations';
import { logger } from '../utils/logger';
import { validateQuestionPayload } from './examService';
import { expandTopicCurriculum, type TopicBlueprint } from './examTopicCurriculum';

export type ExamQuestionGenInput = {
  title?: string;
  subjectName?: string;
  className?: string;
  category?: string;
  bookName?: string;
  chapterRange?: string;
  description?: string;
  instructions?: string;
  topic?: string;
  language?: 'en' | 'fa' | 'ps' | 'mixed';
  difficulty?: 'easy' | 'medium' | 'hard';
  totalMarks?: number;
  mcqCount?: number;
  trueFalseCount?: number;
  descriptiveCount?: number;
};

export type GeneratedExamQuestion = {
  type: 'mcq' | 'true_false' | 'descriptive';
  text: string;
  marks: number;
  options?: Array<{ key: string; text: string; isCorrect: boolean }>;
  correctAnswer?: string | boolean | null;
  expectedAnswer?: string;
  explanation?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  topic?: string;
};

type ProviderTarget = {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  kind: 'openai' | 'gemini';
};

function clampInt(value: unknown, min: number, max: number, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function languageLabel(language?: string) {
  if (language === 'en') return 'English';
  if (language === 'ps') return 'Pashto';
  if (language === 'mixed') return 'mixed Dari/Pashto/English as appropriate for Afghan classrooms';
  return 'Dari (Afghan Persian)';
}

function bannedPhrases(input: ExamQuestionGenInput): string[] {
  const list = [input.className, 'Class Prep', 'class prep', 'ClassPrep']
    .map((v) => String(v || '').trim())
    .filter((v) => v.length >= 2);
  // Also ban subject labels that look like class codes (e.g. "Class Prep 1")
  const subject = String(input.subjectName || '').trim();
  if (/class\s*prep/i.test(subject) || /^صنف\s+/i.test(subject)) {
    list.push(subject);
  }
  return Array.from(new Set(list));
}

function stripBannedText(text: string, banned: string[]) {
  let next = String(text || '');
  for (const phrase of banned) {
    if (!phrase) continue;
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    next = next.replace(new RegExp(escaped, 'gi'), '').replace(/\s{2,}/g, ' ').trim();
  }
  next = next
    .replace(/\bClass\s*Prep\s*\d+\b/gi, '')
    .replace(/صنف\s+[^\s،.؟!]+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return next;
}

function normalizeWhitespace(text: string) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function fingerprint(text: string) {
  return normalizeWhitespace(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .slice(0, 160);
}

function extractTopicAngles(topic: string, language: string): string[] {
  const curriculum = expandTopicCurriculum(topic, language);
  const cleaned = normalizeWhitespace(topic)
    .replace(/[«»"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const chunks = cleaned
    .split(/[،,.;؟!?\n|/]+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 4);

  const unique = Array.from(
    new Set(
      [...curriculum.outline, ...chunks, cleaned || (language === 'en' ? 'the lesson topic' : 'موضوع درس')]
        .map((a) => normalizeWhitespace(a))
        .filter(Boolean)
    )
  );

  while (unique.length < 12) {
    unique.push(`${curriculum.outline[unique.length % Math.max(1, curriculum.outline.length)] || cleaned} (${unique.length + 1})`);
  }
  return unique.slice(0, 24);
}

function distributeMarks(totalMarks: number, count: number): number[] {
  const safeCount = Math.max(1, count);
  const base = Math.max(1, Math.floor(totalMarks / safeCount));
  const marks = Array.from({ length: safeCount }, () => base);
  let leftover = Math.max(0, totalMarks - base * safeCount);
  let i = 0;
  while (leftover > 0) {
    marks[i % safeCount] += 1;
    leftover -= 1;
    i += 1;
  }
  return marks;
}

function resolveProviders(): ProviderTarget[] {
  const providers: ProviderTarget[] = [];
  const primaryKey = integrationConfig.ai.apiKey;
  const primaryBase = integrationConfig.ai.baseUrl;
  const primaryModel = integrationConfig.ai.model;

  if (integrationConfig.ai.enabled && primaryKey) {
    providers.push({
      name: 'configured',
      baseUrl: primaryBase,
      apiKey: primaryKey,
      model: primaryModel,
      kind: 'openai'
    });
  }

  const groqKey = process.env.GROQ_API_KEY || (primaryBase.includes('groq') ? primaryKey : '');
  if (groqKey) {
    providers.push({
      name: 'groq',
      baseUrl: 'https://api.groq.com/openai/v1',
      apiKey: groqKey,
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      kind: 'openai'
    });
  }

  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '';
  if (geminiKey) {
    providers.push({
      name: 'gemini',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      apiKey: geminiKey,
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
      kind: 'gemini'
    });
  }

  // Deduplicate by name+model
  const seen = new Set<string>();
  return providers.filter((p) => {
    const key = `${p.name}:${p.model}:${p.apiKey.slice(0, 8)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildSystemPrompt(language: string) {
  return [
    'You are an expert Afghan school teacher writing a complete examination section.',
    'Think like a human teacher: understand the TOPIC keyword, then cover the WHOLE section.',
    'Return ONLY valid JSON: {"questions":[...]} with no markdown.',
    'Mandatory rules:',
    '1) ALL questions must stay strictly inside the given topic/section and its natural subtopics.',
    '2) Cover comprehensively: definition, main parts/components, key related terms, purpose/use, examples, common mistakes when relevant.',
    '3) Example: topic "computer" → definition, parts, hardware/software, input/output, CPU/RAM, storage.',
    '4) Example: topic "database" → what is database, what is DBMS, table/field/record, primary key, DBMS advantages.',
    '5) Each question must test a DIFFERENT subtopic. Never repeat the same stem.',
    '6) Do NOT dump the full topic sentence into every question. Ask focused teacher-style questions.',
    '7) NEVER mention class name, Class Prep, صنف name, or roster labels in question/option text.',
    '8) MCQ: exactly 4 options A-D, exactly one correct, short distinct plausible answers.',
    '9) true_false: correctAnswer "true" or "false". descriptive: include expectedAnswer.',
    '10) Order: all mcq first, then true_false, then descriptive.',
    '11) Each object: type, text, marks, options?, correctAnswer?, expectedAnswer?, difficulty, topic (subtopic name).',
    `12) Write ALL student-facing text in ${languageLabel(language)}.`
  ].join('\n');
}

function buildUserPrompt(input: ExamQuestionGenInput & {
  topic: string;
  marksEach: number;
  mcqCount: number;
  trueFalseCount: number;
  descriptiveCount: number;
  outline: string[];
  domain: string;
}) {
  return [
    `Main topic / keyword to teach and examine: ${input.topic}`,
    `Detected subject domain: ${input.domain}`,
    'Teacher syllabus outline (cover these subtopics across the questions):',
    ...input.outline.map((item, index) => `  ${index + 1}. ${item}`),
    `Exam title (context only): ${input.title || '—'}`,
    `Subject name (context only): ${input.subjectName || '—'}`,
    `Book/chapter context: ${input.bookName || '—'} / ${input.chapterRange || '—'}`,
    `Extra notes: ${input.description || '—'}`,
    `Difficulty: ${input.difficulty}`,
    `About ${input.marksEach} marks each (total budget ${input.totalMarks}).`,
    `Create EXACTLY: ${input.mcqCount} mcq, ${input.trueFalseCount} true_false, ${input.descriptiveCount} descriptive.`,
    'Distribute questions across the syllabus outline so the whole section is examined, like a human teacher would do.',
    'Forbidden in question/option text: class name, Class Prep, صنف labels.'
  ].join('\n');
}

async function callOpenAiCompatible(provider: ProviderTarget, system: string, user: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(integrationConfig.ai.timeoutMs, 70000));
  try {
    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: provider.model,
        temperature: 0.55,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      }),
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`${provider.name} status ${response.status}`);
    }
    const payload = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return payload.choices?.[0]?.message?.content ?? '';
  } finally {
    clearTimeout(timeout);
  }
}

async function callGemini(provider: ProviderTarget, system: string, user: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(integrationConfig.ai.timeoutMs, 70000));
  try {
    const url = `${provider.baseUrl}/models/${provider.model}:generateContent?key=${encodeURIComponent(provider.apiKey)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: {
          temperature: 0.55,
          responseMimeType: 'application/json'
        }
      }),
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`${provider.name} status ${response.status}`);
    }
    const payload = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    return payload.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('\n') || '';
  } finally {
    clearTimeout(timeout);
  }
}

function parseQuestionsJson(content: string): GeneratedExamQuestion[] {
  try {
    const trimmed = content.trim();
    const jsonBlock = trimmed.match(/\{[\s\S]*\}/)?.[0] ?? trimmed;
    const parsed = JSON.parse(jsonBlock) as { questions?: GeneratedExamQuestion[] };
    return Array.isArray(parsed.questions) ? parsed.questions : [];
  } catch {
    return [];
  }
}

function normalizeOneQuestion(
  raw: GeneratedExamQuestion,
  marks: number,
  difficulty: 'easy' | 'medium' | 'hard',
  topic: string,
  banned: string[]
): GeneratedExamQuestion | null {
  const type = raw.type === 'true_false' || raw.type === 'descriptive' ? raw.type : 'mcq';
  const text = stripBannedText(normalizeWhitespace(raw.text), banned);
  if (!text || text.length < 8) return null;

  if (type === 'mcq') {
    const keys = ['A', 'B', 'C', 'D'];
    let options = (raw.options || []).slice(0, 4).map((opt, index) => ({
      key: keys[index],
      text: stripBannedText(normalizeWhitespace(String(opt.text || '')), banned),
      isCorrect: Boolean(opt.isCorrect)
    }));
    while (options.length < 4) {
      options.push({ key: keys[options.length], text: '', isCorrect: false });
    }
    options = options.map((opt, index) => ({
      ...opt,
      key: keys[index],
      text: opt.text || (keys[index] === 'A' ? 'گزینه درست' : `گزینه ${keys[index]}`)
    }));

    // Unique option texts
    const seen = new Set<string>();
    options = options.map((opt, index) => {
      let textValue = opt.text;
      let guard = 0;
      while (seen.has(fingerprint(textValue)) && guard < 5) {
        textValue = `${opt.text} (${keys[index]})`;
        guard += 1;
      }
      seen.add(fingerprint(textValue));
      return { ...opt, text: textValue };
    });

    if (!options.some((o) => o.isCorrect)) {
      const wanted = String(raw.correctAnswer || 'A').toUpperCase();
      options = options.map((o) => ({ ...o, isCorrect: o.key === wanted }));
      if (!options.some((o) => o.isCorrect)) options[0].isCorrect = true;
    } else {
      let found = false;
      options = options.map((o) => {
        if (o.isCorrect && !found) {
          found = true;
          return { ...o, isCorrect: true };
        }
        return { ...o, isCorrect: false };
      });
    }

    const correct = options.find((o) => o.isCorrect)?.key || 'A';
    const question: GeneratedExamQuestion = {
      type: 'mcq',
      text,
      marks,
      options,
      correctAnswer: correct,
      explanation: stripBannedText(String(raw.explanation || ''), banned),
      difficulty: raw.difficulty || difficulty,
      topic: stripBannedText(String(raw.topic || topic), banned)
    };
    if (validateQuestionPayload(question)) return null;
    return question;
  }

  if (type === 'true_false') {
    const answer = String(raw.correctAnswer ?? true).toLowerCase() === 'false' || raw.correctAnswer === false
      ? 'false'
      : 'true';
    const question: GeneratedExamQuestion = {
      type: 'true_false',
      text,
      marks,
      options: [
        { key: 'true', text: 'True', isCorrect: answer === 'true' },
        { key: 'false', text: 'False', isCorrect: answer === 'false' }
      ],
      correctAnswer: answer,
      explanation: stripBannedText(String(raw.explanation || ''), banned),
      difficulty: raw.difficulty || difficulty,
      topic: stripBannedText(String(raw.topic || topic), banned)
    };
    if (validateQuestionPayload(question)) return null;
    return question;
  }

  const question: GeneratedExamQuestion = {
    type: 'descriptive',
    text,
    marks,
    expectedAnswer: stripBannedText(normalizeWhitespace(String(raw.expectedAnswer || '')), banned),
    explanation: stripBannedText(String(raw.explanation || ''), banned),
    difficulty: raw.difficulty || difficulty,
    topic: stripBannedText(String(raw.topic || topic), banned)
  };
  if (validateQuestionPayload(question)) return null;
  return question;
}

function orderByType(questions: GeneratedExamQuestion[]) {
  const rank = { mcq: 0, true_false: 1, descriptive: 2 } as const;
  return [...questions].sort((a, b) => rank[a.type] - rank[b.type]);
}

function dedupeQuestions(questions: GeneratedExamQuestion[]) {
  const seen = new Set<string>();
  const out: GeneratedExamQuestion[] = [];
  for (const q of questions) {
    const key = `${q.type}:${fingerprint(q.text)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(q);
  }
  return out;
}

function buildSmartLocalQuestions(input: {
  topic: string;
  language: string;
  difficulty: 'easy' | 'medium' | 'hard';
  mcqCount: number;
  trueFalseCount: number;
  descriptiveCount: number;
  marksPlan: number[];
  banned: string[];
  bookName?: string;
  chapterRange?: string;
}): GeneratedExamQuestion[] {
  const curriculum = expandTopicCurriculum(input.topic, input.language);
  const blueprints = curriculum.blueprints;
  const questions: GeneratedExamQuestion[] = [];
  let markIndex = 0;
  const nextMarks = () => input.marksPlan[Math.min(markIndex++, input.marksPlan.length - 1)] || 1;

  const pickBlueprint = (index: number): TopicBlueprint => blueprints[index % Math.max(1, blueprints.length)];

  for (let i = 0; i < input.mcqCount; i += 1) {
    const bp = pickBlueprint(i);
    if (!bp.mcq) continue;
    const correctIndex = i % 4;
    const texts = [...bp.mcq.wrong];
    texts.splice(correctIndex, 0, bp.mcq.correct);
    const keys = ['A', 'B', 'C', 'D'];
    questions.push({
      type: 'mcq',
      text: bp.mcq.stem,
      marks: nextMarks(),
      options: keys.map((key, idx) => ({
        key,
        text: texts[idx],
        isCorrect: idx === correctIndex
      })),
      correctAnswer: keys[correctIndex],
      difficulty: input.difficulty,
      topic: bp.subtopic
    });
  }

  for (let i = 0; i < input.trueFalseCount; i += 1) {
    const bp = pickBlueprint(i + 1);
    if (!bp.trueFalse) continue;
    const answer = bp.trueFalse.answer;
    questions.push({
      type: 'true_false',
      text: bp.trueFalse.stem,
      marks: nextMarks(),
      options: [
        { key: 'true', text: 'True', isCorrect: answer === 'true' },
        { key: 'false', text: 'False', isCorrect: answer === 'false' }
      ],
      correctAnswer: answer,
      difficulty: input.difficulty,
      topic: bp.subtopic
    });
  }

  for (let i = 0; i < input.descriptiveCount; i += 1) {
    const bp = pickBlueprint(i + 2);
    if (!bp.descriptive) continue;
    questions.push({
      type: 'descriptive',
      text: bp.descriptive.stem,
      marks: nextMarks(),
      expectedAnswer: bp.descriptive.expected,
      difficulty: input.difficulty,
      topic: bp.subtopic
    });
  }

  return orderByType(
    dedupeQuestions(
      questions
        .map((q) => normalizeOneQuestion(q, q.marks, input.difficulty, input.topic, input.banned))
        .filter(Boolean) as GeneratedExamQuestion[]
    )
  );
}

function fillMissingWithLocal(
  existing: GeneratedExamQuestion[],
  input: ExamQuestionGenInput & {
    topic: string;
    language: string;
    difficulty: 'easy' | 'medium' | 'hard';
    mcqCount: number;
    trueFalseCount: number;
    descriptiveCount: number;
    marksPlan: number[];
    banned: string[];
  }
) {
  const local = buildSmartLocalQuestions({
    topic: input.topic,
    language: input.language,
    difficulty: input.difficulty,
    mcqCount: input.mcqCount,
    trueFalseCount: input.trueFalseCount,
    descriptiveCount: input.descriptiveCount,
    marksPlan: input.marksPlan,
    banned: input.banned,
    bookName: input.bookName,
    chapterRange: input.chapterRange
  });

  const byType = {
    mcq: existing.filter((q) => q.type === 'mcq'),
    true_false: existing.filter((q) => q.type === 'true_false'),
    descriptive: existing.filter((q) => q.type === 'descriptive')
  };

  const need = {
    mcq: input.mcqCount,
    true_false: input.trueFalseCount,
    descriptive: input.descriptiveCount
  } as const;

  for (const type of ['mcq', 'true_false', 'descriptive'] as const) {
    const pool = local.filter((q) => q.type === type);
    let i = 0;
    while (byType[type].length < need[type] && i < pool.length) {
      const candidate = pool[i++];
      const fp = fingerprint(candidate.text);
      if (byType[type].some((q) => fingerprint(q.text) === fp)) continue;
      byType[type].push(candidate);
    }
  }

  const merged = orderByType([...byType.mcq, ...byType.true_false, ...byType.descriptive]);
  return merged.slice(0, input.mcqCount + input.trueFalseCount + input.descriptiveCount).map((q, index) => ({
    ...q,
    marks: input.marksPlan[index] || q.marks
  }));
}

export async function generateExamQuestions(input: ExamQuestionGenInput): Promise<{
  questions: GeneratedExamQuestion[];
  generatedBy: 'ai_provider' | 'local_fallback';
  provider?: string;
}> {
  const mcqCount = clampInt(input.mcqCount, 0, 30, 0);
  const trueFalseCount = clampInt(input.trueFalseCount, 0, 20, 0);
  const descriptiveCount = clampInt(input.descriptiveCount, 0, 15, 0);
  const totalCount = mcqCount + trueFalseCount + descriptiveCount;
  if (totalCount < 1) throw new Error('At least one question is required');

  const totalMarks = Math.max(totalCount, clampInt(input.totalMarks, 1, 1000, 100));
  const marksPlan = distributeMarks(totalMarks, totalCount);
  const language = input.language || 'fa';
  const difficulty = input.difficulty || 'medium';
  const banned = bannedPhrases(input);
  const topic = stripBannedText(
    normalizeWhitespace(input.topic || input.title || input.subjectName || 'موضوع درس'),
    banned
  );
  const curriculum = expandTopicCurriculum(topic, language);

  const system = buildSystemPrompt(language);
  const user = buildUserPrompt({
    ...input,
    topic,
    marksEach: marksPlan[0] || 1,
    mcqCount,
    trueFalseCount,
    descriptiveCount,
    totalMarks,
    outline: curriculum.outline,
    domain: curriculum.domain
  });

  const providers = resolveProviders();
  for (const provider of providers) {
    try {
      const content = provider.kind === 'gemini'
        ? await callGemini(provider, system, user)
        : await callOpenAiCompatible(provider, system, user);
      const raw = parseQuestionsJson(content);
      const normalized = orderByType(
        dedupeQuestions(
          raw
            .map((q, index) => normalizeOneQuestion(q, marksPlan[index] || marksPlan[0] || 1, difficulty, topic, banned))
            .filter(Boolean) as GeneratedExamQuestion[]
        )
      );

      if (normalized.length >= Math.min(totalCount, Math.max(1, Math.ceil(totalCount * 0.6)))) {
        const completed = fillMissingWithLocal(normalized, {
          ...input,
          topic,
          language,
          difficulty,
          mcqCount,
          trueFalseCount,
          descriptiveCount,
          marksPlan,
          banned
        });
        if (completed.length === totalCount) {
          logger.info('Exam questions generated via AI provider', { provider: provider.name, count: completed.length });
          return { questions: completed, generatedBy: 'ai_provider', provider: provider.name };
        }
      }
    } catch (error) {
      logger.warn('Exam AI provider failed', { provider: provider.name, error: String(error) });
    }
  }

  const local = buildSmartLocalQuestions({
    topic,
    language,
    difficulty,
    mcqCount,
    trueFalseCount,
    descriptiveCount,
    marksPlan,
    banned,
    bookName: input.bookName,
    chapterRange: input.chapterRange
  });

  return {
    questions: local.slice(0, totalCount).map((q, index) => ({ ...q, marks: marksPlan[index] || q.marks })),
    generatedBy: providers.length ? 'local_fallback' : 'local_fallback',
    provider: providers.length ? 'fallback_after_ai' : 'local_smart'
  };
}

export function hasAnyExamAiProvider() {
  return isAiConfigured() || resolveProviders().length > 0;
}
