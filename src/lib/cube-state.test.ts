import { describe, expect, it } from 'vitest'
import { CubeState } from './cube-state'
import { BASE_MOVES, invertAlgorithm, parseAlgorithm } from './notation'

describe('CubeState', () => {
  it.each(BASE_MOVES)('%s followed by its inverse restores the cube', (move) => {
    const cube = new CubeState()
    const start = cube.fingerprint()
    cube.apply(move).apply(`${move}'`)
    expect(cube.fingerprint()).toBe(start)
    expect(cube.isSolved()).toBe(true)
  })

  it.each(BASE_MOVES)('four %s turns restore the cube', (move) => {
    const cube = new CubeState()
    const start = cube.fingerprint()
    cube.applyAll([move, move, move, move])
    expect(cube.fingerprint()).toBe(start)
  })

  it('tracks a scramble and its inverse deterministically', () => {
    const cube = new CubeState()
    const moves = parseAlgorithm("R U2 F' L D B2 Rw M x")
    cube.applyAll(moves)
    expect(cube.isSolved()).toBe(false)
    cube.applyAll(invertAlgorithm(moves))
    expect(cube.isSolved()).toBe(true)
  })

  it('treats whole-cube rotations as solved orientations', () => {
    expect(new CubeState().applyAll(parseAlgorithm("x y z' x2")).isSolved()).toBe(true)
  })

  it('returns to solved after six sexy moves', () => {
    const cube = new CubeState()
    const trigger = parseAlgorithm("R U R' U'")
    for (let repetition = 0; repetition < 6; repetition += 1) cube.applyAll(trigger)
    expect(cube.isSolved()).toBe(true)
  })
})
