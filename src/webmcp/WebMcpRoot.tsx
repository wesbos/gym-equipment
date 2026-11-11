/** App-wide WebMCP tools, registered on every page: where am I, go somewhere, and the generic UI controls
 * (ui-tools.ts) that reach any button or field. The builder adds its own tools on top (BuilderPage). */
import { useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { registerTools, tool } from './model-context.ts';
import { uiTools } from './ui-tools.ts';

const PAGES = {
  '/': 'Rack builder (the 3D editor; most tools act here)',
  '/gyms': 'Pre-built gym gallery',
  '/gyms/<slug>': 'One gallery gym',
  '/library': 'Parts library (every part with search and filters)',
  '/parts/<partId>': 'Part detail viewer for one part, with its parameters',
};

export function WebMcpRoot() {
  const navigate = useNavigate(), navigateRef = useRef(navigate);
  navigateRef.current = navigate;
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
  return null;
}
