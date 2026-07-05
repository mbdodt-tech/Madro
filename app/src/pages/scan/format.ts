/** en:e330 → E330; andre tags → læsbar tekst. */
export function formatAdditive(tag: string): string {
  const m = tag.match(/^[a-z]{2}:e(\d+[a-z]*)$/i);
  if (m) return `E${m[1]!.toUpperCase()}`;
  return tag.replace(/^[a-z]{2}:/, "").replace(/-/g, " ");
}
