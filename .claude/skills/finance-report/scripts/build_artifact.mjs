#!/usr/bin/env node
// Renders the finance report JSON (from export-data.mjs) into a self-contained HTML page for the Artifact tool.
//
// Usage: node .claude/skills/finance-report/scripts/build_artifact.mjs <data.json> <out.html>
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const [src, out] = process.argv.slice(2);
if (!src || !out) {
  console.error('Usage: node build_artifact.mjs <data.json> <out.html>');
  process.exit(1);
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const parts = (iso) => iso.split('-').map(Number);
const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function periodLabel(from, to) {
  const [fy, fm, fd] = parts(from);
  const [ty, tm, td] = parts(to);
  const lastOfMonth = new Date(ty, tm, 0).getDate();
  if (fd === 1 && td === lastOfMonth) {
    if (fy === ty && fm === tm) return `${MONTHS[fm - 1]} ${fy}`;
    if (fy === ty && fm === 1 && tm === 12) return `${fy}`;
    if (fy === ty) return `${MONTHS[fm - 1].slice(0, 3)}–${MONTHS[tm - 1].slice(0, 3)} ${fy}`;
    return `${MONTHS[fm - 1].slice(0, 3)} ${fy} – ${MONTHS[tm - 1].slice(0, 3)} ${ty}`;
  }
  const short = (y, m, d, withYear) => `${d} ${MONTHS[m - 1].slice(0, 3)}${withYear ? ` ${y}` : ''}`;
  return `${short(fy, fm, fd, fy !== ty)} – ${short(ty, tm, td, true)}`;
}

const data = JSON.parse(fs.readFileSync(src, 'utf8'));
const label = periodLabel(data.meta.from, data.meta.to);
data.meta.periodLabel = label;
const title = `${label} ${data.meta.sample ? 'Sample Statement' : 'Money Statement'}`;

const templatePath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../assets/report-template.html');
const json = JSON.stringify(data).replace(/</g, '\\u003c');
const html = fs
  .readFileSync(templatePath, 'utf8')
  .replaceAll('__TITLE__', escapeHtml(title))
  .replaceAll('__PERIOD__', escapeHtml(label))
  .replace('/*__REPORT_DATA__*/', () => json);

fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
fs.writeFileSync(out, html);
console.log(JSON.stringify({ file: path.resolve(out), title, description: `Income, expenses and loan EMIs for ${label}.` }, null, 2));
