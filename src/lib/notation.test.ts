import { describe, expect, it } from 'vitest'
import { createScramble, explainMove, invertAlgorithm, inverseMove, parseAlgorithm } from './notation'

describe('notation', () => {
  it('parses standard face turns', () => {
    expect(parseAlgorithm("R U R' U'")).toEqual(['R', 'U', "R'", "U'"])
  })

  it('normalizes typographic apostrophes', () => {
    expect(parseAlgorithm('R U’')).toEqual(['R', "U'"])
  })

  it('parses wide, slice, and rotation notation', () => {
    expect(parseAlgorithm("Rw U2 M' x y2 z'")).toEqual(['Rw', 'U2', "M'", 'x', 'y2', "z'"])
  })

  it('rejects unsupported notation', () => {
    expect(() => parseAlgorithm('R X')).toThrow('isn’t a supported move')
  })

  it('produces useful inverses', () => {
    expect(inverseMove('F')).toBe("F'")
    expect(inverseMove("F'")).toBe('F')
    expect(inverseMove('F2')).toBe('F2')
    expect(invertAlgorithm(['R', 'U', "R'"])).toEqual(['R', "U'", "R'"])
  })

  it('does not repeat the same face in a scramble', () => {
    const scramble = createScramble(40)
    expect(scramble).toHaveLength(40)
    expect(scramble.every((move, index) => index === 0 || move[0] !== scramble[index - 1][0])).toBe(true)
  })

  it('explains face, wide, and rotation moves in plain language', () => {
    expect(explainMove("R'").title).toBe('Turn the right face counter-clockwise by 90°.')
    expect(explainMove('Fw2').title).toBe('Turn the front two layers by 180°.')
    expect(explainMove('x').cue).toContain('entire cube')
  })
})
