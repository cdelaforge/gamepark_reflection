import {
  CompetitiveScore,
  hideItemId,
  hideItemIdToOthers,
  isMoveItemType,
  MaterialGame,
  MaterialMove,
  RollItem,
  SecretMaterialRules,
  TimeLimit
} from '@gamepark/rules-api'
import { LocationType } from './material/LocationType'
import { MaterialType } from './material/MaterialType'
import { PlayerColor } from './PlayerColor'
import { Memory } from './rules/Memory'
import { RuleId } from './rules/RuleId'
import { SolvePuzzleRule } from './rules/SolvePuzzleRule'

/**
 * This class implements the rules of the board game.
 * It must follow Game Park "Rules" API so that the Game Park server can enforce the rules.
 */
export class ReflectionRules
  extends SecretMaterialRules<PlayerColor, MaterialType, LocationType>
  implements
  TimeLimit<MaterialGame<PlayerColor, MaterialType, LocationType>, MaterialMove<PlayerColor, MaterialType, LocationType>, PlayerColor>,
  CompetitiveScore<MaterialGame<PlayerColor, MaterialType, LocationType>, MaterialMove<PlayerColor, MaterialType, LocationType>, PlayerColor> {
  rules = {
    [RuleId.SolvePuzzle]: SolvePuzzleRule
  }

  locationsStrategies = {}

  /**
   * The puzzles and the elements of the next rounds are hidden to everyone, the current ones only to the other players.
   * The position of the elements is hidden by keepMoveSecret.
   */
  hidingStrategies = {
    [MaterialType.Puzzle]: {
      [LocationType.PuzzleDeck]: hideItemId,
      [LocationType.PlayerPuzzle]: hideItemIdToOthers
    },
    // The solution is revealed to a player when they give up
    [MaterialType.Solution]: {
      [LocationType.PuzzleDeck]: hideItemId,
      [LocationType.PlayerPuzzle]: hideItemIdToOthers
    },
    [MaterialType.Mirror]: {
      [LocationType.MirrorDeck]: hideItemId,
      [LocationType.PlayerStock]: hideItemIdToOthers,
      [LocationType.PlayerGrid]: hideItemIdToOthers
    }
  }

  /**
   * Where a player places their elements is a hint for the other players: the moves of a player solving the puzzle are kept secret until they are done.
   * The platform checks again after each action, and sends the moves it kept secret, in order, before the action. The action that ends the round
   * of the player is never secret: the other players learn the player is done at the same time as their moves.
   */
  keepMoveSecret(move: MaterialMove<PlayerColor, MaterialType, LocationType>, player: PlayerColor) {
    if (!isMoveItemType(MaterialType.Mirror)(move)) return false
    const mover = move.location.player!
    return mover !== player && this.game.rule?.id === RuleId.SolvePuzzle && this.isTurnToPlay(mover)
  }

  /**
   * randomize() only runs on the server and the result is saved with the move: rolling a chrono stamps the server time in seconds.
   */
  roll(move: RollItem<PlayerColor, MaterialType, LocationType>) {
    return move.itemType === MaterialType.Chrono ? Math.floor(Date.now() / 1000) : super.roll(move)
  }

  /**
   * Enough time to solve a puzzle before the player can be ejected
   */
  giveTime(): number {
    return this.remind<number>(Memory.TimeLimit) * 60 + 60
  }

  getScore(player: PlayerColor) {
    return this.remind<number | undefined>(Memory.Score, player) ?? 0
  }

  /**
   * The fastest player over all the rounds wins a tie
   */
  getTieBreaker(tieBreaker: number, player: PlayerColor) {
    if (tieBreaker === 1) return -(this.remind<number | undefined>(Memory.TotalDuration, player) ?? 0)
    return
  }
}
