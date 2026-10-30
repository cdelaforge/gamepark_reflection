import { describe, expect, test } from 'vitest'
import { Element } from '../material/Element'
import { SpecialShapes } from '../SpecialShapes'
import { createEmptyGrid, getClues, isSolved, Side, traceLaser } from './Laser'
import { generatePuzzle } from './PuzzleGenerator'

describe('Laser', () => {
  test('a small grid gets no more elements than free cells', () => {
    const options = { gridSize: 4, items: 30, blackHoles: false, specialShapes: SpecialShapes.None }
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
      const options = { gridSize: 8, items: 15, blackHoles: true, lightWarps: true, specialShapes: SpecialShapes.SquaresAndTriangles }
      const { puzzle, elements, solution } = generatePuzzle(options)
      expect(elements).toHaveLength(15)
      expect(puzzle.portals).toHaveLength(2)
      expect(isSolved(solution, puzzle.clues)).toBe(true)
      expect(getClues(createEmptyGrid(8, puzzle.portals))).not.toEqual(puzzle.clues)
    }
  })
})
