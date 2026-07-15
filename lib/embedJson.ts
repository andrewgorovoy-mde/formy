/** Serializes a value for safe inline embedding inside a <script> tag. */
export function embedJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
