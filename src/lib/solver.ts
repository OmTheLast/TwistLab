import { parseAlgorithm, type Move } from './notation'

export async function solveFromMoves(moves: Move[]): Promise<Move[]> {
  if (moves.length === 0) return []

  const [{ cube3x3x3 }, { experimentalSolve3x3x3IgnoringCenters }] = await Promise.all([
    import('cubing/puzzles'),
    import('cubing/search'),
  ])
  const puzzle = await cube3x3x3.kpuzzle()
  const pattern = puzzle.algToTransformation(moves.join(' ')).toKPattern()
  const solution = await experimentalSolve3x3x3IgnoringCenters(pattern)
  return parseAlgorithm(solution.toString())
}

export function chunkSolution(moves: Move[], size = 5): Move[][] {
  const chunks: Move[][] = []
  for (let index = 0; index < moves.length; index += size) chunks.push(moves.slice(index, index + size))
  return chunks
}
