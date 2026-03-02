/**
 * Utilities for reading hook stdin and writing hook stdout.
 * Claude Code sends JSON via stdin and reads JSON from stdout.
 */

/**
 * Read JSON input from stdin (non-blocking).
 * Claude Code sends hook event data as JSON on stdin.
 */
export async function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
    // If no data arrives within 2s, resolve with empty
    setTimeout(() => {
      if (!data) resolve({});
    }, 2000);
  });
}

/**
 * Write JSON response to stdout for Claude Code to process.
 */
export function writeResponse(response) {
  process.stdout.write(JSON.stringify(response));
}

/**
 * Write plain text to stdout (for SessionStart context injection).
 */
export function writeText(text) {
  process.stdout.write(text);
}

/**
 * Exit with code 0 (success, action proceeds).
 */
export function exitSuccess() {
  process.exit(0);
}

/**
 * Exit with code 2 (block action, stderr becomes feedback to Claude).
 */
export function exitBlock(reason) {
  process.stderr.write(reason);
  process.exit(2);
}
