export const BASE_MOVES = ['R', 'L', 'U', 'D', 'F', 'B'] as const
export type BaseMove = (typeof BASE_MOVES)[number]
export const MOVE_BASES = [...BASE_MOVES, 'Rw', 'Lw', 'Uw', 'Dw', 'Fw', 'Bw', 'M', 'E', 'S', 'x', 'y', 'z'] as const
export type MoveBase = (typeof MOVE_BASES)[number]
export type Move = `${MoveBase}` | `${MoveBase}'` | `${MoveBase}2`

export type MoveSpec = { axis: 'x' | 'y' | 'z'; layers: number[]; quarter: 1 | -1 }

export const MOVE_SPECS: Record<MoveBase, MoveSpec> = {
  R: { axis: 'x', layers: [1], quarter: -1 },
  L: { axis: 'x', layers: [-1], quarter: 1 },
  U: { axis: 'y', layers: [1], quarter: -1 },
  D: { axis: 'y', layers: [-1], quarter: 1 },
  F: { axis: 'z', layers: [1], quarter: -1 },
  B: { axis: 'z', layers: [-1], quarter: 1 },
  Rw: { axis: 'x', layers: [1, 0], quarter: -1 },
  Lw: { axis: 'x', layers: [-1, 0], quarter: 1 },
  Uw: { axis: 'y', layers: [1, 0], quarter: -1 },
  Dw: { axis: 'y', layers: [-1, 0], quarter: 1 },
  Fw: { axis: 'z', layers: [1, 0], quarter: -1 },
  Bw: { axis: 'z', layers: [-1, 0], quarter: 1 },
  M: { axis: 'x', layers: [0], quarter: 1 },
  E: { axis: 'y', layers: [0], quarter: 1 },
  S: { axis: 'z', layers: [0], quarter: -1 },
  x: { axis: 'x', layers: [-1, 0, 1], quarter: -1 },
  y: { axis: 'y', layers: [-1, 0, 1], quarter: -1 },
  z: { axis: 'z', layers: [-1, 0, 1], quarter: -1 },
}

const MOVE_PATTERN = /^(?:[RLUDFB]w?|[MESxyz])(?:2|')?$/

export function parseAlgorithm(input: string): Move[] {
  const normalized = input.trim().replace(/[’′]/g, "'")
  if (!normalized) return []

  const tokens = normalized.split(/\s+/)
  const invalid = tokens.find((token) => !MOVE_PATTERN.test(token))
  if (invalid) throw new Error(`“${invalid}” isn’t a supported move yet.`)
  return tokens as Move[]
}

export function inverseMove(move: Move): Move {
  if (move.endsWith('2')) return move
  return move.endsWith("'") ? (move.slice(0, -1) as Move) : (`${move}'` as Move)
}

export function invertAlgorithm(moves: Move[]): Move[] {
  return [...moves].reverse().map(inverseMove)
}

export function createScramble(length = 20): Move[] {
  const suffixes = ['', "'", '2'] as const
  const moves: Move[] = []

  while (moves.length < length) {
    const face = BASE_MOVES[Math.floor(Math.random() * BASE_MOVES.length)]
    if (moves.at(-1)?.[0] === face) continue
    moves.push(`${face}${suffixes[Math.floor(Math.random() * suffixes.length)]}` as Move)
  }
  return moves
}

export function describeMove(move: Move): string {
  const faceNames: Record<MoveBase, string> = {
    R: 'Right', L: 'Left', U: 'Upper', D: 'Down', F: 'Front', B: 'Back',
    Rw: 'Right two layers', Lw: 'Left two layers', Uw: 'Upper two layers', Dw: 'Down two layers', Fw: 'Front two layers', Bw: 'Back two layers',
    M: 'Middle slice', E: 'Equator slice', S: 'Standing slice', x: 'Whole cube on x', y: 'Whole cube on y', z: 'Whole cube on z',
  }
  const direction = move.endsWith('2')
    ? 'a half turn'
    : move.endsWith("'")
      ? 'counter-clockwise'
      : 'clockwise'
  const base = move.replace(/[2']/g, '') as MoveBase
  return `${faceNames[base]} · ${direction}`
}

export function explainMove(move: Move) {
  const base = move.replace(/[2']/g, '') as MoveBase
  const labels: Record<MoveBase, string> = {
    R: 'right face', L: 'left face', U: 'upper face', D: 'bottom face', F: 'front face', B: 'back face',
    Rw: 'right two layers', Lw: 'left two layers', Uw: 'upper two layers', Dw: 'bottom two layers', Fw: 'front two layers', Bw: 'back two layers',
    M: 'middle slice', E: 'equator slice', S: 'standing slice', x: 'whole cube on the right axis', y: 'whole cube on the upper axis', z: 'whole cube on the front axis',
  }
  const cues: Record<MoveBase, string> = {
    R: 'Keep the other two vertical layers still.', L: 'Keep the other two vertical layers still.', U: 'Move only the top layer.', D: 'Move only the bottom layer.', F: 'Turn the face pointing toward you.', B: 'Turn the face pointing away from you.',
    Rw: 'Move the right and middle layers together.', Lw: 'Move the left and middle layers together.', Uw: 'Move the top two layers together.', Dw: 'Move the bottom two layers together.', Fw: 'Move the front two layers together.', Bw: 'Move the back two layers together.',
    M: 'Turn the centre slice as the left face would turn.', E: 'Turn the horizontal centre slice as the bottom face would turn.', S: 'Turn the standing centre slice as the front face would turn.', x: 'Rotate the entire cube; this changes your viewpoint.', y: 'Rotate the entire cube; this changes your viewpoint.', z: 'Rotate the entire cube; this changes your viewpoint.',
  }
  const turn = move.endsWith('2') ? 'by 180°' : move.endsWith("'") ? 'counter-clockwise by 90°' : 'clockwise by 90°'
  return {
    title: `Turn the ${labels[base]} ${turn}.`,
    cue: cues[base],
    notation: move,
  }
}
