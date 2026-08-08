import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, Check, ChevronLeft, ChevronRight, Dices, History, Pause, Play, Redo2, RotateCcw, Share2, Sparkles, Undo2 } from 'lucide-react'
import { CubeScene, type CubeSceneHandle } from './components/CubeScene'
import { BASE_MOVES, createScramble, describeMove, inverseMove, parseAlgorithm, type Move } from './lib/notation'
import { CubeState } from './lib/cube-state'

const QUICK_ALGORITHMS = [
  { name: 'Sexy move', sequence: "R U R' U'", note: 'The rhythm behind dozens of algorithms.' },
  { name: 'Sledgehammer', sequence: "R' F R F'", note: 'A compact trigger for changing orientation.' },
  { name: 'Sune', sequence: "R U R' U R U2 R'", note: 'A classic last-layer orientation case.' },
]

function App() {
  const cubeRef = useRef<CubeSceneHandle>(null)
  const engineRef = useRef(new CubeState())
  const [input, setInput] = useState(() => new URLSearchParams(window.location.search).get('alg') ?? "R U R' U'")
  const [history, setHistory] = useState<Move[]>([])
  const [redoStack, setRedoStack] = useState<Move[]>([])
  const [activeMove, setActiveMove] = useState<Move | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const pausedRef = useRef(false)
  const [speed, setSpeed] = useState(1)
  const [error, setError] = useState('')
  const [isSolved, setIsSolved] = useState(true)
  const [shared, setShared] = useState(false)

  const parsedMoves = useMemo(() => {
    try {
      return parseAlgorithm(input)
    } catch {
      return []
    }
  }, [input])

  useEffect(() => {
    pausedRef.current = isPaused
  }, [isPaused])

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

  async function playMoves(moves: Move[]) {
    if (!moves.length || isPlaying) return
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
    setIsPlaying(true)
    await performMove(inverseMove(move), false)
    setHistory((current) => current.slice(0, -1))
    setRedoStack((current) => [...current, move])
    setIsPlaying(false)
  }

  async function redo() {
    if (isPlaying || redoStack.length === 0) return
    const move = redoStack.at(-1)!
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
  }

  function scramble() {
    const moves = createScramble(20)
    setInput(moves.join(' '))
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

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Twistlab home">
          <span className="brand-mark"><i /><i /><i /></span>
          <span>TWISTLAB</span>
        </a>
        <nav aria-label="Main navigation">
          <a className="nav-active" href="#simulator">Simulator</a>
          <a href="#notation">Notation</a>
          <a href="#roadmap">Puzzles</a>
        </nav>
        <a className="status-pill" href="#roadmap"><span /> 3×3 LAB / 001</a>
      </header>

      <section className="hero" id="top">
        <div className="hero-kicker"><span>Interactive puzzle studies</span><span>Vol. 01</span></div>
        <h1><span>THINK</span><span className="outline">IN TURNS.</span></h1>
        <div className="hero-orbit" aria-hidden="true"><span>R</span><span>U</span><span>R′</span><span>U′</span></div>
        <p>Don’t memorize the cube.<br />Build an instinct for it.</p>
        <a className="enter-lab" href="#simulator"><ArrowDown size={18} /> Enter the lab</a>
        <div className="hero-grid" aria-hidden="true" />
      </section>

      <section className="lab-section" id="simulator">
        <div className="section-label"><span>01 / SIMULATOR</span><span>Drag to inspect · Scroll to zoom</span></div>
        <div className="lab-layout">
          <div className="stage-panel">
            <div className="stage-topline">
              <span className="live-label"><i /> LIVE OBJECT</span>
              <span>3×3×3 / {isSolved ? 'SOLVED' : 'IN PROGRESS'}</span>
            </div>
            <CubeScene ref={cubeRef} />
            <div className="axis-labels" aria-hidden="true"><span>Y+</span><span>X+</span><span>Z+</span></div>
            <div className="active-readout">
              <small>CURRENT TURN</small>
              <strong>{activeMove ?? '—'}</strong>
              <span>{activeMove ? describeMove(activeMove) : 'Waiting for input'}</span>
            </div>
          </div>

          <aside className="control-panel">
            <div className="panel-heading">
              <span>ALGORITHM CONSOLE</span>
              <span>{parsedMoves.length.toString().padStart(2, '0')} MOVES</span>
            </div>
            <label className="algorithm-input">
              <span>Enter notation</span>
              <textarea value={input} onChange={(event) => { setInput(event.target.value); setError('') }} spellCheck={false} aria-invalid={Boolean(error)} />
            </label>
            {error && <p className="error-message">{error}</p>}
            <div className="move-chips" aria-label="Add a move">
              {BASE_MOVES.map((move) => <button key={move} onClick={() => setInput((value) => `${value.trim()} ${move}`.trim())}>{move}</button>)}
            </div>
            <button className="run-button" onClick={runInput} disabled={isPlaying && !isPaused}>
              {isPlaying ? <><Pause size={18} /> Sequence running</> : <><Play size={18} fill="currentColor" /> Run sequence</>}
            </button>
            <div className="transport">
              <button onClick={undo} disabled={isPlaying || !history.length} aria-label="Undo"><Undo2 size={18} /></button>
              <button onClick={() => setIsPaused((value) => !value)} disabled={!isPlaying} aria-label={isPaused ? 'Resume' : 'Pause'}>
                {isPaused ? <Play size={18} /> : <Pause size={18} />}
              </button>
              <button onClick={redo} disabled={isPlaying || !redoStack.length} aria-label="Redo"><Redo2 size={18} /></button>
              <label className="speed-control">Speed
                <select value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
                  <option value={0.5}>0.5×</option><option value={1}>1×</option><option value={1.5}>1.5×</option><option value={2}>2×</option>
                </select>
              </label>
            </div>
            <div className="utility-actions">
              <button onClick={scramble} disabled={isPlaying}><Dices size={17} /> Scramble</button>
              <button onClick={reset} disabled={isPlaying}><RotateCcw size={17} /> Reset</button>
              <button onClick={() => void shareAlgorithm()} disabled={isPlaying}>{shared ? <Check size={17} /> : <Share2 size={17} />} {shared ? 'Copied' : 'Share'}</button>
            </div>
            <div className="history-strip">
              <div><History size={15} /><span>Move history</span><b>{history.length}</b></div>
              <p>{history.length ? history.slice(-10).map((move, index) => <span key={`${move}-${index}`}>{move}</span>) : <em>Your turns will appear here.</em>}</p>
            </div>
          </aside>
        </div>
      </section>

      <section className="notation-section" id="notation">
        <div className="notation-intro">
          <span className="eyebrow">02 / NOTATION</span>
          <h2>Every symbol<br /><em>is a gesture.</em></h2>
          <p>Notation is choreography for the cube. Read the letter, understand the face, then feel the direction.</p>
        </div>
        <div className="notation-demo">
          <div className="gesture-card gesture-main">
            <span className="corner-number">01</span>
            <strong>R</strong>
            <div className="turn-arrow">↻</div>
            <p><b>RIGHT FACE</b><br />Turn clockwise by 90°</p>
          </div>
          <div className="gesture-stack">
            <div className="gesture-card"><span className="corner-number">02</span><strong>R′</strong><p>Prime means<br />counter-clockwise</p></div>
            <div className="gesture-card inverse"><span className="corner-number">03</span><strong>R²</strong><p>Two means<br />a half turn</p></div>
          </div>
        </div>
      </section>

      <section className="algorithms-section">
        <div className="section-label"><span>03 / FIELD NOTES</span><span>Tap an algorithm to load it</span></div>
        <h2>Small sequences.<br />Surprising consequences.</h2>
        <div className="algorithm-list">
          {QUICK_ALGORITHMS.map((algorithm, index) => (
            <button key={algorithm.name} onClick={() => { setInput(algorithm.sequence); document.querySelector('#simulator')?.scrollIntoView({ behavior: 'smooth' }) }}>
              <span>0{index + 1}</span><strong>{algorithm.name}</strong><code>{algorithm.sequence}</code><p>{algorithm.note}</p><ChevronRight />
            </button>
          ))}
        </div>
      </section>

      <section className="roadmap-section" id="roadmap">
        <div className="roadmap-copy">
          <span className="eyebrow">THE PUZZLE ATLAS</span>
          <h2>One engine.<br /><em>Many worlds.</em></h2>
          <p>The 3×3 is only our first instrument. The architecture is being shaped for a growing collection of twisty puzzles.</p>
          <div className="roadmap-controls"><button aria-label="Previous puzzle"><ChevronLeft /></button><button aria-label="Next puzzle"><ChevronRight /></button></div>
        </div>
        <div className="puzzle-track">
          <article className="puzzle-card active"><span>AVAILABLE NOW</span><div className="mini-cube cube-3" aria-hidden="true" /><h3>THE ORIGINAL</h3><p>3×3×3 cube</p></article>
          <article className="puzzle-card"><span>NEXT STUDY</span><div className="mini-cube cube-2" aria-hidden="true" /><h3>THE POCKET</h3><p>2×2×2 cube</p></article>
          <article className="puzzle-card"><span>IN THE ARCHIVE</span><div className="pyramid" aria-hidden="true" /><h3>THE PYRAMINX</h3><p>Tetrahedral puzzle</p></article>
        </div>
      </section>

      <footer>
        <div className="footer-mark"><Sparkles /><span>TWISTLAB</span></div>
        <p>Learn the language.<br />See the mechanism.<br />Trust your hands.</p>
        <div><span>EXPERIMENT / 001</span><span>BUILT FOR CURIOUS MINDS</span></div>
      </footer>
    </main>
  )
}

export default App
