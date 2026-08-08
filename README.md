# TwistLab

TwistLab is an interactive, browser-based laboratory for learning how twisty puzzles move. The first study is a tactile 3×3 cube with animated notation playback, deterministic state tracking, and an editorial learning experience.

## Features

- Interactive WebGL 3×3 cube with orbit and zoom controls
- Standard face, wide, slice, and whole-cube notation
- Animated algorithms with pause and speed controls
- Scramble, reset, undo, redo, and move history
- Renderer-independent cube state and solved-state detection
- Shareable algorithm URLs
- Responsive layouts and reduced-motion support

## Local development

```bash
npm install
npm run dev
```

## Verification

```bash
npm run test
npm run build
npm run lint
```

## Roadmap

- Guided beginner-method solutions
- Timeline scrubbing and algorithm annotations
- Saved solves and timing statistics
- Puzzle definition API
- 2×2 and Pyraminx studies
