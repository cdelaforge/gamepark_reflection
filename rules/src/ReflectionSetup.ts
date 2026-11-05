import { getEnumValues, MaterialGameSetup } from '@gamepark/rules-api'
import { challenges, maxPuzzles, START_HEARTS } from './Challenge'
import { ReflectionOptions } from './ReflectionOptions'
import { ReflectionRules } from './ReflectionRules'
import { GeneratedPuzzle, generatePuzzle, PuzzleOptions } from './laser/PuzzleGenerator'
import { ChronoId } from './material/ChronoId'
import { LocationType } from './material/LocationType'
import { MaterialType } from './material/MaterialType'
import { PlayerColor } from './PlayerColor'
import { Memory } from './rules/Memory'
import { RuleId } from './rules/RuleId'

/**
 * This class creates a new Game based on the game options.
 * The setup runs on the server only: all the random puzzles are generated here, hidden until each player starts the round.
 */
export class ReflectionSetup extends MaterialGameSetup<PlayerColor, MaterialType, LocationType, ReflectionOptions> {
  Rules = ReflectionRules

  setupMaterial(options: ReflectionOptions) {
    // A challenge forces harder puzzles, and lasts as long as the player succeeds: enough puzzles are prepared for the longest one
    const challenge = options.challenge ? challenges[options.challenge] : undefined
    const items = Math.max(options.items, challenge?.items ?? 0)
    const timeLimit = Math.min(options.timeLimit, challenge?.timeLimit ?? Infinity)
    const rounds = challenge ? maxPuzzles(challenge.goal) : options.rounds!
    this.memorize(Memory.GridSize, options.gridSize)
    this.memorize(Memory.TimeLimit, timeLimit)
    this.memorize(Memory.Rounds, rounds)
    if (options.challenge) {
      this.memorize(Memory.Challenge, options.challenge)
      this.memorize(Memory.Hearts, START_HEARTS)
    }
    for (let round = 1; round <= rounds; round++) {
      const { puzzle, elements, solution } = this.generatePuzzle({ ...options, items })
      for (const player of this.players) {
        this.material(MaterialType.Puzzle).createItem({ id: puzzle, location: { type: LocationType.PuzzleDeck, id: round, player } })
        this.material(MaterialType.Solution).createItem({ id: solution, location: { type: LocationType.PuzzleDeck, id: round, player } })
        this.material(MaterialType.Mirror).createItems(elements.map(id => ({ id, location: { type: LocationType.MirrorDeck, id: round, player } })))
      }
    }
    this.material(MaterialType.Chrono).createItems(
      this.players.flatMap(player => getEnumValues(ChronoId).map(id => ({ id, location: { type: LocationType.PlayerChrono, player } })))
    )
  }

  /**
   * A random puzzle, the same for every player. The tutorial overrides it with a scripted puzzle.
   */
  generatePuzzle(options: PuzzleOptions): GeneratedPuzzle {
    return generatePuzzle(options)
  }

  start() {
    this.memorize(Memory.Round, 1)
    this.startSimultaneousRule(RuleId.SolvePuzzle)
  }
}
