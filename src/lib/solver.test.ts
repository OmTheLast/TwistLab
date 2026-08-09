import { describe, expect, it } from 'vitest'
import { CubeState } from './cube-state'
import { parseAlgorithm } from './notation'
import { chunkSolution, solveFromMoves } from './solver'

describe('solver', () => {
  it('solves a tracked 3×3 state', async () => {
    const scramble = parseAlgorithm("R U2 F' L D")
    const solution = await solveFromMoves(scramble)
    expect(solution.length).toBeGreaterThan(0)
    expect(new CubeState().applyAll([...scramble, ...solution]).isSolved()).toBe(true)
  }, 30_000)

  it('normalizes a state changed by wide and slice moves', async () => {
    const scramble = parseAlgorithm("Rw R U F2 M' D L B")
    const solution = await solveFromMoves(scramble)
    expect(new CubeState().applyAll([...scramble, ...solution]).isSolved()).toBe(true)
  }, 30_000)

  it('chunks a solution into readable steps', () => {
    const moves = parseAlgorithm("R U R' U' F2 D L")
    expect(chunkSolution(moves, 3).map((chunk) => chunk.length)).toEqual([3, 3, 1])
  })
})
