import { CustomMove, isMoveItemType, isRollItemType, isSelectItemType, ItemMove, MaterialMove, MoveItem, SimultaneousRule } from '@gamepark/rules-api'
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
    const locked = this.isLocked(player)
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
    if (!isMoveItemType(MaterialType.Mirror)(move)) return []
    this.moveSelection(move)
    if (move.location.type !== LocationType.PlayerGrid) return []
    // The element of the destination cell goes back to the stock (the consequences are played after the move)
    return this.material(MaterialType.Mirror)
      .location(LocationType.PlayerGrid)
      .player(move.location.player)
      .filter(({ location }) => location.x === move.location.x && location.y === move.location.y)
      .moveItems({ type: LocationType.PlayerStock, player: move.location.player })
  }

  afterItemMove(move: ItemMove<PlayerColor, MaterialType, LocationType>) {
    if (isSelectItemType(MaterialType.Mirror)(move) && move.selected !== false) {
      // Selecting is a local move of the user interface: only one element is selected at a time
      return this.material(MaterialType.Mirror)
        .selected()
        .index(index => index !== move.itemIndex)
        .unselectItems()
    }
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

  /**
   * The selection follows the moves: once an element of the stock is placed, the next one of the same pile is selected,
   * and an element sent back to the stock becomes the selection. A move inside the grid keeps the selection.
   * The selection only exists in the player's interface, never on the server: it is changed directly, a consequence move
   * would differ from the server's consequences.
   */
  moveSelection(move: MoveItem<PlayerColor, MaterialType, LocationType>) {
    const mirrors = this.material(MaterialType.Mirror)
    const selected = mirrors.selected()
    const item = mirrors.getItem(move.itemIndex)
    const fromStock = item.location.type === LocationType.PlayerStock
    if (!selected.length || (!fromStock && move.location.type === LocationType.PlayerGrid)) return
    for (const mirror of selected.getItems()) delete mirror.selected
    // Only the top of a pile can be moved: the element with the highest index
    const pile = new PlayerPuzzleHelper(this.game, move.location.player!).stock.id(item.id).index(index => index !== move.itemIndex).getIndexes()
    const top = fromStock ? pile.pop() : Math.max(...pile, move.itemIndex)
    if (top !== undefined) mirrors.getItem(top).selected = true
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
    const elapsed = now - this.chrono(player, ChronoId.Start).getItem()!.location.rotation
    // Past the time limit, the player lost even if they asked to give up: GivingUp is kept until the next round only for a real give up
    if (elapsed > this.remind<number>(Memory.TimeLimit) * 60) {
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
    if (move.type === CustomMoveType.Solved || move.type === CustomMoveType.GaveUp) {
      // The player is done: their selection cannot be changed any more
      const player = move.type === CustomMoveType.Solved ? (move.data as Solved).player : move.data
      for (const mirror of this.material(MaterialType.Mirror).player(player).selected().getItems()) delete mirror.selected
    }
    switch (move.type) {
      case CustomMoveType.Lock: {
        const { player, x, y } = move.data as Lock
        this.memorize<Lock[]>(Memory.Locks, (locks = []) =>
          this.isLocked(player)(x, y) ? locks.filter(lock => lock.x !== x || lock.y !== y) : [...locks, { player, x, y }],
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

  isLocked(player: PlayerColor) {
    const locks = this.remind<Lock[] | undefined>(Memory.Locks, player) ?? []
    return (x: number, y: number) => locks.some(lock => lock.x === x && lock.y === y)
  }

  chrono(player: PlayerColor, id: ChronoId) {
    return this.material(MaterialType.Chrono).player(player).id(id)
  }
}
