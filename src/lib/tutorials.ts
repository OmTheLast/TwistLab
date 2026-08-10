import type { Move } from './notation'
import { solveCFOPFromMoves, solveFromMoves } from './solver'

export type GuideTrack = 'beginner' | 'cfop' | 'fast'

export type TutorialPhase = {
  id: string
  title: string
  goal: string
  explanation: string
  moves: Move[]
}

export type TutorialPlan = {
  track: GuideTrack
  methodName: string
  experience: string
  note: string
  phases: TutorialPhase[]
}

export const GUIDE_TRACKS: Array<{ id: GuideTrack; label: string; level: string; description: string }> = [
  { id: 'beginner', label: 'Beginner assisted', level: 'First solves', description: 'Plain-language cross, pair, and last-layer guidance with fewer concepts at once.' },
  { id: 'cfop', label: 'CFOP', level: 'Intermediate', description: 'A genuine Cross → F2L → OLL → PLL solution partitioned for the current cube.' },
  { id: 'fast', label: 'Direct solution', level: 'Follow notation', description: 'A reliable reverse route built from every turn recorded in this session.' },
]

function nonEmpty(phases: TutorialPhase[]) {
  return phases.filter((phase) => phase.moves.length > 0)
}

export async function buildTutorialPlan(track: GuideTrack, scramble: Move[]): Promise<TutorialPlan> {
  if (track === 'fast') {
    const moves = await solveFromMoves(scramble)
    return {
      track,
      methodName: 'Recorded reverse path',
      experience: 'Notation follower',
      note: 'This route reverses the recorded turns exactly, making it reliable for face, wide, slice, and rotation moves.',
      phases: [{ id: 'fast', title: 'Direct route', goal: 'Return the cube to solved.', explanation: 'Follow the moves in order to retrace this session from the current state back to the solved cube.', moves }],
    }
  }

  const cfop = await solveCFOPFromMoves(scramble)
  const cross = cfop.cross.flat()

  if (track === 'beginner') {
    return {
      track,
      methodName: 'Beginner-assisted CFOP',
      experience: 'First solves',
      note: 'This track begins with the white cross, then uses four guided corner-edge pairs so the cube stays easy to follow.',
      phases: nonEmpty([
        { id: 'white-cross', title: 'The white cross', goal: 'Build a white cross and match every edge with its side centre.', explanation: 'Keep the white centre on top. We will place the four white edges one at a time; an edge is correct only when its side colour also matches the neighbouring centre.', moves: cross },
        ...cfop.f2l.map((moves, index) => ({ id: `pair-${index + 1}`, title: `First two layers · pair ${index + 1}`, goal: 'Pair one white corner with its matching middle-layer edge.', explanation: 'Find the corner and edge with the same two side colours. The guided moves pair them above their destination and insert them without disturbing completed pieces.', moves })),
        { id: 'yellow-face', title: 'Make the yellow face', goal: 'Turn every top-layer sticker yellow.', explanation: 'This is last-layer orientation. The algorithm changes which way the top pieces face while preserving the first two layers.', moves: cfop.oll },
        { id: 'last-layer', title: 'Finish the last layer', goal: 'Move every yellow-layer piece into its final position.', explanation: 'The yellow face is oriented; now we cycle its pieces until every side colour lines up and the cube is solved.', moves: cfop.pll },
      ]),
    }
  }

  return {
    track,
    methodName: 'CFOP',
    experience: 'Intermediate',
    note: 'This is a state-specific Cross, F2L, OLL, and PLL solution.',
    phases: nonEmpty([
      { id: 'cross', title: 'Cross', goal: 'Solve the four white cross edges.', explanation: 'Plan and place each cross edge while matching its side colour to the adjacent centre.', moves: cross },
      ...cfop.f2l.map((moves, index) => ({ id: `f2l-${index + 1}`, title: `F2L pair ${index + 1}`, goal: 'Pair and insert one corner-edge pair.', explanation: 'Build the pair in the upper layer, then insert it into its slot while preserving completed pairs.', moves })),
      { id: 'oll', title: 'OLL', goal: 'Orient every last-layer piece.', explanation: 'Execute the recognized orientation algorithm to make the entire upper face yellow.', moves: cfop.oll },
      { id: 'pll', title: 'PLL', goal: 'Permute the last layer and solve the cube.', explanation: 'Cycle the oriented last-layer pieces into their correct final positions.', moves: cfop.pll },
    ]),
  }
}
