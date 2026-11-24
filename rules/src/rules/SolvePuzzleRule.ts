import { CustomMove, isMoveItemType, isRollItemType, ItemMove, MaterialMove, SimultaneousRule } from '@gamepark/rules-api'
import { Challenge, challenges } from '../Challenge'
import { isSolved } from '../laser/Laser'
import { Element } from '../material/Element'
import { ChronoId } from '../material/ChronoId'
import { LocationType } from '../material/LocationType'
import { MaterialType } from '../material/MaterialType'
import { PlayerColor } from '../PlayerColor'
import { CustomMoveType } from './CustomMoveType'
import { Memory } from './Memory'
import { PlayerPuzzleHelper } from './PlayerPuzzleHelper'
import { RuleId } from './RuleId'

export type Solved = { player: PlayerColor; duration: number }

/**
 * A cell locked by the player: its element cannot move any more, and nothing can be dropped on it.
 * The locks are a help of the player's interface, played as local moves: the server never knows them.
 */
export type Lock = { player: PlayerColor; x: number; y: number }

/**
 * The results of a round, displayed to the players before they start the next one and in the score table. No duration: the player gave up.
 * In a challenge, the hearts left after the round.
 */
export type RoundResults = { round: number; players: { player: PlayerColor; duration?: number; score: number }[]; hearts?: number }

/**
 * All the players solve the same puzzle, each one starting whenever they want.
 * Each action is followed by a roll of the Last chrono, so the rules know the server time of each action:
 * an action played after the time limit is a forced give up. A player is only ejected once their clock has run out,
 * so the random bot replacing them always acts too late and gives up.
 * The decisions based on hidden information (the grid is solved) are custom moves, so that every client applies them.
 */
export class SolvePuzzleRule extends SimultaneousRule<PlayerColor, MaterialType, LocationType> {
  getActivePlayerLegalMoves(player: PlayerColor) {
    const helper = new PlayerPuzzleHelper(this.game, player)
    if (!helper.hasStarted) return [this.chrono(player, ChronoId.Start).rollItem()]
    if (helper.hasGivenUp) return [this.customMove(CustomMoveType.Continue, player)]
    // Every cell but the portals and the locked cells: an element dropped on an occupied cell sends its element back to the stock
    const locked = (x: number, y: number) => helper.isLocked(x, y)
    const cells = helper.grid.flatMap((row, y) =>
      row.flatMap((element, x) => (element === Element.Portal || locked(x, y) ? [] : [{ type: LocationType.PlayerGrid, player, x, y }]))
    )
    const moves: MaterialMove<PlayerColor, MaterialType, LocationType>[] = []
    // Only the element on top of each pile of the stock can be moved: fewer legal moves keep the interface fast on big grids
    const pileTops = new Map(helper.stock.entries.map(([index, item]) => [item.id, index]))
    for (const index of pileTops.values()) {
      const mirror = this.material(MaterialType.Mirror).index(index)
      moves.push(...cells.map(location => mirror.moveItem(location)))
    }
    for (const [index, item] of helper.placedMirrors.entries) {
      if (locked(item.location.x!, item.location.y!)) continue
      const mirror = this.material(MaterialType.Mirror).index(index)
      moves.push(mirror.moveItem({ type: LocationType.PlayerStock, player }))
      moves.push(...cells.filter(({ x, y }) => x !== item.location.x || y !== item.location.y).map(location => mirror.moveItem(location)))
    }
    moves.push(this.customMove(CustomMoveType.GiveUp, player))
    return moves
  }

  beforeItemMove(move: ItemMove<PlayerColor, MaterialType, LocationType>) {
    if (!isMoveItemType(MaterialType.Mirror)(move) || move.location.type !== LocationType.PlayerGrid) return []
    // The element of the destination cell goes back to the stock (the consequences are played after the move)
    return this.material(MaterialType.Mirror)
      .location(LocationType.PlayerGrid)
      .player(move.location.player)
      .filter(({ location }) => location.x === move.location.x && location.y === move.location.y)
      .moveItems({ type: LocationType.PlayerStock, player: move.location.player })
  }

