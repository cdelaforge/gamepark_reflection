import { Element } from '../material/Element'

/**
 * grid[row][col], 0 when the cell is empty
 */
export type Grid = number[][]

export enum Side {
  Top,
  Right,
  Bottom,
  Left
}

export const sides = [Side.Top, Side.Right, Side.Bottom, Side.Left]

/**
 * Distance travelled by the laser, followed by 'a' (absorbed), 'r' (returns to its entry) or 's' (exits somewhere else)
 */
export type Clue = string

/**
 * clues[side][index]
 */
export type Clues = Clue[][]

export type Cell = { row: number; col: number }

export type Exit = { side: Side; index: number }

/**
 * segments: the cells crossed by the laser, a new segment starts after each portal
 */
export type Laser = { clue: Clue; segments: Cell[][]; exit?: Exit }

// Directions: 0 up, 1 right, 2 down, 3 left. deflections[element][direction] is the new direction, -1 when the laser is absorbed
const deflections = [
  [0, 1, 2, 3], // empty
  [1, 0, 3, 2], // slash
  [3, 2, 1, 0], // backslash
  [0, 3, 2, 1], // vertical
  [2, 1, 0, 3], // horizontal
  [2, 3, 0, 1], // square
  [-1, -1, -1, -1], // black hole
  [0, 1, 2, 3], // portal
  [2, 3, 1, 0], // triangle A
  [3, 2, 0, 1] // triangle B
]
const rowSteps = [-1, 0, 1, 0]
const colSteps = [0, 1, 0, -1]

export function traceLaser(grid: Grid, side: Side, index: number): Laser {
  const size = grid.length
  let { row, col } = getEntryCell(side, index, size)
  let direction = (side + 2) % 4
  let distance = 1
  const segments: Cell[][] = [[]]
  for (;;) {
    segments[segments.length - 1].push({ row, col })
    const element = grid[row][col]
    direction = deflections[element][direction]
    if (direction < 0) return { clue: `${distance}a`, segments }
    if (element === Element.Portal) {
      ;({ row, col } = getOtherPortal(grid, row, col))
      segments.push([{ row, col }])
      distance++
    }
    row += rowSteps[direction]
    col += colSteps[direction]
    const exit = getExit(row, col, size)
    if (exit) {
      return { clue: `${distance}${exit.side === side && exit.index === index ? 'r' : 's'}`, segments, exit }
    }
    distance++
  }
}

export function getClues(grid: Grid): Clues {
  return sides.map(side => grid.map((_, index) => traceLaser(grid, side, index).clue))
}

export function isSolved(grid: Grid, clues: Clues) {
  return getClues(grid).every((sideClues, side) => sideClues.every((clue, index) => clue === clues[side][index]))
}

export function createEmptyGrid(size: number, portals: Cell[] = []): Grid {
  const grid = Array.from({ length: size }, () => Array<number>(size).fill(0))
  for (const { row, col } of portals) grid[row][col] = Element.Portal
  return grid
}

function getEntryCell(side: Side, index: number, size: number): Cell {
  switch (side) {
    case Side.Top:
      return { row: 0, col: index }
    case Side.Right:
      return { row: index, col: size - 1 }
    case Side.Bottom:
      return { row: size - 1, col: index }
    case Side.Left:
      return { row: index, col: 0 }
  }
}

function getExit(row: number, col: number, size: number): Exit | undefined {
  if (row < 0) return { side: Side.Top, index: col }
  if (row >= size) return { side: Side.Bottom, index: col }
  if (col < 0) return { side: Side.Left, index: row }
  if (col >= size) return { side: Side.Right, index: row }
  return
}

function getOtherPortal(grid: Grid, row: number, col: number): Cell {
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid.length; c++) {
      if ((r !== row || c !== col) && grid[r][c] === Element.Portal) return { row: r, col: c }
    }
  }
  throw new Error('A portal must have a twin')
}
