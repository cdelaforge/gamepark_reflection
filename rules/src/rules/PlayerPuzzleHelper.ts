import { Material, MaterialGame, MaterialRulesPart } from '@gamepark/rules-api'
import { createEmptyGrid, Grid } from '../laser/Laser'
import { Puzzle } from '../laser/PuzzleGenerator'
import { LocationType } from '../material/LocationType'
import { MaterialType } from '../material/MaterialType'
import { PlayerColor } from '../PlayerColor'
import { Memory } from './Memory'

/**
 * The current puzzle of a player and their grid. Shared by the rules and the user interface.
 */
export class PlayerPuzzleHelper extends MaterialRulesPart<PlayerColor, MaterialType, LocationType> {
  constructor(
    game: MaterialGame<PlayerColor, MaterialType, LocationType>,
    readonly player: PlayerColor
  ) {
    super(game)
  }

  get gridSize() {
    return this.remind<number>(Memory.GridSize)
  }

  /**
   * undefined as long as the player has not started the round (or for other players: the puzzle is hidden)
   */
  get puzzle(): Puzzle | undefined {
    // A hidden id is an empty object, not undefined
    const puzzle = this.material(MaterialType.Puzzle).location(LocationType.PlayerPuzzle).player(this.player).getItem<Puzzle>()?.id
    return puzzle?.clues ? puzzle : undefined
  }

  /**
   * The solution, once the player gave up (undefined for the other players: a hidden grid has undefined rows)
   */
  get solution(): Grid | undefined {
    const solution = this.material(MaterialType.Solution).location(LocationType.PlayerPuzzle).player(this.player).getItem<Grid>()?.id
    return Array.isArray(solution?.[0]) ? solution : undefined
  }

  /**
   * The previous round stays on display until the player starts the current one
   */
  get hasStarted() {
    return this.material(MaterialType.Puzzle).location(LocationType.PlayerPuzzle).player(this.player).locationId(this.remind(Memory.Round)).length > 0
  }

  get stock() {
    return this.material(MaterialType.Mirror).location(LocationType.PlayerStock).player(this.player)
  }

  get placedMirrors() {
    return this.material(MaterialType.Mirror).location(LocationType.PlayerGrid).player(this.player)
  }

  get grid(): Grid {
    return this.fillGrid(this.puzzle, this.placedMirrors)
  }

  /**
   * A round of the player, once every player finished it: their final grid, the puzzle and its solution
   */
  getRound(round: number): { puzzle?: Puzzle; grid: Grid; solution?: Grid } {
    const history = (type: MaterialType) => this.material(type).location(LocationType.RoundHistory).player(this.player).locationId(round)
    const puzzle = history(MaterialType.Puzzle).getItem<Puzzle>()?.id
    return { puzzle, grid: this.fillGrid(puzzle, history(MaterialType.Mirror)), solution: history(MaterialType.Solution).getItem<Grid>()?.id }
  }

  private fillGrid(puzzle: Puzzle | undefined, mirrors: Material<PlayerColor, MaterialType, LocationType>) {
    const grid = createEmptyGrid(this.gridSize, puzzle?.portals)
    for (const mirror of mirrors.getItems()) {
      grid[mirror.location.y!][mirror.location.x!] = mirror.id
    }
    return grid
  }
}
