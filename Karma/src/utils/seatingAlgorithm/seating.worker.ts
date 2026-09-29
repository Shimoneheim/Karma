import { assignSeats } from "./core";
import type { AssignSeatsOptions, Student } from "./types";

// Runs the (CPU-heavy) seat assignment off the main thread so the UI stays responsive.
self.onmessage = (event: MessageEvent<{ students: Student[]; options: AssignSeatsOptions }>) => {
  try {
    const { students, options } = event.data;
    self.postMessage({ ok: true, result: assignSeats(students, options) });
  } catch (err) {
    self.postMessage({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
