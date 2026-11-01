/** Built-in tags (docs/PRODUCT.md Library). The engine uses banger (+1 energy) and overplayed (−5). */
export const BUILTIN_TAGS: { id: string; emoji: string; label: string }[] = [
  { id: 'banger', emoji: '🔥', label: 'banger' },
  { id: 'secret-weapon', emoji: '🗡️', label: 'secret weapon' },
  { id: 'overplayed', emoji: '😴', label: 'overplayed' },
  { id: 'vocal', emoji: '🎤', label: 'vocal' },
  { id: 'instrumental', emoji: '🎹', label: 'instrumental' },
  { id: 'opener', emoji: '🌅', label: 'opener' },
  { id: 'closer', emoji: '🌙', label: 'closer' },
]

export function tagLabel(id: string): string {
  const b = BUILTIN_TAGS.find((t) => t.id === id)
  return b ? `${b.emoji} ${b.label}` : `#${id}`
}
