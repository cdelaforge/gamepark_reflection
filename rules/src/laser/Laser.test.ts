import { describe, expect, test } from 'vitest'
import { Element } from '../material/Element'
import { createEmptyGrid, getClues, isSolved, Side, traceLaser } from './Laser'
import { generatePuzzle } from './PuzzleGenerator'

const noShapes = { squares: false, triangles: false, absorbingTriangles: false }
const allShapes = { squares: true, triangles: true, absorbingTriangles: true }
const triangles = [Element.TriangleA, Element.TriangleB, Element.TriangleC, Element.TriangleD]
const absorbingTriangles = [Element.AbsorbingTriangleA, Element.AbsorbingTriangleB, Element.AbsorbingTriangleC, Element.AbsorbingTriangleD]

describe('Laser', () => {
  test('a small grid gets no more elements than free cells', () => {
    const options = { gridSize: 4, items: 30, blackHoles: false, ...noShapes }
    expect(generatePuzzle({ ...options, lightWarps: false }).elements).toHaveLength(16)
    expect(generatePuzzle({ ...options, lightWarps: true }).elements).toHaveLength(14)
  })

  test('crosses an empty grid', () => {
    expect(traceLaser(createEmptyGrid(4), Side.Top, 1)).toEqual({
      clue: '4s',
      segments: [[0, 1, 2, 3].map(row => ({ row, col: 1 }))],
      exit: { side: Side.Bottom, index: 1 }
    })
  })

  test('is deflected, returned or absorbed', () => {
    const grid = createEmptyGrid(4)
    grid[0][0] = Element.Slash
    grid[3][3] = Element.Square
    grid[1][2] = Element.BlackHole
    expect(traceLaser(grid, Side.Left, 0).exit).toEqual({ side: Side.Top, index: 0 })
    expect(traceLaser(grid, Side.Bottom, 3).clue).toBe('1r')
    expect(traceLaser(grid, Side.Top, 2).clue).toBe('2a')
  })

  test('triangles C and D reflect on their sides and deflect on their diagonal', () => {
    const grid = createEmptyGrid(1)
    grid[0][0] = Element.TriangleC // right angle bottom right
    expect(traceLaser(grid, Side.Right, 0).clue).toBe('1r')
    expect(traceLaser(grid, Side.Top, 0).exit).toEqual({ side: Side.Left, index: 0 })
    grid[0][0] = Element.TriangleD // right angle top left
    expect(traceLaser(grid, Side.Top, 0).clue).toBe('1r')
    expect(traceLaser(grid, Side.Bottom, 0).exit).toEqual({ side: Side.Right, index: 0 })
  })

  test('absorbing triangles return the laser on their sides and absorb it on their diagonal', () => {
    const grid = createEmptyGrid(1)
    // Sides of the right angle (returned), then sides of the diagonal (absorbed)
    const cases = [
      [Element.AbsorbingTriangleA, [Side.Bottom, Side.Left], [Side.Top, Side.Right]],
      [Element.AbsorbingTriangleB, [Side.Top, Side.Right], [Side.Bottom, Side.Left]],
      [Element.AbsorbingTriangleC, [Side.Bottom, Side.Right], [Side.Top, Side.Left]],
      [Element.AbsorbingTriangleD, [Side.Top, Side.Left], [Side.Bottom, Side.Right]]
    ] as const
    for (const [element, returned, absorbed] of cases) {
      grid[0][0] = element
      for (const side of returned) expect(traceLaser(grid, side, 0).clue).toBe('1r')
      for (const side of absorbed) expect(traceLaser(grid, side, 0).clue).toBe('1a')
    }
  })

  test('jumps through the portals', () => {
    const grid = createEmptyGrid(4, [
      { row: 0, col: 0 },
      { row: 3, col: 3 }
    ])
    // Enters at (0,0), jumps to (3,3), exits at the bottom: the jump counts as 1
    expect(traceLaser(grid, Side.Top, 0)).toMatchObject({ clue: '2s', exit: { side: Side.Bottom, index: 3 } })
  })
})

describe('Puzzle generator', () => {
  test('the generated solution solves the puzzle', () => {
    for (let i = 0; i < 50; i++) {
      const options = { gridSize: 8, items: 15, blackHoles: true, lightWarps: true, ...allShapes }
      const { puzzle, elements, solution } = generatePuzzle(options)
      expect(elements).toHaveLength(15)
      expect(puzzle.portals).toHaveLength(2)
      expect(isSolved(solution, puzzle.clues)).toBe(true)
      expect(getClues(createEmptyGrid(8, puzzle.portals))).not.toEqual(puzzle.clues)
    }
  })

  test('no more than 2 different triangles, and 2 different absorbing triangles, in a puzzle', () => {
    for (let i = 0; i < 50; i++) {
      const { elements } = generatePuzzle({ gridSize: 10, items: 40, blackHoles: false, lightWarps: false, ...allShapes })
      for (const family of [triangles, absorbingTriangles]) {
        expect(new Set(elements.filter(element => family.includes(element))).size).toBeLessThanOrEqual(2)
      }
    }
  })

  test('each special shape only comes with its option', () => {
    const families = { squares: [Element.Square], triangles, absorbingTriangles }
    for (const [option, family] of Object.entries(families)) {
      const elements = Array.from({ length: 30 }, () =>
        generatePuzzle({ gridSize: 10, items: 40, blackHoles: false, lightWarps: false, ...noShapes, [option]: true }).elements
      ).flat()
      for (const [other, otherFamily] of Object.entries(families)) {
        expect(elements.some(element => otherFamily.includes(element))).toBe(other === option)
      }
    }
  })
})
