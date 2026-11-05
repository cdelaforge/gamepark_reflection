import { getClues, Grid } from '@gamepark/reflection/laser/Laser'
import { GeneratedPuzzle } from '@gamepark/reflection/laser/PuzzleGenerator'
import { Element } from '@gamepark/reflection/material/Element'
import { ReflectionSetup } from '@gamepark/reflection/ReflectionSetup'

/**
 * The scripted puzzle of the tutorial: each element explains a short clue, so the player finds them one by one.
 * grid[row][col]: the tutorial moves place the elements at x = col, y = row.
 */
export const tutorialSolution: Grid = [
  [0, 0, 0, 0, 0],
  [0, Element.Slash, 0, 0, Element.BackSlash],
  [0, 0, 0, Element.BlackHole, 0],
  [Element.Vertical, 0, 0, 0, 0],
  [0, 0, Element.Slash, 0, 0]
]

export class TutorialSetup extends ReflectionSetup {
  generatePuzzle(): GeneratedPuzzle {
    const elements = tutorialSolution.flat().filter(element => element !== 0)
    return { puzzle: { clues: getClues(tutorialSolution) }, elements, solution: tutorialSolution }
  }
}
