export function parsePositiveFiniteInteger(value: string | number | undefined, name: string, fallback?: number): number {
  const candidate = value === undefined ? fallback : value;
  if (candidate === undefined) throw new Error(`${name} is required`);
  if (typeof candidate === 'string' && !/^\d+$/.test(candidate.trim())) {
    throw new Error(`${name} must be a positive integer`);
  }
  const parsed = typeof candidate === 'number' ? candidate : Number(candidate);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}