  afterItemMove(move: ItemMove<PlayerColor, MaterialType, LocationType>) {
    if (isMoveItemType(MaterialType.Mirror)(move)) {
      // An element archived at the end of a round is not a player's action
      if (move.location.type === LocationType.RoundHistory) return []
      return [this.chrono(move.location.player!, ChronoId.Last).rollItem()]
    }
    if (!isRollItemType(MaterialType.Chrono)(move)) return []
    const chrono = this.material(MaterialType.Chrono).getItem(move.itemIndex)
    const player = chrono.location.player!
    return chrono.id === ChronoId.Start ? this.revealPuzzle(player) : this.checkPlayer(player, chrono.location.rotation)
  }

  revealPuzzle(player: PlayerColor) {
    this.forget(Memory.Duration, player)
    this.forget(Memory.GivingUp, player)
    this.forget(Memory.Locks, player)
    const round = this.remind<number>(Memory.Round)
    return [
      this.material(MaterialType.Puzzle).location(LocationType.PuzzleDeck).locationId(round).player(player).moveItem({ type: LocationType.PlayerPuzzle, player, id: round }),
      this.material(MaterialType.Mirror).location(LocationType.MirrorDeck).locationId(round).player(player).moveItemsAtOnce({ type: LocationType.PlayerStock, player })
    ]
  }

  /**
   * Every player finished the round: the final grid of the player, the puzzle and its solution become public, for the history of the game.
   * The elements left in the stock are discarded.
   */
  archiveRound(player: PlayerColor, round: number) {
    const history = { type: LocationType.RoundHistory, player, id: round }
    const mirrors = this.material(MaterialType.Mirror).player(player)
    const isRound = (type: MaterialType) =>
      this.material(type)
        .player(player)
        .location(({ type, id }) => type === LocationType.PlayerPuzzle || (type === LocationType.PuzzleDeck && id === round))
    return [
      mirrors.location(LocationType.PlayerStock).deleteItemsAtOnce(),
      ...mirrors.location(LocationType.PlayerGrid).entries.map(([index, { location }]) => mirrors.index(index).moveItem({ ...history, x: location.x, y: location.y })),
      ...isRound(MaterialType.Puzzle).moveItems(history),
      ...isRound(MaterialType.Solution).moveItems(history)
    ]
  }

  checkPlayer(player: PlayerColor, now: number) {
    // An element dropped on an occupied cell sends the element of the cell back to the stock: two moves, two rolls of the chrono.
    // The player is checked once, the second roll does nothing once they solved or gave up.
    if (!this.isTurnToPlay(player) || new PlayerPuzzleHelper(this.game, player).hasGivenUp) return []
    const elapsed = now - this.chrono(player, ChronoId.Start).getItem()!.location.rotation
    // Past the time limit, the player lost even if they asked to give up: GivingUp is kept until the next round only for a real give up
    // The countdown of the player shows 0:00 at the time limit: their automatic give up of that second is a time out
    if (elapsed >= this.remind<number>(Memory.TimeLimit) * 60) {
      this.forget(Memory.GivingUp, player)
      return [this.customMove(CustomMoveType.GaveUp, player)]
    }
    if (this.remind(Memory.GivingUp, player)) return [this.customMove(CustomMoveType.GaveUp, player)]
    // The puzzle is hidden to the other players: only the server and the player can tell it is solved
    const helper = new PlayerPuzzleHelper(this.game, player)
    const puzzle = helper.puzzle
    if (puzzle && isSolved(helper.grid, puzzle.clues)) {
      return [this.customMove(CustomMoveType.Solved, { player, duration: elapsed } satisfies Solved)]
    }
    return []
  }

