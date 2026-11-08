import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  CODE_LINES,
  EXPERIENCE_NODE_ARRIVALS,
  EXPERIENCE_POINTS,
  EXPERIENCE_TRAIL_SHARE,
  INITIAL_SCENE_VALUES,
  NEUTRAL_CHANNEL_VALUE,
  SCENE_KINDS,
  flatSceneValues,
  polylineLength,
  polylineStops,
  radarPoints,
  sceneValues,
  sceneVariableReference,
  type SceneChannel,
} from '../../lib/journeyScene'

/** Parts that do not exist at the final state (no neutral value at p = 1). */
const TRANSIENT_PARTS = new Set(['trail'])
const SAMPLES = 200

describe('batch G scenes', () => {
  it.each(SCENE_KINDS)('%s: at p = 1 each channel equals its neutral value (final state = static)', (kind) => {
    for (const [part, channels] of Object.entries(sceneValues(kind, 1))) {
      if (TRANSIENT_PARTS.has(part)) continue
      for (const [channel, value] of Object.entries(channels) as [SceneChannel, number][]) {
        expect(value, `${part}.${channel}`).toBeCloseTo(NEUTRAL_CHANNEL_VALUE[channel], 6)
      }
    }
  })

  it.each(SCENE_KINDS)('%s: reversible scrub (same p, same values) and clamps outside [0, 1]', (kind) => {
    expect(sceneValues(kind, 0.42)).toEqual(sceneValues(kind, 0.42))
    expect(sceneValues(kind, -1)).toEqual(sceneValues(kind, 0))
    expect(sceneValues(kind, 2)).toEqual(sceneValues(kind, 1))
  })

  it.each(SCENE_KINDS)('%s: finite values across the full range', (kind) => {
    for (let step = 0; step <= SAMPLES; step++) {
      expect(Object.values(flatSceneValues(kind, step / SAMPLES)).every(Number.isFinite)).toBe(true)
    }
  })

  it('Skills: radar with bounce (overshoot ≈ 10%) and staggered bars; flash only at the end', () => {
    const peak = Math.max(...Array.from({ length: SAMPLES + 1 }, (_, step) => sceneValues('skills', step / SAMPLES).radar!.scale!))
    expect(peak).toBeGreaterThan(1.05)
    expect(peak).toBeLessThan(1.15)
    const middle = sceneValues('skills', 0.4)
    expect(middle['bar-0']!.scaleY!).toBeGreaterThan(middle['bar-2']!.scaleY!)
    expect(middle['bar-5']!.scaleY).toBe(0)
    expect(sceneValues('skills', 0.84).flash!.opacity).toBe(0)
    expect(sceneValues('skills', 0.84)['accent-cap']!.opacity).toBe(0)
  })

  it('Experience: line draws in 0–0.80 and each node pops on arrival (up then back)', () => {
    expect(sceneValues('experience', 0).line!.offset).toBe(1)
    expect(sceneValues('experience', 0.8).line!.offset).toBe(0)
    expect(EXPERIENCE_NODE_ARRIVALS[0]).toBe(0)
    for (let index = 1; index < EXPERIENCE_NODE_ARRIVALS.length; index++) {
      expect(EXPERIENCE_NODE_ARRIVALS[index]!).toBeGreaterThan(EXPERIENCE_NODE_ARRIVALS[index - 1]!)
    }
    const arrival = EXPERIENCE_NODE_ARRIVALS[2]!
    expect(sceneValues('experience', arrival - 0.01)['node-2']!.opacity).toBe(0)
    expect(sceneValues('experience', arrival + 0.06)['node-2']!.y!).toBeCloseTo(-14, 0)
    expect(sceneValues('experience', arrival + 0.12)['node-2']!.y!).toBeCloseTo(0, 6)
  })

  it('Experience: 50-unit trail fades in 0.75–0.85; wave and amber milestone at the end', () => {
    expect(EXPERIENCE_TRAIL_SHARE).toBeCloseTo(50 / polylineLength(EXPERIENCE_POINTS), 3)
    expect(sceneValues('experience', 0).trail!.opacity).toBe(0)
    expect(sceneValues('experience', 0.5).trail!.opacity).toBe(1)
    expect(sceneValues('experience', 0.85).trail!.opacity).toBe(0)
    expect(sceneValues('experience', 0.79).milestone!.scale).toBe(0)
    expect(sceneValues('experience', 0.8)['outer-ring']!.scale!).toBeCloseTo(8 / 22, 6)
    expect(sceneValues('experience', 0.86)['inner-ring']!.opacity).toBe(0)
  })

  it('Education: steps rise staggered; cap drops, bounces once, and tassel returns to 0°', () => {
    const rising = sceneValues('education', 0.15)
    expect(rising['step-0']!.y!).toBeLessThan(rising['step-1']!.y!)
    expect(rising['step-3']!.opacity).toBe(0)
    expect(sceneValues('education', 0.5).cap!.y).toBe(-70)
    expect(sceneValues('education', 0.73).cap!.y!).toBeCloseTo(0, 6)
    expect(sceneValues('education', 0.79).cap!.y!).toBeCloseTo(-9, 0)
    expect(sceneValues('education', 0.8).tassel!.rotate).toBe(25)
  })

  it('Projects: 5 lines type in order with cursor at the head; blocks drop and check draws at the end', () => {
    const typing = sceneValues('projects', 0.3)
    expect(typing['code-0-0']!.offset).toBe(0)
    expect(typing['code-4-0']!.offset).toBe(1)
    expect(typing.cursor!.y!).toBeLessThan(0)
    expect(sceneValues('projects', 0.1).cursor!.opacity).toBe(0)
    expect(sceneValues('projects', 0.6).cursor).toEqual({ x: 0, y: 0, opacity: 1 })
    expect(sceneValues('projects', 0.6)['block-0']!.y).toBe(-40)
    expect(sceneValues('projects', 0.89).check!.offset).toBe(1)
    expect(Object.keys(flatSceneValues('projects', 0)).filter((name) => name.startsWith('code-')).length).toBe(
      CODE_LINES.flat().length,
    )
  })

  it.each(SCENE_KINDS)('%s: with no written variables, each channel starts at its p = 0 value (first paint without flicker)', (kind) => {
    for (const [part, channels] of Object.entries(sceneValues(kind, 0))) {
      for (const [channel, value] of Object.entries(channels) as [SceneChannel, number][]) {
        expect(sceneVariableReference(kind, part, channel)).toBe(
          `var(--fx-${part}-${channel}, ${Number(value.toFixed(3))})`,
        )
      }
    }
    expect(INITIAL_SCENE_VALUES[kind]).toEqual(flatSceneValues(kind, 0))
  })

  it.each(SCENE_KINDS)('%s: initial state is not final (otherwise there would be no animation)', (kind) => {
    const initial = INITIAL_SCENE_VALUES[kind]
    const final = flatSceneValues(kind, 1)
    expect(Object.keys(initial).some((name) => Math.abs(initial[name]! - final[name]!) > 0.01)).toBe(true)
  })

  it('a part with no value at p = 0 uses the channel neutral value', () => {
    expect(sceneVariableReference('skills', 'missing', 'opacity')).toBe('var(--fx-missing-opacity, 1)')
  })

  it('radar: hexagon with first vertex at top and clockwise (center 52,52; R 44)', () => {
    const hexagon = radarPoints([1, 1, 1, 1, 1, 1])
    expect(hexagon[0]).toEqual([52, 8])
    expect(hexagon[3]).toEqual([52, 96])
    expect(hexagon[1]![0]).toBeGreaterThan(52)
  })

  it('polylineStops: 0 to 1 by length', () => {
    expect(polylineStops(EXPERIENCE_POINTS)[0]).toBe(0)
    expect(polylineStops(EXPERIENCE_POINTS).at(-1)).toBeCloseTo(1)
  })
})

