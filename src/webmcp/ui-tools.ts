/** Generic WebMCP tools over the page's own controls: list every visible button, link, field and menu item, then
 * click it or set its value. Whatever a person can do with a click or a keystroke, an agent can do through these,
 * including controls that have no dedicated tool. Registered on every page. */
import { tool, type WebMcpTool } from './model-context.ts';

const INTERACTIVE = [
  'button', 'a[href]', 'input', 'select', 'textarea', 'summary',
  '[role="button"]', '[role="switch"]', '[role="checkbox"]', '[role="radio"]', '[role="tab"]', '[role="option"]',
  '[role="menuitem"]', '[role="menuitemradio"]', '[role="menuitemcheckbox"]', '[role="treeitem"]', '[role="slider"]',
].join(',');
const refs = new WeakMap<Element, string>();
let nextRef = 1;
const refOf = (element: Element) => {
  let ref = refs.get(element);
  if (!ref) { ref = `c${nextRef++}`; refs.set(element, ref); element.setAttribute('data-webmcp-ref', ref); }
  return ref;
};
const clean = (value: string | null | undefined, max = 90) => (value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

function visible(element: Element) {
  if (element.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
  if (element instanceof HTMLInputElement && element.type === 'hidden') return false;
  // Hidden file inputs still count: they are how a person loads a design or uploads a logo.
  if (element instanceof HTMLInputElement && element.type === 'file') return true;
  const box = element.getBoundingClientRect();
  if (!box.width && !box.height) return false;
  const style = getComputedStyle(element);
  return style.visibility !== 'hidden' && style.display !== 'none';
}

function labelOf(element: Element): string {
  const aria = element.getAttribute('aria-label');
  if (aria) return clean(aria);
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const text = labelledBy.split(/\s+/).map(id => document.getElementById(id)?.textContent ?? '').join(' ');
    if (clean(text)) return clean(text);
  }
  if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) {
    const label = element.labels?.[0];
    if (label) {
      // A wrapping label also contains the control's own text (a select's options): read only the label's own words.
      const copy = label.cloneNode(true) as HTMLElement;
      copy.querySelectorAll('select, input, textarea, button, small, output').forEach(child => child.remove());
      if (clean(copy.textContent)) return clean(copy.textContent);
    }
    if (!(element instanceof HTMLSelectElement) && element.placeholder) return clean(element.placeholder);
    if (element.name) return element.name;
  }
  const own = clean((element as HTMLElement).innerText ?? element.textContent);
  return own || clean(element.getAttribute('title')) || element.id || element.tagName.toLowerCase();
}

/** The panel a control sits in, so the same label in two panels ("Reset") can be told apart. */
function regionOf(element: Element): string {
  const region = element.closest('[role="dialog"], [role="menu"], .inspector-panel, .catalog-panel, .toolbar, .stage-actions, .view-menu, .placement-hint, .selection-bar, .timeline-region, .outliner, .export-menu, .overflow-menu, .part-gallery, details, section[aria-label], aside, header, main, nav, footer');
  if (!region) return 'page';
  const named = region.getAttribute('aria-label') ?? (region instanceof HTMLDetailsElement ? clean(region.querySelector('summary')?.textContent, 40) : '');
  const kind = region.getAttribute('role') ?? (region.classList[0] || region.tagName.toLowerCase());
  return named ? `${kind}: ${named}` : kind;
}

function describe(element: Element) {
  const html = element as HTMLElement;
  const entry: Record<string, unknown> = {
    ref: refOf(element),
    role: element.getAttribute('role') ?? (element instanceof HTMLInputElement ? `input:${element.type}` : element.tagName.toLowerCase()),
    label: labelOf(element),
    region: regionOf(element),
  };
  // Radio buttons, tabs and options read as "1075 mm"; their group says what they set ("Clear rack width").
  const group = element.parentElement?.closest('[role="radiogroup"], [role="group"], [role="listbox"], [role="tablist"], [role="menu"], fieldset');
  const groupLabel = group && (group.getAttribute('aria-label') ?? clean(group.querySelector(':scope > legend')?.textContent, 60));
  if (groupLabel) entry.group = groupLabel;
  if (element.id) entry.id = element.id;
  if ((html as HTMLButtonElement).disabled || element.getAttribute('aria-disabled') === 'true') entry.disabled = true;
  for (const attribute of ['aria-pressed', 'aria-checked', 'aria-expanded', 'aria-selected', 'aria-current'] as const) {
    const value = element.getAttribute(attribute);
    if (value !== null) entry[attribute.slice(5)] = value;
  }
  if (element instanceof HTMLInputElement) {
    if (element.type === 'checkbox' || element.type === 'radio') entry.checked = element.checked;
    else if (element.type !== 'file') entry.value = element.value;
    if (element.type === 'number' || element.type === 'range') Object.assign(entry, { min: element.min || undefined, max: element.max || undefined, step: element.step || undefined });
    if (element.type === 'file') entry.accept = element.accept;
  } else if (element instanceof HTMLTextAreaElement) entry.value = clean(element.value, 200);
  else if (element instanceof HTMLSelectElement) {
    entry.value = element.value;
    entry.options = [...element.options].slice(0, 60).map(o => o.value === o.text ? o.value : `${o.value} = ${clean(o.text, 50)}`);
    if (element.options.length > 60) entry.moreOptions = element.options.length - 60;
  } else if (element instanceof HTMLAnchorElement) entry.href = element.getAttribute('href');
  const title = element.getAttribute('title');
  if (title && clean(title) !== entry.label) entry.title = clean(title);
  return entry;
}

