import { MOVE_SPECS, type Move } from './notation'

type Axis = 'x' | 'y' | 'z'
type Vector = { x: number; y: number; z: number }
type Face = 'U' | 'R' | 'F' | 'D' | 'L' | 'B'
type Sticker = { color: Face; normal: Vector }
type Piece = { id: string; position: Vector; stickers: Sticker[] }

const FACE_NORMALS: Record<Face, Vector> = {
  U: { x: 0, y: 1, z: 0 }, R: { x: 1, y: 0, z: 0 }, F: { x: 0, y: 0, z: 1 },
  D: { x: 0, y: -1, z: 0 }, L: { x: -1, y: 0, z: 0 }, B: { x: 0, y: 0, z: -1 },
}

function cloneVector(vector: Vector): Vector {
  return { ...vector }
}

function rotateVector(vector: Vector, axis: Axis, quarter: 1 | -1): Vector {
  const { x, y, z } = vector
  if (axis === 'x') return quarter === 1 ? { x, y: -z, z: y } : { x, y: z, z: -y }
  if (axis === 'y') return quarter === 1 ? { x: z, y, z: -x } : { x: -z, y, z: x }
  return quarter === 1 ? { x: -y, y: x, z } : { x: y, y: -x, z }
}

function normalKey(vector: Vector) {
  return `${vector.x},${vector.y},${vector.z}`
}

function createSolvedPieces(): Piece[] {
  const pieces: Piece[] = []
  for (let x = -1; x <= 1; x += 1) {
    for (let y = -1; y <= 1; y += 1) {
      for (let z = -1; z <= 1; z += 1) {
        if (x === 0 && y === 0 && z === 0) continue
        const stickers = (Object.entries(FACE_NORMALS) as [Face, Vector][])
          .filter(([, normal]) => (normal.x !== 0 && x === normal.x) || (normal.y !== 0 && y === normal.y) || (normal.z !== 0 && z === normal.z))
          .map(([color, normal]) => ({ color, normal: cloneVector(normal) }))
        pieces.push({ id: `${x}${y}${z}`, position: { x, y, z }, stickers })
      }
    }
  }
  return pieces
}

export class CubeState {
  private pieces: Piece[]

  constructor() {
    this.pieces = createSolvedPieces()
  }

  reset() {
    this.pieces = createSolvedPieces()
  }

  apply(move: Move) {
    const base = move.replace(/[2']/g, '') as keyof typeof MOVE_SPECS
    const spec = MOVE_SPECS[base]
    const turns = move.endsWith('2') ? 2 : 1
    const prime = move.endsWith("'") ? -1 : 1
    const quarter = (spec.quarter * prime) as 1 | -1

    for (let turn = 0; turn < turns; turn += 1) {
      this.pieces.forEach((piece) => {
        if (!spec.layers.includes(piece.position[spec.axis])) return
        piece.position = rotateVector(piece.position, spec.axis, quarter)
        piece.stickers.forEach((sticker) => { sticker.normal = rotateVector(sticker.normal, spec.axis, quarter) })
      })
    }
    return this
  }

  applyAll(moves: Move[]) {
    moves.forEach((move) => this.apply(move))
    return this
  }

  isSolved() {
    const colorsByNormal = new Map<string, Set<Face>>()
    this.pieces.forEach((piece) => piece.stickers.forEach((sticker) => {
      const key = normalKey(sticker.normal)
      const colors = colorsByNormal.get(key) ?? new Set<Face>()
      colors.add(sticker.color)
      colorsByNormal.set(key, colors)
    }))
    return colorsByNormal.size === 6 && [...colorsByNormal.values()].every((colors) => colors.size === 1)
  }

  fingerprint() {
    return this.pieces
      .flatMap((piece) => piece.stickers.map((sticker) => `${normalKey(piece.position)}:${normalKey(sticker.normal)}:${sticker.color}`))
      .sort()
      .join('|')
  }
}
