/** App-wide WebMCP tools, registered on every page: where am I, go somewhere, and the generic UI controls
 * (ui-tools.ts) that reach any button or field. The builder adds its own tools on top (BuilderPage). */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { registerTools, tool, TOOL_CALL_EVENT, type ToolCall } from './model-context.ts';
import { uiTools } from './ui-tools.ts';

const PAGES = {
  '/': 'Rack builder (the 3D editor; most tools act here)',
  '/gyms': 'Pre-built gym gallery',
  '/gyms/<slug>': 'One gallery gym',
  '/library': 'Parts library (every part with search and filters)',
  '/parts/<partId>': 'Part detail viewer for one part, with its parameters',
};

function argumentPreview(value: unknown): string {
  if (Array.isArray(value)) return `[${value.slice(0, 3).map(item => typeof item === 'object' ? '…' : argumentPreview(item)).join(', ')}${value.length > 3 ? ', …' : ''}]`;
  if (value && typeof value === 'object') return '{…}';
  if (typeof value === 'string' && value.length > 60) return '…';
  return JSON.stringify(value) ?? '…';
}

export function WebMcpRoot() {
  const navigate = useNavigate(), navigateRef = useRef(navigate);
  const [calls, setCalls] = useState<{ key: number; name: string; args: string }[]>([]);
  navigateRef.current = navigate;
  useEffect(() => {
    let sequence = 0;
    const timers = new Set<number>();
    const showCall = (event: Event) => {
      const { name, args } = (event as CustomEvent<ToolCall>).detail;
      const key = ++sequence;
      const entries = Object.entries(args ?? {});
      const preview = entries.slice(0, 3).map(([k, v]) => `${k}: ${argumentPreview(v)}`);
      if (entries.length > 3) preview.push('…');
      const call = { key, name, args: preview.length ? `{ ${preview.join(', ')} }` : '' };
      setCalls(previous => [...previous.slice(-2), call]);
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        setCalls(previous => previous.filter(item => item.key !== key));
      }, 2400);
      timers.add(timer);
    };
    window.addEventListener(TOOL_CALL_EVENT, showCall);
    return () => {
      window.removeEventListener(TOOL_CALL_EVENT, showCall);
      timers.forEach(timer => window.clearTimeout(timer));
    };
  }, []);
  useEffect(() => registerTools([
    tool({
      name: 'get_page_info',
      description: 'Which page of the BOS STRENGTH rack builder app is open, its title, and the pages that exist.',
      inputSchema: { type: 'object', properties: {} },
      annotations: { readOnlyHint: true },
      execute: () => ({ path: location.pathname + location.search, title: document.title, heading: document.querySelector('h1')?.textContent?.trim(), pages: PAGES }),
    }),
    tool<{ path: string }>({
      name: 'navigate_to_page',
      description: `Go to a page of the app without reloading: ${Object.entries(PAGES).map(([p, d]) => `${p} = ${d}`).join('; ')}. "/?gym=<slug>" opens a gallery gym in the builder.`,
      inputSchema: { type: 'object', properties: { path: { type: 'string', description: 'App path, e.g. "/", "/gyms", "/library", "/parts/upright", "/?gym=basement-barbell".' } }, required: ['path'] },
      async execute({ path }) {
        if (!path.startsWith('/') || path.startsWith('//')) throw Error('Pass an app path starting with "/".');
        const url = new URL(path, location.origin);
        await navigateRef.current({ href: url.pathname + url.search + url.hash });
        return { path: location.pathname + location.search };
      },
    }),
    ...uiTools(),
  ]), []);
  return <div className="webmcp-calls" role="log" aria-label="WebMCP calls" aria-live="polite">
    {calls.map(call => <div className="webmcp-call" key={call.key}>
      <span>WebMCP</span>
      <code><strong>{call.name}</strong>({call.args})</code>
    </div>)}
  </div>;
}