function find(ref: string) {
  const element = document.querySelector(`[data-webmcp-ref="${CSS.escape(ref)}"]`);
  if (!element || !element.isConnected) throw Error(`No control ${ref} on the page any more. Call list_ui_controls again.`);
  return element as HTMLElement;
}

/** React tracks input values itself: set through the native setter so its onChange sees the change. */
function setNativeValue(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
  const prototype = element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(element, value);
}

const settle = () => new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 30)));

export function uiTools(): WebMcpTool[] {
  return [
    tool<{ query?: string; region?: string; limit?: number }>({
      name: 'list_ui_controls',
      description: 'List the visible interactive controls on the page (buttons, links, inputs, selects, menu items, switches) with a ref, label, region and current value/state. Use it for anything without a dedicated tool, then act on a control with operate_ui_control. Refs stay stable while the control stays on the page.',
      inputSchema: { type: 'object', properties: {
        query: { type: 'string', description: 'Only controls whose label, id, title or value contains this text (case-insensitive).' },
        region: { type: 'string', description: 'Only controls whose region contains this text, e.g. "inspector", "toolbar", "dialog", "catalog".' },
        limit: { type: 'number', description: 'Maximum controls to return (default 150).' },
      } },
      annotations: { readOnlyHint: true },
      execute({ query, region, limit = 150 }) {
        const q = query?.toLowerCase(), r = region?.toLowerCase();
        const all = [...document.querySelectorAll(INTERACTIVE)].filter(visible).map(describe)
          .filter(c => !q || [c.label, c.group, c.id, c.title, c.value].some(v => typeof v === 'string' && v.toLowerCase().includes(q)))
          .filter(c => !r || String(c.region).toLowerCase().includes(r));
        return { url: location.pathname + location.search, total: all.length, controls: all.slice(0, limit) };
      },
    }),
    tool<{ ref: string; action: 'click' | 'set_value' | 'check' | 'uncheck' | 'focus' | 'press_key' | 'set_file'; value?: string | number | boolean; key?: string; file_name?: string; file_text?: string }>({
      name: 'operate_ui_control',
      description: 'Act on a control from list_ui_controls exactly as a person would: click it, set an input/select/textarea value (fires input+change, then blur so numeric fields commit), check/uncheck a checkbox, press a key on it (Enter, Escape, ArrowUp…) or give a file input a text file (JSON designs, SVG logos).',
      inputSchema: { type: 'object', properties: {
        ref: { type: 'string', description: 'The control ref from list_ui_controls, e.g. "c12".' },
        action: { type: 'string', enum: ['click', 'set_value', 'check', 'uncheck', 'focus', 'press_key', 'set_file'] },
        value: { type: ['string', 'number', 'boolean'], description: 'For set_value: the new value (a select takes an option value).' },
        key: { type: 'string', description: 'For press_key: a KeyboardEvent key such as "Enter" or "Escape".' },
        file_name: { type: 'string', description: 'For set_file: the file name, e.g. "design.json" or "logo.svg".' },
        file_text: { type: 'string', description: 'For set_file: the file contents as text.' },
      }, required: ['ref', 'action'] },
      async execute({ ref, action, value, key, file_name, file_text }) {
        const element = find(ref);
        if ((element as HTMLButtonElement).disabled) throw Error(`${labelOf(element)} is disabled.`);
        switch (action) {
          case 'click': element.scrollIntoView({ block: 'nearest' }); element.click(); break;
          case 'focus': element.focus(); break;
          case 'check': case 'uncheck': {
            if (!(element instanceof HTMLInputElement)) { if ((element.getAttribute('aria-checked') === 'true') !== (action === 'check')) element.click(); break; }
            if (element.checked !== (action === 'check')) element.click();
            break;
          }
          case 'set_value': {
            if (!(element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement)) throw Error('Only inputs, selects and text areas take a value.');
            if (element instanceof HTMLSelectElement && ![...element.options].some(o => o.value === String(value))) {
              const byText = [...element.options].find(o => clean(o.text).toLowerCase() === String(value).toLowerCase());
              if (!byText) throw Error(`No option "${value}". Options: ${[...element.options].map(o => o.value).join(', ')}`);
              value = byText.value;
            }
            element.focus();
            setNativeValue(element, String(value ?? ''));
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            element.blur();
            break;
          }
          case 'press_key': {
            if (!key) throw Error('press_key needs a key.');
            element.focus();
            for (const type of ['keydown', 'keyup'] as const) element.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true, cancelable: true }));
            if (key === 'Enter' && (element instanceof HTMLInputElement) && element.form) element.form.requestSubmit();
            break;
          }
          case 'set_file': {
            if (!(element instanceof HTMLInputElement) || element.type !== 'file') throw Error('set_file needs a file input.');
            if (file_text === undefined) throw Error('set_file needs file_text.');
            const name = file_name ?? 'upload.txt';
            const type = name.endsWith('.json') ? 'application/json' : name.endsWith('.svg') ? 'image/svg+xml' : 'text/plain';
            const transfer = new DataTransfer();
            transfer.items.add(new File([file_text], name, { type }));
            element.files = transfer.files;
            element.dispatchEvent(new Event('change', { bubbles: true }));
            break;
          }
          default: throw Error(`Unknown action ${action as string}.`);
        }
        await settle();
        const after = element.isConnected ? describe(element) : { ref, removed: true };
        const status = document.getElementById('status')?.textContent;
        return { done: `${action} ${labelOf(element)}`, control: after, ...(status ? { status: clean(status, 200) } : {}) };
      },
    }),
  ];
}
