import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { build } from 'esbuild-wasm';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { NumericControlProps } from './NumericControl.tsx';

test('mixed NumericControl with a matching shared standard keeps a blank Custom input and no checked preset', async () => {
  // Bundle only the component tree so node:test can exercise the real JSX without
  // loading browser CSS. React remains shared with the server renderer.
  const result = await build({ entryPoints: [new URL('./NumericControl.tsx', import.meta.url).pathname],
    bundle: true, write: false, platform: 'node', format: 'cjs',
    external: ['react', 'react-dom', 'react/*'], loader: { '.css': 'empty' } });
  const module = { exports: {} as { NumericControl: (props: NumericControlProps) => ReturnType<typeof createElement> } };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
  const props: NumericControlProps = { label: 'Grip diameter', value: 32, mixed: true,
    standardOptions: [{ value: 32, label: '32 mm' }, { value: 40, label: '40 mm' }], onValue() {} };
  const mixed = renderToStaticMarkup(createElement(module.exports.NumericControl, props));
  assert.equal((mixed.match(/role="radio"/g) ?? []).length, 2);
  assert.doesNotMatch(mixed, /aria-checked="true"/);
  assert.match(mixed, /aria-label="Custom grip diameter" aria-expanded="true"/);
  assert.match(mixed, /placeholder="Mixed"/);
  assert.match(mixed, /aria-invalid="false"/);
  assert.match(mixed, /value=""/);
  assert.doesNotMatch(mixed, /type="hidden"/);
  const uniform = renderToStaticMarkup(createElement(module.exports.NumericControl, { ...props, mixed: false }));
  assert.equal((uniform.match(/aria-checked="true"/g) ?? []).length, 1);
  assert.match(uniform, /aria-label="Custom grip diameter" aria-expanded="false"/);
  assert.doesNotMatch(uniform, /placeholder="Mixed"/);
});
