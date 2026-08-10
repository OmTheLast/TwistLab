export type GuidePhase = {
  title: string
  goal: string
  detail: string
  algorithms?: { label: string; moves: string }[]
}

export type SolveMethod = {
  id: string
  name: string
  shortName: string
  level: string
  signature: string
  description: string
  phases: GuidePhase[]
}

export const SOLVE_METHODS: SolveMethod[] = [
  {
    id: 'beginner',
    name: 'Layer by Layer',
    shortName: 'Beginner',
    level: 'First solve',
    signature: '7 stages · low algorithm count',
    description: 'Build the cube in visible layers. It is slower than speed methods, but every stage has a concrete goal and a small set of repeatable triggers.',
    phases: [
      { title: 'Make the white cross', goal: 'Match four white edge pieces with their side centres.', detail: 'Start with a daisy around the yellow centre if direct cross planning feels difficult. Match each edge’s side colour, then turn it down to white.' },
      { title: 'Complete white corners', goal: 'Finish the first layer.', detail: 'Place a white corner above its destination. Repeat the right or left trigger until the corner drops in correctly.', algorithms: [{ label: 'Right trigger', moves: "R U R' U'" }, { label: 'Left trigger', moves: "L' U' L U" }] },
      { title: 'Solve middle edges', goal: 'Insert the four edges without yellow.', detail: 'Align the front sticker with its centre, then determine whether the edge belongs on the right or left.', algorithms: [{ label: 'Insert right', moves: "U R U' R' U' F' U F" }, { label: 'Insert left', moves: "U' L' U L U F U' F'" }] },
      { title: 'Form the yellow cross', goal: 'Orient the four yellow edges.', detail: 'Hold the line horizontally, or the L shape at the upper-left, and repeat until a cross appears.', algorithms: [{ label: 'Edge orientation', moves: "F R U R' U' F'" }] },
      { title: 'Make the yellow face', goal: 'Orient all four last-layer corners.', detail: 'Keep an unsolved yellow corner at front-right and repeat Sune, adjusting U between attempts.', algorithms: [{ label: 'Sune', moves: "R U R' U R U2 R'" }] },
      { title: 'Position yellow corners', goal: 'Put every corner in its correct location.', detail: 'If one corner is correct, keep it at front-right. Repeat until all corner colour sets match their centres.', algorithms: [{ label: 'Corner cycle', moves: "U R U' L' U R' U' L" }] },
      { title: 'Position yellow edges', goal: 'Cycle the final edges and solve the cube.', detail: 'Keep a solved edge at the back when possible. Repeat the edge cycle, then align the top layer.', algorithms: [{ label: 'Edge cycle', moves: "F2 U L R' F2 L' R U F2" }] },
    ],
  },
  {
    id: 'cfop',
    name: 'CFOP',
    shortName: 'CFOP',
    level: 'Speed method',
    signature: 'Cross · F2L · OLL · PLL',
    description: 'The most widely used speedsolving framework. Plan a cross, pair corners with edges, orient the last layer, then permute it.',
    phases: [
      { title: 'Cross', goal: 'Solve four bottom edges efficiently.', detail: 'Plan the cross during inspection and solve it on the bottom. Aim to understand piece paths before chasing a move-count target.' },
      { title: 'First Two Layers', goal: 'Pair and insert four corner-edge pairs.', detail: 'Find a corner and its matching edge, pair them in the top layer, then insert without breaking solved slots.', algorithms: [{ label: 'Core trigger', moves: "R U R'" }, { label: 'Sledgehammer', moves: "R' F R F'" }] },
      { title: 'Orient Last Layer', goal: 'Turn every top sticker yellow.', detail: 'Begin with two-look OLL: orient edges, then corners. Full OLL later reduces this to one algorithm.', algorithms: [{ label: 'Yellow cross', moves: "F R U R' U' F'" }, { label: 'Sune', moves: "R U R' U R U2 R'" }, { label: 'Anti-Sune', moves: "R U2 R' U' R U' R'" }] },
      { title: 'Permute Last Layer', goal: 'Move last-layer pieces to their final positions.', detail: 'Two-look PLL first positions corners and then edges. Full PLL eventually recognizes 21 one-step cases.', algorithms: [{ label: 'T-perm', moves: "R U R' U' R' F R2 U' R' U' R U R' F'" }, { label: 'Ua-perm', moves: "R U' R U R U R U' R' U' R2" }] },
    ],
  },
  {
    id: 'roux',
    name: 'Roux',
    shortName: 'Roux',
    level: 'Blockbuilding',
    signature: 'Blocks · CMLL · LSE',
    description: 'Build two 1×2×3 blocks, solve the last-layer corners, then finish the remaining six edges mostly with M and U turns.',
    phases: [
      { title: 'First block', goal: 'Build a 1×2×3 block on the left.', detail: 'Solve pieces as connected units rather than a cross and slots. Preserve freedom by using the wide-open right side.' },
      { title: 'Second block', goal: 'Build the matching block on the right.', detail: 'Work around the first block to complete the opposite 1×2×3. All corners except the upper layer are now solved.' },
      { title: 'CMLL', goal: 'Solve the four last-layer corners.', detail: 'Orient and permute the corners in one step while ignoring the M-slice edges. Start with two-look recognition before learning all cases.', algorithms: [{ label: 'Sune CMLL shape', moves: "R U R' U R U2 R'" }] },
      { title: 'Last Six Edges', goal: 'Orient and solve the remaining edges.', detail: 'Orient edges, place the left and right centres, then solve the final M-slice using efficient M/U sequences.', algorithms: [{ label: 'M-slice cycle', moves: "M2 U M2 U2 M2 U M2" }] },
    ],
  },
  {
    id: 'zz',
    name: 'ZZ',
    shortName: 'ZZ',
    level: 'Rotation-light',
    signature: 'EOCross · F2L · LL',
    description: 'Orient every edge at the start, then solve with mostly R, U, and L moves. The reward is smooth, rotation-light F2L and a simpler last layer.',
    phases: [
      { title: 'EO-Cross', goal: 'Orient all twelve edges while solving the bottom cross.', detail: 'Learn to identify bad edges from the U/D and F/B colour families. Fix orientation while placing the cross.' },
      { title: 'ZZ F2L', goal: 'Complete the first two layers without rotations.', detail: 'With edges already oriented, build left and right blocks using only R, U, and L moves. This preserves orientation automatically.' },
      { title: 'Orient Last Layer', goal: 'Orient the last-layer corners.', detail: 'All last-layer edges are already oriented, reducing OLL recognition to corner cases.', algorithms: [{ label: 'Sune', moves: "R U R' U R U2 R'" }, { label: 'Anti-Sune', moves: "R U2 R' U' R U' R'" }] },
      { title: 'Permute Last Layer', goal: 'Finish with PLL.', detail: 'Recognize the permutation and execute it without needing to repair edge orientation.', algorithms: [{ label: 'T-perm', moves: "R U R' U' R' F R2 U' R' U' R U R' F'" }] },
    ],
  },
]
