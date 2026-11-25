/** Chart series for the three skill areas. Light and dark resolve through the theme tokens. */
const SKILL_AREA_COLOR: Record<string, string> = {
  frontend: 'var(--chart-1)',
  backend: 'var(--chart-2)',
  devops: 'var(--chart-3)',
}

export function skillAreaColor(areaId: string): string {
  return SKILL_AREA_COLOR[areaId] ?? 'var(--chart-1)'
}
