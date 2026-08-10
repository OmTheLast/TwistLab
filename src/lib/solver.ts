import { invertAlgorithm, parseAlgorithm, type Move } from './notation'

export type CFOPPartitions = {
  cross: Move[][]
  f2l: Move[][]
  oll: Move[]
  pll: Move[]
}

export async function solveFromMoves(moves: Move[]): Promise<Move[]> {
  return invertAlgorithm(moves)
}

function toLegacyMove(move: Move) {
  const base = move.replace(/[2']/g, '')
  if (['x', 'y', 'z'].includes(base)) throw new Error('CFOP guidance requires a fixed cube orientation.')
  const suffix = move.endsWith('2') ? '2' : move.endsWith("'") ? 'prime' : ''
  const legacyBase = base.endsWith('w') ? base[0].toLowerCase() : base
  return `${legacyBase}${suffix}`
}

function fromLegacyAlgorithm(algorithm: string): Move[] {
  if (!algorithm.trim()) return []
  const normalized = algorithm.split(/\s+/).map((token) => {
    const prime = token.includes('prime') || token.endsWith("'")
    const half = token.includes('2')
    const rawBase = token.replace(/prime|2|'/g, '')
    const base = /^[frudlb]$/.test(rawBase) ? `${rawBase.toUpperCase()}w` : rawBase.toUpperCase()
    return `${base}${half ? '2' : prime ? "'" : ''}`
  }).join(' ')
  return parseAlgorithm(normalized)
}

export async function solveCFOPFromMoves(moves: Move[]): Promise<CFOPPartitions> {
  const imported = await import('rubiks-cube-solver')
  const candidate = imported.default as unknown as typeof imported.default | { default: typeof imported.default }
  const solve = typeof candidate === 'function' ? candidate : candidate.default
  const result = solve(moves.map(toLegacyMove).join(' '), { partitioned: true })
  return {
    cross: result.cross.map(fromLegacyAlgorithm),
    f2l: result.f2l.map(fromLegacyAlgorithm),
    oll: fromLegacyAlgorithm(result.oll),
    pll: fromLegacyAlgorithm(result.pll),
  }
}

export function chunkSolution(moves: Move[], size = 5): Move[][] {
  const chunks: Move[][] = []
  for (let index = 0; index < moves.length; index += size) chunks.push(moves.slice(index, index + size))
  return chunks
}
