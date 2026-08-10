import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BookOpen, BrainCircuit, Check, ChevronDown, ChevronRight, CircleHelp, Dices,
  FastForward, Gauge, History, Layers3, LoaderCircle, Pause, Play, Redo2,
  Rotate3D, RotateCcw, Share2, SkipForward, Sparkles, Undo2,
} from 'lucide-react'
import { CubeScene, type CubeSceneHandle } from './components/CubeScene'
import { SOLVE_METHODS } from './data/methods'
import { CubeState } from './lib/cube-state'
import {
  createScramble, describeMove, explainMove, invertAlgorithm, inverseMove, parseAlgorithm, type Move,
} from './lib/notation'
import { chunkSolution, solveFromMoves } from './lib/solver'
import { buildTutorialPlan, GUIDE_TRACKS, type GuideTrack, type TutorialPlan } from './lib/tutorials'

type WorkspaceTab = 'simulate' | 'solve' | 'learn'
type MoveGroup = 'Faces' | 'Wide' | 'Slices' | 'Rotations'
type TutorialMode = 'guided' | 'methods'

const MOVE_GROUPS: Record<MoveGroup, Move[]> = {
  Faces: ['R', "R'", 'R2', 'L', "L'", 'L2', 'U', "U'", 'U2', 'D', "D'", 'D2', 'F', "F'", 'F2', 'B', "B'", 'B2'],
  Wide: ['Rw', "Rw'", 'Rw2', 'Lw', "Lw'", 'Lw2', 'Uw', "Uw'", 'Uw2', 'Dw', "Dw'", 'Dw2', 'Fw', "Fw'", 'Fw2', 'Bw', "Bw'", 'Bw2'],
  Slices: ['M', "M'", 'M2', 'E', "E'", 'E2', 'S', "S'", 'S2'],
  Rotations: ['x', "x'", 'x2', 'y', "y'", 'y2', 'z', "z'", 'z2'],
}

const QUICK_ALGORITHMS = [
  { name: 'Sexy move', sequence: "R U R' U'" },
  { name: 'Sledgehammer', sequence: "R' F R F'" },
  { name: 'Sune', sequence: "R U R' U R U2 R'" },
]

