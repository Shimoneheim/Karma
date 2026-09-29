import { assignSeats } from "./core";
import type { AssignmentResult, AssignSeatsOptions, Student } from "./types";

type WorkerResponse =
  | { ok: true; result: AssignmentResult }
  | { ok: false; error: string };

/**
 * Same as `assignSeats`, but runs in a Web Worker when available so large
 * student lists do not freeze the page. Falls back to the main thread if the
 * worker cannot be created or fails to load.
 */
export function assignSeatsAsync(
  students: Student[],
  options: AssignSeatsOptions = {},
): Promise<AssignmentResult> {
  // Plain copies: Vue reactive proxies cannot be posted to a worker.
  const payload = JSON.parse(JSON.stringify({ students, options }));

  if (typeof Worker === "undefined") {
    return Promise.resolve(assignSeats(payload.students, payload.options));
  }

  let worker: Worker;
  try {
    worker = new Worker(new URL("./seating.worker.ts", import.meta.url), {
      type: "module",
    });
  } catch {
    return Promise.resolve(assignSeats(payload.students, payload.options));
  }

  return new Promise((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      worker.terminate();
      if (event.data.ok) resolve(event.data.result);
      else reject(new Error(event.data.error));
    };
    worker.onerror = (event) => {
      // Worker script failed to load/run: compute on the main thread instead.
      event.preventDefault();
      worker.terminate();
      try {
        resolve(assignSeats(payload.students, payload.options));
      } catch (err) {
        reject(err);
      }
    };
    worker.postMessage(payload);
  });
}
