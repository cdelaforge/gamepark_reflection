import { Element } from '../material/Element'
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
  squares: boolean
  triangles: boolean
  absorbingTriangles: boolean
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

function getRandomElements({ items, blackHoles, squares, triangles, absorbingTriangles }: PuzzleOptions): Element[] {
  // "quality" favors the diagonal mirrors, which make the puzzles more interesting
  for (;;) {
    let quality = 0
    const elements: Element[] = []
    // At most 2 different triangles, and 2 different absorbing triangles, in a puzzle
    const triangleTypes = pickTwo([Element.TriangleA, Element.TriangleB, Element.TriangleC, Element.TriangleD])
    const absorbingTypes = pickTwo([Element.AbsorbingTriangleA, Element.AbsorbingTriangleB, Element.AbsorbingTriangleC, Element.AbsorbingTriangleD])
    // Each type of special shape has the same chance: the square, and the 2 types of each family of triangles
    const specialShapes = [...(squares ? [Element.Square] : []), ...(triangles ? triangleTypes : []), ...(absorbingTriangles ? absorbingTypes : [])]
    // The triangles deflect the laser: they make the puzzles more interesting, the absorbing triangles do not
    const addSpecialShape = () => {
      const shape = specialShapes[randomInt(0, specialShapes.length - 1)]
      if (triangleTypes.includes(shape)) quality++
      elements.push(shape)
    }
    // More special shapes when the 3 families share them
    const specialRange = squares && triangles && absorbingTriangles ? 30 : 20
    if (items > 5) {
      quality = 4
      elements.push(Element.Slash, Element.BackSlash, randomInt(0, 1) ? Element.Horizontal : Element.Vertical)
      if (blackHoles) elements.push(Element.BlackHole)
    }
    if (items > 6 && specialShapes.length) addSpecialShape()
    while (elements.length < items) {
      const r = randomInt(0, 189 + specialRange)
      if (r < 120) {
        quality += 2
        elements.push(r < 60 ? Element.Slash : Element.BackSlash)
      } else if (r < 180) {
        elements.push(r < 150 ? Element.Vertical : Element.Horizontal)
      } else if (r < 180 + specialRange) {
        if (!specialShapes.length) continue
        addSpecialShape()
      } else if (blackHoles) {
        elements.push(Element.BlackHole)
      }
    }
    if (quality > items) return elements
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

function pickTwo(elements: Element[]) {
  return elements.sort(() => Math.random() - 0.5).slice(0, 2)
}

function randomInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}
