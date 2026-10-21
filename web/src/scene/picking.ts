export interface PointerStart { x: number; y: number; id: string }

export function tappedOrgan(start: PointerStart | null, x: number, y: number, hitId: unknown): string | null {
  if (!start || start.id !== hitId || Math.hypot(x - start.x, y - start.y) >= 5) return null
  return start.id
}
