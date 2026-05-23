/**
 * Batch-generates CLF-C02 answer explanations for all 719 questions using Claude Haiku.
 *
 * Usage (PowerShell):
 *   cd apps/web
 *   $env:ANTHROPIC_API_KEY="sk-ant-..."
 *   node scripts/generate-explanations.mjs
 *
 * Usage (bash/macOS/Linux):
 *   cd apps/web
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/generate-explanations.mjs
 *
 * Features:
 *   - Resumes from where it left off (progress saved to explanations-progress.json)
 *   - Processes 5 questions concurrently with a short delay between batches
 *   - Estimated cost: ~$0.50 total for all 719 questions (Haiku pricing)
 *   - Estimated time: ~5-10 minutes
 *
 * Output: apps/web/public/assets/js/explanations.js
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const questionsPath = join(__dir, '../public/assets/js/questions.js');
const outputPath    = join(__dir, '../public/assets/js/explanations.js');
const progressPath  = join(__dir, '../explanations-progress.json');

// ── Parse questions.js (format: var ALL_QUESTIONS=[...];) ──────────────────
const raw = readFileSync(questionsPath, 'utf8').replace(/^﻿/, ''); // strip BOM
const jsonStr = raw.replace(/^var ALL_QUESTIONS=/, '').replace(/;?\s*$/, '');
const questions = JSON.parse(jsonStr);
console.log(`Loaded ${questions.length} questions from questions.js`);

// ── Load saved progress (supports resume) ─────────────────────────────────
const saved = existsSync(progressPath)
  ? JSON.parse(readFileSync(progressPath, 'utf8'))
  : {};

const BATCH_SIZE = 5;    // concurrent requests per batch
const BATCH_DELAY = 400; // ms between batches

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

// ── Generate explanation for a single question ────────────────────────────
async function explain(q) {
  const correctLetters = Array.isArray(q.correct) ? q.correct : [q.correct];
  const correctTexts   = correctLetters.map(k => `${k}: ${q.options[k]}`).join('; ');
  const optionLines    = Object.entries(q.options).map(([k, v]) => `${k}: ${v}`).join('\n');

  const resp = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 220,
    messages: [{
      role: 'user',
      content:
        `You are an AWS CLF-C02 exam expert. In 2-4 concise sentences, explain why the ` +
        `correct answer is correct and briefly why the other options are wrong. ` +
        `Do not restate the question text.\n\n` +
        `Question: ${q.question}\n\n` +
        `Options:\n${optionLines}\n\n` +
        `Correct answer: ${correctTexts}`,
    }],
  });
  return resp.content[0].text.trim();
}

// ── Main loop ─────────────────────────────────────────────────────────────
const results = { ...saved };
const todo    = questions.filter(q => !(String(q.id) in results) && !(q.id in results));

console.log(`Done: ${Object.keys(results).length} | Remaining: ${todo.length}`);
if (todo.length === 0) {
  console.log('Nothing to do — all questions already have explanations.');
}

for (let i = 0; i < todo.length; i += BATCH_SIZE) {
  const chunk = todo.slice(i, i + BATCH_SIZE);

  const entries = await Promise.all(chunk.map(async q => {
    try {
      const text = await explain(q);
      process.stdout.write(`  [${q.id}] ✓\n`);
      return [String(q.id), text];
    } catch (err) {
      process.stderr.write(`  [${q.id}] ✗ ${err.message}\n`);
      return [String(q.id), ''];
    }
  }));

  entries.forEach(([id, text]) => { results[id] = text; });

  // Save progress after every batch so we can resume on interruption
  writeFileSync(progressPath, JSON.stringify(results, null, 2));

  const done = Object.keys(results).length;
  const pct  = Math.round(done / questions.length * 100);
  process.stdout.write(`Progress: ${done}/${questions.length} (${pct}%)\n`);

  if (i + BATCH_SIZE < todo.length) {
    await new Promise(r => setTimeout(r, BATCH_DELAY));
  }
}

// ── Write final explanations.js ────────────────────────────────────────────
const lines = Object.entries(results)
  .sort((a, b) => Number(a[0]) - Number(b[0]))
  .map(([id, text]) => `  ${id}: ${JSON.stringify(text)}`);

const output =
  `// Auto-generated CLF-C02 answer explanations.\n` +
  `// Do not edit manually — re-run scripts/generate-explanations.mjs to regenerate.\n` +
  `window.EXPLANATIONS = {\n` +
  lines.join(',\n') +
  `\n};\n`;

writeFileSync(outputPath, output, 'utf8');
console.log(`\n✓ Wrote ${lines.length} explanations → ${outputPath}`);
console.log(`  You can now delete explanations-progress.json if desired.`);
