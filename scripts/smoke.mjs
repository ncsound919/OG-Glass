import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

// Live stdio smoke test for the upgraded OG-Glass server (JEV design tools).
// Run: node scripts/smoke.mjs  (set OG_GLASS_JEV_ENABLED=0 to force offline)

const child = spawn(process.execPath, ['dist/index.js'], {
  cwd: process.cwd(),
  env: { ...process.env, OG_GLASS_JEV_ENABLED: '0' },
  stdio: ['pipe', 'pipe', 'inherit'],
});
const rl = createInterface({ input: child.stdout });
const pending = new Map();
let id = 0;
function send(method, params) {
  const mid = ++id;
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: mid, method, params }) + '\n');
  return new Promise((resolve) => pending.set(mid, resolve));
}
rl.on('line', (line) => {
  const msg = JSON.parse(line);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg.result);
    pending.delete(msg.id);
  }
});

await send('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'smoke', version: '1' } });
const tools = await send('tools/list', {});
const names = tools.tools.map((t) => t.name);
const newTools = names.filter((n) => ['validate_preset', 'list_preset_quality', 'export_design_markdown', 'decide_design_direction', 'design_brief'].includes(n));
console.log('total tools:', names.length, '| new:', newTools.length, '->', newTools.join(', '));

const quality = await send('tools/call', { name: 'list_preset_quality', arguments: {} });
const rows = JSON.parse(quality.content[0].text).presets;
console.log('presets:', rows.length, '| all pass:', rows.every((r) => r.passed));
console.log('top scores:', rows.slice(0, 3).map((r) => `${r.preset_id}=${r.score}`).join(' '));

const brief = await send('tools/call', { name: 'design_brief', arguments: { goal: 'a fintech trading dashboard for B2B clients' } });
const briefText = JSON.parse(brief.content[0].text);
console.log('design_brief source:', briefText.source, '| chosen:', briefText.chosen.style, '| preset:', briefText.preset_resolved, '| quality passed:', briefText.quality?.passed);
console.log('design_md head:', briefText.design_md.split('\n')[0]);

child.kill();
console.log('SMOKE OK');