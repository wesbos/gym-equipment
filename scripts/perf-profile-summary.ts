/** Summarise a .cpuprofile (from scripts/perf.ts --profile): top self and total time by function. */
import { readFileSync } from 'node:fs';
type Node = { id: number; callFrame: { functionName: string; url: string; lineNumber: number }; children?: number[]; hitCount?: number };
const p = JSON.parse(readFileSync(process.argv[2], 'utf8')) as { nodes: Node[]; samples: number[]; timeDeltas: number[] };
const byId = new Map(p.nodes.map(n => [n.id, n])), parent = new Map<number, number>();
for (const n of p.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
const self = new Map<number, number>();
p.samples.forEach((id, i) => self.set(id, (self.get(id) ?? 0) + (p.timeDeltas[i] ?? 0) / 1000));
const label = (n: Node) => `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').slice(-2).join('/').replace(/\?.*/, '')}:${n.callFrame.lineNumber + 1}`;
const selfBy = new Map<string, number>(), totalBy = new Map<string, number>();
for (const [id, ms] of self) {
  selfBy.set(label(byId.get(id)!), (selfBy.get(label(byId.get(id)!)) ?? 0) + ms);
  const seen = new Set<string>(); let cur: number | undefined = id;
  while (cur !== undefined) { const l = label(byId.get(cur)!); if (!seen.has(l)) { seen.add(l); totalBy.set(l, (totalBy.get(l) ?? 0) + ms); } cur = parent.get(cur); }
}
const top = (m: Map<string, number>, n: number) => [...m].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${v.toFixed(0).padStart(7)} ms  ${k}`).join('\n');
const all = [...self.values()].reduce((a, b) => a + b, 0);
console.log(`sampled ${all.toFixed(0)} ms\n--- self ---\n${top(selfBy, 25)}\n--- total (inclusive) ---\n${top(totalBy, 40)}`);
