/** WebMCP (https://github.com/webmachinelearning/webmcp): the page exposes its actions as tools an agent in the
 * browser can call. This adapter speaks the current draft (`document.modelContext.registerTool(tool, { signal })`)
 * and the earlier one (`navigator.modelContext.registerTool(tool)` returning `{ unregister }`), so polyfills such as
 * MCP-B keep working. Without either, registration is a no-op. */

export type JsonSchema = Record<string, unknown>;
export type ToolContent = { type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string };
export interface ToolResult { content: ToolContent[]; isError?: boolean }
export interface WebMcpTool<Args = Record<string, unknown>> {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean; idempotentHint?: boolean };
  execute(args: Args, options?: { signal?: AbortSignal }): Promise<ToolResult> | ToolResult;
}
type Registration = { unregister?: () => void } | void | undefined;
interface ModelContextLike {
  registerTool(tool: WebMcpTool, options?: { signal?: AbortSignal }): Promise<Registration> | Registration;
  unregisterTool?(name: string): void;
}

export function modelContext(): ModelContextLike | null {
  if (typeof document === 'undefined') return null;
  const fromDocument = (document as unknown as { modelContext?: ModelContextLike }).modelContext;
  const fromNavigator = (navigator as unknown as { modelContext?: ModelContextLike }).modelContext;
  const context = fromDocument ?? fromNavigator;
  return context && typeof context.registerTool === 'function' ? context : null;
}

const text = (value: unknown): ToolResult => ({ content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value) }] });
export const ok = text;
export const fail = (message: string): ToolResult => ({ content: [{ type: 'text', text: `Error: ${message}` }], isError: true });

/** Plain return values become a JSON text result; thrown errors become `isError` results with the message. */
export function tool<Args>(definition: Omit<WebMcpTool<Args>, 'execute'> & { execute(args: Args, options?: { signal?: AbortSignal }): unknown }): WebMcpTool {
  return {
    ...definition,
    async execute(args, options) {
      try {
        const result = await definition.execute((args ?? {}) as Args, options);
        if (result && typeof result === 'object' && 'content' in result && Array.isArray((result as ToolResult).content)) return result as ToolResult;
        return text(result ?? 'Done.');
      } catch (error) {
        return fail(error instanceof Error ? error.message : String(error));
      }
    },
  } as WebMcpTool;
}

/** Register `tools`; the returned function unregisters every one of them (for effect cleanups). */
export function registerTools(tools: readonly WebMcpTool[]): () => void {
  const context = modelContext();
  if (!context) return () => {};
  const controller = new AbortController();
  const handles: Registration[] = [];
  for (const t of tools) {
    try {
      const result = context.registerTool(t, { signal: controller.signal });
      if (result && typeof (result as Promise<Registration>).then === 'function') {
        (result as Promise<Registration>).then(handle => { if (controller.signal.aborted) handle?.unregister?.(); else handles.push(handle); },
          error => console.warn(`WebMCP: could not register ${t.name}`, error));
      } else handles.push(result as Registration);
    } catch (error) {
      console.warn(`WebMCP: could not register ${t.name}`, error);
    }
  }
  return () => {
    controller.abort();
    for (const handle of handles) { try { handle?.unregister?.(); } catch { /* Already gone. */ } }
    // Older drafts had neither a signal nor a handle: unregister by name.
    if (context.unregisterTool) for (const t of tools) { try { context.unregisterTool(t.name); } catch { /* Already gone. */ } }
  };
}
