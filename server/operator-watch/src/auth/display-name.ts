/** "anong.srisuk@seatos.com" → "Anong Srisuk". */
export function displayNameOf(email: string): string {
  return email
    .split('@')[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(' ');
}
