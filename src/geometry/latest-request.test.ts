import { test } from "node:test";
import assert from "node:assert/strict";
import { LatestRequest } from "./latest-request.ts";
test("rapid edits send only in-flight and newest pending jobs", () => {
  const sent: number[] = [];
  const queue = new LatestRequest<number>((value) => sent.push(value));
  queue.submit(0);
  for (let n = 1; n <= 1000; n++) queue.submit(n);
  assert.deepEqual(sent, [0]);
  queue.complete();
  assert.deepEqual(sent, [0, 1000]);
  queue.complete();
  queue.submit(1001);
  assert.deepEqual(sent, [0, 1000, 1001]);
  queue.submit(1002);
  queue.clear();
  queue.complete();
  assert.deepEqual(sent, [0, 1000, 1001]);
});
