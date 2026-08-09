import { parseAlgorithm, type Move } from './notation'

const CUBE_ORIENTATIONS = [
  '', 'x', 'x2', "x'", 'y', 'y2', "y'", 'z', 'z2', "z'",
  'x y', 'x y2', "x y'", "x' y", "x' y2", "x' y'", 'x2 y', 'x2 y2', "x2 y'",
  'z y', 'z y2', "z y'", "z' y", "z' y2", "z' y'",
]

export async function solveFromMoves(moves: Move[]): Promise<Move[]> {
  if (moves.length === 0) return []

  const [{ cube3x3x3 }, { experimentalSolve3x3x3IgnoringCenters }] = await Promise.all([
    import('cubing/puzzles'),
    import('cubing/search'),
  ])
  const puzzle = await cube3x3x3.kpuzzle()
  const pattern = puzzle.algToTransformation(moves.join(' ')).toKPattern()

  for (const orientation of CUBE_ORIENTATIONS) {
    try {
      const orientedPattern = orientation ? pattern.applyAlg(orientation) : pattern
      const solution = await experimentalSolve3x3x3IgnoringCenters(orientedPattern)
      return [...parseAlgorithm(orientation), ...parseAlgorithm(solution.toString())]
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('non-oriented')) throw error
    }
  }
  throw new Error('The cube orientation could not be normalized.')
}

export function chunkSolution(moves: Move[], size = 5): Move[][] {
  const chunks: Move[][] = []
  for (let index = 0; index < moves.length; index += size) chunks.push(moves.slice(index, index + size))
  return chunks
}
