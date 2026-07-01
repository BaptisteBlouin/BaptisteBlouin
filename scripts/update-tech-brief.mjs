// Injecte les dernières actus de la veille (Tech Brief) dans le README du profil,
// entre les marqueurs <!-- TECH-BRIEF:START --> et <!-- TECH-BRIEF:END -->.
//
// Source : la même route publique que le dépôt tech-brief (aucune clé requise).
// Lancé par .github/workflows/tech-brief.yml (2×/jour + manuel).

import { readFileSync, writeFileSync } from 'node:fs';

const WORKER_URL = process.env.WORKER_URL || 'https://baptiste-agent.blouin-baptiste94.workers.dev';
const REPO_URL = 'https://github.com/BaptisteBlouin/tech-brief';
const MAX = Math.max(1, parseInt(process.env.MAX_HEADLINES || '5', 10) || 5);
const README = 'README.md';
const START = '<!-- TECH-BRIEF:START -->';
const END = '<!-- TECH-BRIEF:END -->';

// Nettoie une puce du résumé : retire les citations [1] / [a, b] et les liens Markdown.
const clean = (line) =>
  line
    .replace(/^\s*[-*]\s+/, '')
    .replace(/\[([^\]]+)\]\((?:<[^>]*>|[^)]*)\)/g, '$1') // [texte](url) -> texte
    .replace(/\[[^\]]+\]/g, '')                          // citations [1], [a, b]
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')                     // espace avant ponctuation
    .trim();

async function main() {
  const res = await fetch(`${WORKER_URL}/news`, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`GET /news -> ${res.status}`);
  const d = await res.json();

  const body = (d.summary && d.summary.en) || '';
  const headlines = body
    .split('\n')
    .filter((l) => /^\s*[-*]\s+/.test(l))
    .map(clean)
    .filter(Boolean)
    .slice(0, MAX);

  const date = d.dayKey || new Date().toISOString().slice(0, 10);
  const list = headlines.length
    ? headlines.map((h) => `- ${h}`).join('\n')
    : '- _No fresh items today._';

  const block = [
    START,
    `#### 📰 Tech Brief — latest digest (${date})`,
    '',
    list,
    '',
    `➡️ **[Full digest & archive](${REPO_URL})** · updated twice a day, no human in the loop.`,
    END,
  ].join('\n');

  const md = readFileSync(README, 'utf8');
  if (!md.includes(START) || !md.includes(END)) {
    throw new Error(`Marqueurs ${START} / ${END} absents du ${README}.`);
  }
  const next = md.replace(new RegExp(`${START}[\\s\\S]*?${END}`), block);
  if (next === md) {
    console.log('Aucun changement.');
    return;
  }
  writeFileSync(README, next);
  console.log(`README mis à jour (${headlines.length} titres, ${date}).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