describe('scene rules (CSS)', () => {
  const css = readFileSync(new URL('../../app/components/JourneyScene.vue', import.meta.url), 'utf8')

  it('only animates transform, opacity, and stroke-dashoffset; no CSS animations or filters', () => {
    expect(css).not.toMatch(/@keyframes|animation:|transition:|filter:|mask:|box-shadow/)
  })

  it('each channel reads its variable with p = 0 fallback (sceneVariableReference), never a bare variable', () => {
    expect(css).toMatch(/sceneVariableReference\(props\.kind, part, channel\)/)
    expect(css).not.toMatch(/`var\(--fx-\$\{[^}]+\}\)`/)
  })

  it('initial state applies only with motion: all rules reading --scene-* live under data-motion="full"', () => {
    const style = css.slice(css.indexOf('<style>'))
    const rules = style.split('}').filter((rule) => /var\(--scene-/.test(rule))
    expect(rules.length).toBeGreaterThan(0)
    for (const rule of rules) expect(rule).toMatch(/:root\[data-motion='full'\]/)
  })

  it('is decorative: aria-hidden and not focusable', () => {
    expect(css).toMatch(/<figure[^>]*aria-hidden="true"/)
    expect(css).toMatch(/<svg[^>]*aria-hidden="true"[^>]*focusable="false"/)
  })
})
