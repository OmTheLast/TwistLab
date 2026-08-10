declare module 'rubiks-cube-solver' {
  type Partitions = {
    cross: string[]
    f2l: string[]
    oll: string
    pll: string
  }

  export default function solve(cubeState: string, options: { partitioned: true }): Partitions
}