  onCustomMove(move: CustomMove) {
    switch (move.type) {
      case CustomMoveType.Lock: {
        const { player, x, y } = move.data as Lock
        this.memorize<Lock[]>(Memory.Locks, (locks = []) =>
          new PlayerPuzzleHelper(this.game, player).isLocked(x, y) ? locks.filter(lock => lock.x !== x || lock.y !== y) : [...locks, { player, x, y }],
          player
        )
        return []
      }
      case CustomMoveType.GiveUp:
        this.memorize(Memory.GivingUp, true, move.data)
        return [this.chrono(move.data, ChronoId.Last).rollItem()]
      case CustomMoveType.Solved: {
        const { player, duration } = move.data as Solved
        this.memorize(Memory.Duration, duration, player)
        return [this.endPlayerTurn(player)]
      }
      // The player sees the solution, and is done once they continue
      case CustomMoveType.GaveUp: {
        const round = this.remind<number>(Memory.Round)
        return [this.material(MaterialType.Solution).location(LocationType.PuzzleDeck).locationId(round).player(move.data).moveItem({ type: LocationType.PlayerPuzzle, player: move.data })]
      }
      case CustomMoveType.Continue:
        return [this.endPlayerTurn(move.data)]
    }
    return []
  }

  getMovesAfterPlayersDone() {
    const challenge = this.remind<Challenge | undefined>(Memory.Challenge)
    if (challenge) this.scoreChallenge(challenges[challenge].goal)
    else this.scoreRound()
    // The grids of the round are archived: the previous grid would be misleading while the players get ready for the next one
    const round = this.remind<number>(Memory.Round)
    const archive = this.game.players.flatMap(player => this.archiveRound(player, round))
    if (round === this.remind<number>(Memory.Rounds) || (challenge && this.isChallengeOver(challenges[challenge].goal))) {
      return [...archive, this.endGame()]
    }
    this.memorize(Memory.Round, round + 1)
    return [...archive, this.startSimultaneousRule(RuleId.SolvePuzzle)]
  }

  /**
   * The fastest players score the most, 120 points are shared over the whole game, giving up costs points.
   */
  scoreRound() {
    const durations = this.game.players.map(player => ({ player, duration: this.remind<number | undefined>(Memory.Duration, player) }))
    durations.sort((a, b) => (a.duration ?? Infinity) - (b.duration ?? Infinity))
    const scorePart = 120 / this.remind<number>(Memory.Rounds) / durations.length
    const timeLimit = this.remind<number>(Memory.TimeLimit) * 60
    let previous: { duration: number; score: number } | undefined
    const results: RoundResults = { round: this.remind(Memory.Round), players: [] }
    durations.forEach(({ player, duration }, index) => {
      let score: number
      if (duration === undefined) {
        score = -Math.floor(scorePart)
      } else if (duration === previous?.duration) {
        score = previous.score
      } else {
        score = Math.floor((durations.length - index) * scorePart)
        previous = { duration, score }
      }
      this.memorize<number>(Memory.Score, total => (total ?? 0) + score, player)
      this.memorize<number>(Memory.TotalDuration, total => (total ?? 0) + (duration ?? timeLimit), player)
      results.players.push({ player, duration, score })
    })
    this.memorize<RoundResults[]>(Memory.RoundResults, history => [...(history ?? []), results])
  }

  /**
   * A solved puzzle scores a point, a failure costs a heart. Halfway to the goal, the player wins a heart.
   */
  scoreChallenge(goal: number) {
    const player = this.game.players[0]
    const duration = this.remind<number | undefined>(Memory.Duration, player)
    const score = duration === undefined ? 0 : 1
    const solved = this.memorize<number>(Memory.Score, total => (total ?? 0) + score, player)
    if (!score) this.memorize<number>(Memory.Hearts, hearts => hearts - 1)
    else if (solved * 2 === goal) this.memorize<number>(Memory.Hearts, hearts => hearts + 1)
    const hearts = this.remind<number>(Memory.Hearts)
    this.memorize<RoundResults[]>(Memory.RoundResults, history => [...(history ?? []), { round: this.remind(Memory.Round), players: [{ player, duration, score }], hearts }])
  }

  isChallengeOver(goal: number) {
    return this.remind<number>(Memory.Hearts) < 0 || this.remind<number>(Memory.Score, this.game.players[0]) === goal
  }

  chrono(player: PlayerColor, id: ChronoId) {
    return this.material(MaterialType.Chrono).player(player).id(id)
  }
}
