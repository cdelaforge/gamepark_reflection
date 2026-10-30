import { Element } from '../material/Element'
import { SpecialShapes } from '../SpecialShapes'
import { Cell, Clues, createEmptyGrid, getClues, Grid } from './Laser'

/**
 * What a player receives when they start a round: the clues to solve, and the fixed portals if any
 */
export type Puzzle = { clues: Clues; portals?: Cell[] }

export type PuzzleOptions = {
  gridSize: number
  items: number
  blackHoles: boolean
  lightWarps: boolean
  specialShapes: SpecialShapes
}

export type GeneratedPuzzle = { puzzle: Puzzle; elements: Element[]; solution: Grid }

/**
 * Random puzzle generation. Must only run on the server (game setup).
 */
export function generatePuzzle(options: PuzzleOptions): GeneratedPuzzle {
  const portals = options.lightWarps ? getRandomPortals(options.gridSize) : undefined
  // No more elements than free cells: the items count of a small grid is reduced
  const items = Math.min(options.items, options.gridSize * options.gridSize - (portals?.length ?? 0))
  const elements = getRandomElements({ ...options, items })
  let solution = getRandomGrid(options.gridSize, elements, portals)
  // Retry a few times when an element is useless (the clues are the same without it)
  for (let attempt = 1; attempt < 10 && hasUselessElement(solution); attempt++) {
    solution = getRandomGrid(options.gridSize, elements, portals)
  }
  return { puzzle: { clues: getClues(solution), portals }, elements, solution }
}

function getRandomElements({ items, blackHoles, specialShapes }: PuzzleOptions): Element[] {
  // "quality" favors the diagonal mirrors, which make the puzzles more interesting
  for (;;) {
    let quality = 0
    const elements: Element[] = []
    if (items > 5) {
      quality = 4
      elements.push(Element.Slash, Element.BackSlash, randomInt(0, 1) ? Element.Horizontal : Element.Vertical)
      if (blackHoles) elements.push(Element.BlackHole)
    }
    if (items > 6 && specialShapes !== SpecialShapes.None) {
      const shape = getRandomSpecialShape(specialShapes)
      if (shape !== Element.Square) quality++
      elements.push(shape)
    }
    while (elements.length < items) {
      const r = randomInt(0, 209)
      if (r < 120) {
        quality += 2
        elements.push(r < 60 ? Element.Slash : Element.BackSlash)
      } else if (r < 180) {
        elements.push(r < 150 ? Element.Vertical : Element.Horizontal)
      } else if (r < 200) {
        if (specialShapes === SpecialShapes.None) continue
        const shape = getRandomSpecialShape(specialShapes)
        if (shape !== Element.Square) quality++
        elements.push(shape)
      } else if (blackHoles) {
        elements.push(Element.BlackHole)
      }
    }
    if (quality > items) return elements
  }
}

function getRandomSpecialShape(specialShapes: SpecialShapes): Element {
  switch (specialShapes) {
    case SpecialShapes.Squares:
      return Element.Square
    case SpecialShapes.Triangles:
      return randomInt(0, 1) ? Element.TriangleB : Element.TriangleA
    default:
      return [Element.Square, Element.TriangleA, Element.TriangleB][randomInt(0, 2)]
  }
}

function getRandomPortals(size: number): Cell[] {
  const first = { row: randomInt(0, size - 1), col: randomInt(0, size - 1) }
  for (;;) {
    const second = { row: randomInt(0, size - 1), col: randomInt(0, size - 1) }
    if (second.row !== first.row || second.col !== first.col) return [first, second]
  }
}

function getRandomGrid(size: number, elements: Element[], portals?: Cell[]): Grid {
  const grid = createEmptyGrid(size, portals)
  for (const element of elements) {
    let row: number, col: number
    do {
      row = randomInt(0, size - 1)
      col = randomInt(0, size - 1)
    } while (grid[row][col])
    grid[row][col] = element
  }
  return grid
}

function hasUselessElement(grid: Grid) {
  const clues = JSON.stringify(getClues(grid))
  return grid.some((cells, row) =>
    cells.some((element, col) => {
      if (!element || element === Element.Portal) return false
      grid[row][col] = 0
      const useless = JSON.stringify(getClues(grid)) === clues
      grid[row][col] = element
      return useless
    })
  )
}

function randomInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}