function App() {
  const cubeRef = useRef<CubeSceneHandle>(null)
  const engineRef = useRef(new CubeState())
  const pausedRef = useRef(false)
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>('simulate')
  const [moveGroup, setMoveGroup] = useState<MoveGroup>('Faces')
  const [tutorialMode, setTutorialMode] = useState<TutorialMode>('guided')
  const [input, setInput] = useState(() => new URLSearchParams(window.location.search).get('alg') ?? "R U R' U'")
  const [history, setHistory] = useState<Move[]>([])
  const [redoStack, setRedoStack] = useState<Move[]>([])
  const [activeMove, setActiveMove] = useState<Move | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [error, setError] = useState('')
  const [isSolved, setIsSolved] = useState(true)
  const [shared, setShared] = useState(false)
  const [isSolving, setIsSolving] = useState(false)
  const [solution, setSolution] = useState<Move[]>([])
  const [solverError, setSolverError] = useState('')
  const [guideTrack, setGuideTrack] = useState<GuideTrack>('beginner')
  const [tutorialPlan, setTutorialPlan] = useState<TutorialPlan | null>(null)
  const [tutorialPhaseIndex, setTutorialPhaseIndex] = useState(0)
  const [tutorialMoveIndex, setTutorialMoveIndex] = useState(0)
  const [selectedMethod, setSelectedMethod] = useState(SOLVE_METHODS[0].id)
  const [selectedPhase, setSelectedPhase] = useState(0)

  const parsedMoves = useMemo(() => {
    try { return parseAlgorithm(input) } catch { return [] }
  }, [input])
  const method = SOLVE_METHODS.find((candidate) => candidate.id === selectedMethod) ?? SOLVE_METHODS[0]
  const tutorialPhase = tutorialPlan?.phases[tutorialPhaseIndex]
  const tutorialMove = tutorialPhase?.moves[tutorialMoveIndex]
  const tutorialInstruction = tutorialMove ? explainMove(tutorialMove) : null
  const solutionSteps = useMemo(() => chunkSolution(solution), [solution])
  const tutorialTotalMoves = tutorialPlan?.phases.reduce((total, phase) => total + phase.moves.length, 0) ?? 0
  const tutorialCompletedMoves = tutorialPlan
    ? tutorialPlan.phases.slice(0, tutorialPhaseIndex).reduce((total, phase) => total + phase.moves.length, 0) + tutorialMoveIndex
    : 0
  const tutorialUpcoming = tutorialPlan
    ? [
        ...(tutorialPhase?.moves.slice(tutorialMoveIndex + 1) ?? []),
        ...tutorialPlan.phases.slice(tutorialPhaseIndex + 1).flatMap((phase) => phase.moves),
      ]
    : []

  useEffect(() => { pausedRef.current = isPaused }, [isPaused])

  async function waitWhilePaused() {
    while (pausedRef.current) await new Promise((resolve) => setTimeout(resolve, 80))
  }

  async function performMove(move: Move, record = true, duration = 310 / speed) {
    setActiveMove(move)
    await cubeRef.current?.execute(move, duration)
    engineRef.current.apply(move)
    setIsSolved(engineRef.current.isSolved())
    if (record) {
      setHistory((current) => [...current, move])
      setRedoStack([])
    }
    setActiveMove(null)
  }

  function clearTutorialPlan() {
    setTutorialPlan(null)
    setTutorialPhaseIndex(0)
    setTutorialMoveIndex(0)
  }

  async function playMoves(moves: Move[], preserveTutorial = false) {
    if (!moves.length || isPlaying) return
    if (!preserveTutorial) {
      setSolution([])
      clearTutorialPlan()
    }
    setIsPlaying(true)
    setIsPaused(false)
    setError('')
    for (const move of moves) {
      await waitWhilePaused()
      await performMove(move)
    }
    setIsPlaying(false)
  }

  function runInput() {
    try {
      const moves = parseAlgorithm(input)
      if (!moves.length) throw new Error('Add at least one move to begin.')
      void playMoves(moves)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That algorithm could not be read.')
    }
  }

  async function undo() {
    if (isPlaying || history.length === 0) return
    const move = history.at(-1)!
    setSolution([])
    clearTutorialPlan()
    setIsPlaying(true)
    await performMove(inverseMove(move), false)
    setHistory((current) => current.slice(0, -1))
    setRedoStack((current) => [...current, move])
    setIsPlaying(false)
  }

  async function redo() {
    if (isPlaying || redoStack.length === 0) return
    const move = redoStack.at(-1)!
    setSolution([])
    clearTutorialPlan()
    setIsPlaying(true)
    await performMove(move, false)
    setHistory((current) => [...current, move])
    setRedoStack((current) => current.slice(0, -1))
    setIsPlaying(false)
  }

  function reset() {
    if (isPlaying) return
    cubeRef.current?.reset()
    engineRef.current.reset()
    setHistory([])
    setRedoStack([])
    setActiveMove(null)
    setIsSolved(true)
    setSolution([])
    clearTutorialPlan()
    setSolverError('')
  }

  function scramble() {
    const moves = createScramble(20)
    setInput(moves.join(' '))
    setSolution([])
    clearTutorialPlan()
    void playMoves(moves)
  }

  async function shareAlgorithm() {
    const algorithm = history.length ? history.join(' ') : input.trim()
    const url = new URL(window.location.href)
    url.search = ''
    if (algorithm) url.searchParams.set('alg', algorithm)
    await navigator.clipboard.writeText(url.toString())
    window.history.replaceState({}, '', url)
    setShared(true)
    window.setTimeout(() => setShared(false), 1800)
  }

  async function solveCurrentCube() {
    if (isSolved || history.length === 0 || isSolving || isPlaying) return
    setIsSolving(true)
    setSolverError('')
    setSolution([])
    clearTutorialPlan()
    try {
      const moves = await solveFromMoves(history)
      setSolution(moves)
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : ''
      setSolverError(message || 'The solver could not interpret this state. Reset the cube and try again.')
    } finally {
      setIsSolving(false)
    }
  }

  async function buildCurrentTutorial() {
    if (isSolved || history.length === 0 || isSolving || isPlaying) return
    setIsSolving(true)
    setSolverError('')
    clearTutorialPlan()
    try {
      const plan = await buildTutorialPlan(guideTrack, history)
      setTutorialPlan(plan)
      setSolution(plan.phases.flatMap((phase) => phase.moves))
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : ''
      setSolverError(message.includes('fixed cube orientation')
        ? 'Beginner and CFOP lessons need a fixed viewpoint. Reset, scramble without x/y/z rotations, and try again.'
        : message || 'This method could not build a lesson for the current state. Reset the cube and try again.')
    } finally {
      setIsSolving(false)
    }
  }

  async function advanceTutorial(count: number, animate = true) {
    if (!tutorialPlan || !tutorialMove || isPlaying) return
    let phaseIndex = tutorialPhaseIndex
    let moveIndex = tutorialMoveIndex
    let remaining = count
    setIsPlaying(true)
    while (remaining > 0 && phaseIndex < tutorialPlan.phases.length) {
      const phase = tutorialPlan.phases[phaseIndex]
      const move = phase.moves[moveIndex]
      if (!move) {
        phaseIndex += 1
        moveIndex = 0
        continue
      }
      await performMove(move, true, animate ? 310 / speed : 1)
      moveIndex += 1
      remaining -= 1
      if (moveIndex >= phase.moves.length) {
        phaseIndex += 1
        moveIndex = 0
      }
    }
    setTutorialPhaseIndex(phaseIndex)
    setTutorialMoveIndex(moveIndex)
    setIsPlaying(false)
  }

  function chooseGuideTrack(track: GuideTrack) {
    setGuideTrack(track)
    clearTutorialPlan()
    setSolverError('')
  }

  function openGuidedTutorial() {
    setTutorialMode('guided')
    setWorkspaceTab('learn')
  }

  function showAlgorithmCase(sequence: string) {
    if (isPlaying) return
    reset()
    setInput(sequence)
    void playMoves(invertAlgorithm(parseAlgorithm(sequence)))
  }

  function playAlgorithm(sequence: string) {
    if (isPlaying) return
    setInput(sequence)
    void playMoves(parseAlgorithm(sequence))
  }

  function loadSequence(sequence: string) {
    setInput(sequence)
    setWorkspaceTab('simulate')
    setError('')
  }

  function selectWorkspace(tab: WorkspaceTab) {
    setWorkspaceTab(tab)
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <button className="brand" onClick={() => setWorkspaceTab('simulate')} aria-label="TwistLab simulator home">
          <span className="brand-mark"><i /><i /><i /></span><span>TWISTLAB</span>
        </button>
        <nav className="workspace-tabs" role="tablist" aria-label="Workspace">
          <button role="tab" aria-selected={workspaceTab === 'simulate'} className={workspaceTab === 'simulate' ? 'active' : ''} onClick={() => selectWorkspace('simulate')}><Rotate3D /> Simulator</button>
          <button role="tab" aria-selected={workspaceTab === 'solve'} className={workspaceTab === 'solve' ? 'active' : ''} onClick={() => selectWorkspace('solve')}><BrainCircuit /> Solver</button>
          <button role="tab" aria-selected={workspaceTab === 'learn'} className={workspaceTab === 'learn' ? 'active' : ''} onClick={() => selectWorkspace('learn')}><BookOpen /> Tutorials</button>
        </nav>
        <div className={`cube-status ${isSolved ? 'solved' : ''}`}><i /> {isSolved ? 'SOLVED' : `${history.length} MOVES`}</div>
      </header>

      <section className={`workspace workspace-${workspaceTab}`}>
        <div className="cube-workbench">
          <div className="workbench-meta">
            <span><i /> LIVE 3×3</span>
            <span>DRAG TO ORBIT · SCROLL TO ZOOM</span>
          </div>
          <CubeScene ref={cubeRef} />
          <div className="turn-readout">
            <span>CURRENT TURN</span><strong>{activeMove ?? '—'}</strong><small>{activeMove ? describeMove(activeMove) : 'Ready'}</small>
          </div>
          <div className="cube-history">
            <span><History /> {history.length}</span>
            <div>{history.slice(-12).map((move, index) => <i key={`${move}-${index}`}>{move}</i>)}</div>
          </div>
          <div className="cube-transport">
            <button onClick={undo} disabled={isPlaying || !history.length} aria-label="Undo"><Undo2 /></button>
            <button onClick={() => setIsPaused((value) => !value)} disabled={!isPlaying} aria-label={isPaused ? 'Resume' : 'Pause'}>{isPaused ? <Play /> : <Pause />}</button>
            <button onClick={redo} disabled={isPlaying || !redoStack.length} aria-label="Redo"><Redo2 /></button>
            <button onClick={scramble} disabled={isPlaying}><Dices /> Scramble</button>
            <button onClick={reset} disabled={isPlaying}><RotateCcw /> Reset</button>
          </div>
        </div>

        <aside className="workspace-panel" role="tabpanel">
          {workspaceTab === 'simulate' && (
            <div className="panel-view simulate-panel" key="simulate">
              <div className="panel-title"><div><span>TURN LAB</span><h1>Move the cube.</h1></div><Gauge /></div>
              <label className="algorithm-editor">
                <span>ALGORITHM · {parsedMoves.length} MOVES</span>
                <textarea value={input} onChange={(event) => { setInput(event.target.value); setError('') }} spellCheck={false} aria-invalid={Boolean(error)} />
              </label>
              {error && <p className="inline-error">{error}</p>}
              <button className="primary-action" onClick={runInput} disabled={isPlaying}><Play fill="currentColor" /> Run sequence</button>
              <div className="move-tabs" role="tablist" aria-label="Move categories">
                {(Object.keys(MOVE_GROUPS) as MoveGroup[]).map((group) => <button role="tab" aria-selected={moveGroup === group} className={moveGroup === group ? 'active' : ''} onClick={() => setMoveGroup(group)} key={group}>{group}</button>)}
              </div>
              <div className="move-grid" aria-label={`${moveGroup} moves`}>
                {MOVE_GROUPS[moveGroup].map((move) => <button key={move} onClick={() => void playMoves([move])} disabled={isPlaying}><strong>{move}</strong><small>{describeMove(move)}</small></button>)}
              </div>
              <div className="quick-row">
                {QUICK_ALGORITHMS.map((algorithm) => <button key={algorithm.name} onClick={() => setInput(algorithm.sequence)}>{algorithm.name}<ChevronRight /></button>)}
              </div>
              <div className="panel-utilities">
                <label><span>Speed</span><select aria-label="Playback speed" value={speed} onChange={(event) => setSpeed(Number(event.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={1.5}>1.5×</option><option value={2}>2×</option></select></label>
                <button onClick={() => void shareAlgorithm()}>{shared ? <Check /> : <Share2 />}{shared ? 'Copied' : 'Share state'}</button>
              </div>
            </div>
          )}

          {workspaceTab === 'solve' && (
            <div className="panel-view solver-panel" key="solve">
              <div className="panel-title"><div><span>STATE SOLVER</span><h1>Find a way home.</h1></div><BrainCircuit /></div>
              <p className="panel-lede">The solver reads every turn made in this session and builds a reliable route back to solved, entirely in your browser.</p>
              {!solution.length ? (
                <div className="solver-empty">
                  <div className="state-orbit"><i /><i /><BrainCircuit /></div>
                  <strong>{isSolved ? 'The cube is already solved.' : `${history.length} recorded moves are ready to analyse.`}</strong>
                  <p>{isSolved ? 'Scramble it in the Simulator tab, then return here.' : 'Compute a sequence, or create a guided tutorial for this exact state.'}</p>
                  <button className="primary-action" onClick={() => void solveCurrentCube()} disabled={isSolved || isSolving || isPlaying}>{isSolving ? <><LoaderCircle className="spin" /> Searching</> : <><BrainCircuit /> Compute solution</>}</button>
                  {!isSolved && <button className="secondary-action" onClick={openGuidedTutorial} disabled={isSolving || isPlaying}><BookOpen /> Choose tutorial method</button>}
                  {solverError && <p className="inline-error">{solverError}</p>}
                </div>
              ) : (
                <div className="solution-panel">
                  <div className="solution-summary"><div><span>SOLUTION READY</span><strong>{solution.length}</strong><small>MOVES</small></div><button onClick={openGuidedTutorial}><BookOpen /> Guided mode</button></div>
                  <div className="solution-list">
                    {solutionSteps.map((step, index) => <div key={`${step.join('-')}-${index}`}><span>{String(index + 1).padStart(2, '0')}</span><code>{step.join(' ')}</code></div>)}
                  </div>
                  <button className="primary-action" onClick={() => void playMoves(solution, true)} disabled={isPlaying || isSolved}><FastForward /> Play complete solution</button>
                  <button className="secondary-action" onClick={() => loadSequence(solution.join(' '))}><Play /> Load into simulator</button>
                </div>
              )}
            </div>
          )}

          {workspaceTab === 'learn' && (
            <div className="panel-view learn-panel" key="learn">
              <div className="learn-mode-tabs" role="tablist" aria-label="Tutorial type">
                <button role="tab" aria-selected={tutorialMode === 'guided'} className={tutorialMode === 'guided' ? 'active' : ''} onClick={() => setTutorialMode('guided')}><Sparkles /> Current cube</button>
                <button role="tab" aria-selected={tutorialMode === 'methods'} className={tutorialMode === 'methods' ? 'active' : ''} onClick={() => setTutorialMode('methods')}><Layers3 /> Method library</button>
              </div>

              {tutorialMode === 'guided' && (
                <div className="guided-tutorial">
                  <div className="panel-title"><div><span>GUIDED SOLVE</span><h1>One turn at a time.</h1></div><CircleHelp /></div>
                  {!tutorialPlan ? (
                    <div className="tutorial-empty">
                      <span>PERSONALISED TO THE CURRENT STATE</span>
                      <h2>{isSolved ? 'Scramble the cube first.' : 'How do you want to learn?'}</h2>
                      <p>{isSolved ? 'Use the Simulator tab or the scramble control beside the cube.' : 'Choose your experience level. The lesson will use that method on the cube exactly as it is now.'}</p>
                      <div className="guide-track-picker" role="radiogroup" aria-label="Tutorial method">
                        {GUIDE_TRACKS.map((track) => <button type="button" role="radio" aria-checked={guideTrack === track.id} className={guideTrack === track.id ? 'active' : ''} key={track.id} onClick={() => chooseGuideTrack(track.id)}><span>{track.level}</span><strong>{track.label}</strong><small>{track.description}</small><i><Check /></i></button>)}
                      </div>
                      <button className="primary-action" onClick={() => void buildCurrentTutorial()} disabled={isSolved || isSolving || isPlaying}>{isSolving ? <><LoaderCircle className="spin" /> Preparing lesson</> : <><BookOpen /> Build {GUIDE_TRACKS.find((track) => track.id === guideTrack)?.label} lesson</>}</button>
                      {solverError && <p className="inline-error">{solverError}</p>}
                    </div>
                  ) : tutorialPhaseIndex >= tutorialPlan.phases.length ? (
                    <div className="tutorial-complete"><Check /><span>{tutorialPlan.methodName.toUpperCase()} · LESSON COMPLETE</span><h2>The cube is solved.</h2><p>You completed {tutorialTotalMoves} guided moves using the {tutorialPlan.methodName} track.</p><button className="secondary-action" onClick={reset}><RotateCcw /> Start again</button></div>
                  ) : (
                    <div className="tutorial-step">
                      <div className="tutorial-method-line"><div><span>METHOD</span><strong>{tutorialPlan.methodName}</strong><small>{tutorialPlan.experience}</small></div><button onClick={() => clearTutorialPlan()}>Change method</button></div>
                      <p className="tutorial-method-note">{tutorialPlan.note}</p>
                      <div className="tutorial-progress"><i style={{ width: `${(tutorialCompletedMoves / tutorialTotalMoves) * 100}%` }} /><span>MOVE {tutorialCompletedMoves + 1} / {tutorialTotalMoves}</span></div>
                      <div className="tutorial-phase-heading"><span>PHASE {tutorialPhaseIndex + 1} / {tutorialPlan.phases.length}</span><h2>{tutorialPhase?.title}</h2><strong>{tutorialPhase?.goal}</strong><p>{tutorialPhase?.explanation}</p></div>
                      <div className="phase-sequence"><span>THIS PHASE · {tutorialPhase?.moves.length} MOVES</span><div>{tutorialPhase?.moves.map((move, index) => <i className={index === tutorialMoveIndex ? 'active' : index < tutorialMoveIndex ? 'done' : ''} key={`${move}-${index}`}>{move}</i>)}</div></div>
                      <div className="move-focus"><span>NEXT MOVE</span><strong>{tutorialInstruction?.notation}</strong></div>
                      <h3>{tutorialInstruction?.title}</h3>
                      <p className="move-cue">{tutorialInstruction?.cue}</p>
                      <div className="orientation-note"><Rotate3D /><span>Match the simulator’s current viewpoint. “Front” faces you, “upper” is on top, and the highlighted notation is the move to perform.</span></div>
                      <button className="primary-action" onClick={() => void advanceTutorial(1)} disabled={isPlaying}><Play fill="currentColor" /> Play this move</button>
                      <div className="tutorial-actions"><button onClick={() => void advanceTutorial(1, false)} disabled={isPlaying}><Check /> I did it manually</button><button onClick={() => void advanceTutorial(3)} disabled={isPlaying}><SkipForward /> Play next 3</button></div>
                      <div className="up-next"><span>UP NEXT</span><div>{tutorialUpcoming.slice(0, 5).map((move, index) => <i key={`${move}-${index}`}>{move}</i>)}</div></div>
                    </div>
                  )}
                </div>
              )}

              {tutorialMode === 'methods' && (
                <div className="method-library">
                  <div className="panel-title"><div><span>METHOD LIBRARY</span><h1>Choose your logic.</h1></div><BookOpen /></div>
                  <div className="method-tabs" role="tablist" aria-label="Solving methods">{SOLVE_METHODS.map((item) => <button role="tab" aria-selected={item.id === method.id} className={item.id === method.id ? 'active' : ''} key={item.id} onClick={() => { setSelectedMethod(item.id); setSelectedPhase(0) }}><strong>{item.shortName}</strong><small>{item.level}</small></button>)}</div>
                  <div className="method-intro"><span>{method.signature}</span><h2>{method.name}</h2><p>{method.description}</p></div>
                  <div className="method-phases">{method.phases.map((phase, index) => <article className={selectedPhase === index ? 'active' : ''} key={phase.title}><button onClick={() => setSelectedPhase(index)} aria-expanded={selectedPhase === index}><span>{String(index + 1).padStart(2, '0')}</span><strong>{phase.title}</strong><ChevronDown /></button>{selectedPhase === index && <div><h3>{phase.goal}</h3><p>{phase.detail}</p>{phase.algorithms?.map((algorithm) => <div className="method-alg-card" key={algorithm.label}><div><span>{algorithm.label}</span><code>{algorithm.moves}</code><small>CASE SETUP · {invertAlgorithm(parseAlgorithm(algorithm.moves)).join(' ')}</small></div><div><button onClick={() => showAlgorithmCase(algorithm.moves)} disabled={isPlaying}><Rotate3D /> Show state</button><button onClick={() => playAlgorithm(algorithm.moves)} disabled={isPlaying}><Play fill="currentColor" /> Play moves</button></div></div>)}</div>}</article>)}</div>
                </div>
              )}
            </div>
          )}
        </aside>
      </section>
    </main>
  )
}

export default App
