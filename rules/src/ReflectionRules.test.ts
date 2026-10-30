import {
  applyAutomaticMoves,
  CustomMove,
  isCustomMoveType,
  isMoveItem,
  MaterialGame,
  MaterialMove,
  playAction,
  playActionWithViews,
  RandomBot,
  replayActions
} from '@gamepark/rules-api'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { ReflectionRules } from './ReflectionRules'
import { ReflectionSetup } from './ReflectionSetup'
import { Challenge } from './Challenge'
import { createEmptyGrid, getClues } from './laser/Laser'
import { Element } from './material/Element'
import { LocationType } from './material/LocationType'
import { MaterialType } from './material/MaterialType'
import { PlayerColor } from './PlayerColor'
import { CustomMoveType } from './rules/CustomMoveType'
import { Memory } from './rules/Memory'
import { PlayerPuzzleHelper } from './rules/PlayerPuzzleHelper'
import { SpecialShapes } from './SpecialShapes'

type Move = MaterialMove<PlayerColor, MaterialType, LocationType>

// A known solution, so that the tests can solve the puzzle: the setup puzzles are replaced by this one
const solution = createEmptyGrid(4)
solution[0][1] = Element.Slash
solution[2][2] = Element.BackSlash
solution[3][0] = Element.Square
const elements = [Element.Slash, Element.BackSlash, Element.Square]

const newGame = (rounds = 1, challenge?: Challenge) => {
  const game = new ReflectionSetup().setup({
    players: challenge ? [{ id: PlayerColor.Blue }] : [{ id: PlayerColor.Blue }, { id: PlayerColor.Red }],
    challenge,
    gridSize: 4,
    items: 3,
    blackHoles: false,
    lightWarps: false,
    specialShapes: SpecialShapes.None,
    timeLimit: 10,
    rounds
  })
  for (const puzzle of game.items[MaterialType.Puzzle]!) puzzle.id = { clues: getClues(solution) }
  for (const item of game.items[MaterialType.Solution]!) item.id = solution
  game.items[MaterialType.Mirror]!.forEach((mirror, index) => (mirror.id = elements[index % 3]))
  return game as MaterialGame<PlayerColor, MaterialType, LocationType>
}

const at = (time: string) => vi.setSystemTime(new Date(`2026-11-02T${time}Z`))

/**
 * Plays an action like the server: the views of the moves for each player are computed when each move is played
 */
const play = (rules: ReflectionRules, player: PlayerColor, predicate: (move: Move) => boolean = () => true) => {
  const move = rules.getLegalMoves(player).find(predicate)
  if (!move) throw new Error('No such legal move')
  const { action, views } = playActionWithViews(rules, move, player, rules.players, '')
  return { ...action, views }
}

const giveUp = (move: Move) => isCustomMoveType(CustomMoveType.GiveUp)(move)

/**
 * The moves that place the elements of the solution, one by one
 */
const solutionMoves = (rules: ReflectionRules) =>
  solution.flatMap((cells, y) =>
    cells.flatMap((element, x) =>
      element
        ? [
            (move: Move) =>
              isMoveItem(move) &&
              move.location.type === LocationType.PlayerGrid &&
              move.location.x === x &&
              move.location.y === y &&
              rules.material(MaterialType.Mirror).getItem(move.itemIndex).id === element
          ]
        : []
    )
  )

const solve = (rules: ReflectionRules, player: PlayerColor) => solutionMoves(rules).map(predicate => play(rules, player, predicate))

describe('Reflection rules', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  test('the fastest player wins, each one timed from their own start', () => {
    const game = newGame()
    const initialGame = JSON.parse(JSON.stringify(game))
    const rules = new ReflectionRules(game)

    // Turn-based: Red plays first and solves in 8 minutes, Blue only starts later and solves in 100 seconds
    at('10:00:00')
    const actions = [play(rules, PlayerColor.Red)]
    at('10:08:00')
    actions.push(...solve(rules, PlayerColor.Red))
    at('15:30:00')
    actions.push(play(rules, PlayerColor.Blue))
    at('15:31:40')
    actions.push(...solve(rules, PlayerColor.Blue))

    expect(rules.isOver()).toBe(true)
    expect(rules.getScore(PlayerColor.Blue)).toBe(120)
    expect(rules.getScore(PlayerColor.Red)).toBe(60)

    // The stored server times are used when replaying, not the current time
    at('23:00:00')
    const replay = new ReflectionRules(initialGame)
    replayActions(replay, actions)
    expect(replay.getScore(PlayerColor.Blue)).toBe(120)
    expect(replay.getTieBreaker(1, PlayerColor.Blue)).toBe(-100)
    expect(replay.getTieBreaker(1, PlayerColor.Red)).toBe(-480)
  })

  test('giving up costs points, solving after the time limit is a give up', () => {
    const rules = new ReflectionRules(newGame())
    at('10:00:00')
    play(rules, PlayerColor.Blue)
    play(rules, PlayerColor.Blue, giveUp)
    play(rules, PlayerColor.Red)
    at('10:10:01')
    play(rules, PlayerColor.Red, move => isMoveItem(move))

    expect(rules.isOver()).toBe(true)
    expect(rules.getScore(PlayerColor.Blue)).toBe(-60)
    expect(rules.getScore(PlayerColor.Red)).toBe(-60)
    expect(rules.getTieBreaker(1, PlayerColor.Red)).toBe(-600)
  })

  test('the random bot replacing an ejected player gives up with its first action', () => {
    const rules = new ReflectionRules(newGame())
    at('10:00:00')
    play(rules, PlayerColor.Red)
    solve(rules, PlayerColor.Red)
    play(rules, PlayerColor.Blue)

    // Blue leaves, their clock runs out, they are ejected and replaced by the platform random bot
    at('10:15:00')
    const [botMove] = new RandomBot(ReflectionRules, PlayerColor.Blue).run(rules.game)
    playAction(rules, botMove, PlayerColor.Blue)

    expect(rules.isOver()).toBe(true)
    expect(rules.getScore(PlayerColor.Blue)).toBe(-60)
  })

  test('a new puzzle is revealed at each round', () => {
    const rules = new ReflectionRules(newGame(3))
    at('10:00:00')
    for (const player of [PlayerColor.Blue, PlayerColor.Red]) {
      play(rules, player)
      play(rules, player, giveUp)
    }

    expect(rules.isOver()).toBe(false)
    expect(rules.remind(Memory.Round)).toBe(2)
    expect(new PlayerPuzzleHelper(rules.game, PlayerColor.Blue).hasStarted).toBe(false)
    expect(rules.getLegalMoves(PlayerColor.Blue)).toHaveLength(1)
    play(rules, PlayerColor.Blue)
    expect(rules.material(MaterialType.Mirror).location(LocationType.PlayerStock).player(PlayerColor.Blue).length).toBe(3)
    expect(new PlayerPuzzleHelper(rules.game, PlayerColor.Blue).solution).toBeUndefined()
  })

  test('the time of a solved round stays on display until the player starts the next round', () => {
    const rules = new ReflectionRules(newGame(3))
    at('10:00:00')
    play(rules, PlayerColor.Red)
    play(rules, PlayerColor.Red, giveUp)
    play(rules, PlayerColor.Blue)
    at('10:01:23')
    solve(rules, PlayerColor.Blue)

    expect(rules.remind(Memory.Round)).toBe(2)
    expect(rules.remind(Memory.Duration, PlayerColor.Blue)).toBe(83)
    expect(rules.remind(Memory.RoundResults)).toEqual([
      {
        round: 1,
        players: [
          { player: PlayerColor.Blue, duration: 83, score: 40 },
          { player: PlayerColor.Red, duration: undefined, score: -20 }
        ]
      }
    ])
    play(rules, PlayerColor.Blue)
    expect(rules.remind(Memory.Duration, PlayerColor.Blue)).toBeUndefined()
  })

  test('the solution is revealed to a player who gives up, and only to them', () => {
    const rules = new ReflectionRules(newGame())
    at('10:00:00')
    play(rules, PlayerColor.Blue)
    const redClient = new ReflectionRules(rules.getPlayerView(PlayerColor.Red), { player: PlayerColor.Red })
    for (const action of [play(rules, PlayerColor.Blue, giveUp)]) {
      for (const move of [action.move, ...action.consequences]) redClient.play(rules.getPlayerMoveView(move, PlayerColor.Red))
    }
    const blueView = new ReflectionRules(rules.getPlayerView(PlayerColor.Blue))
    expect(new PlayerPuzzleHelper(blueView.game, PlayerColor.Blue).solution).toEqual(solution)
    expect(new PlayerPuzzleHelper(redClient.game, PlayerColor.Blue).solution).toBeUndefined()
    expect(new PlayerPuzzleHelper(rules.getPlayerView(PlayerColor.Red), PlayerColor.Blue).solution).toBeUndefined()
  })

  test('at the end of the game, every player can see the grids and the solutions of every round', () => {
    const rules = new ReflectionRules(newGame(3))
    // A copy, as sent to the player: the view shares the memory of the server
    const redClient = new ReflectionRules(JSON.parse(JSON.stringify(rules.getPlayerView(PlayerColor.Red))), { player: PlayerColor.Red })
    at('10:00:00')
    for (let round = 1; round <= 3; round++) {
      const actions = [play(rules, PlayerColor.Blue), ...solve(rules, PlayerColor.Blue), play(rules, PlayerColor.Red), play(rules, PlayerColor.Red, giveUp)]
      for (const { views } of actions) {
        const { move, consequences } = views.find(view => view.recipient === PlayerColor.Red)!.action
        for (const moveView of [move, ...consequences]) redClient.play(moveView)
      }
    }
    expect(rules.isOver()).toBe(true)
    expect(redClient.isOver()).toBe(true)
    expect(rules.remind<unknown[]>(Memory.RoundResults)).toHaveLength(3)
    expect(redClient.remind(Memory.RoundResults)).toEqual(rules.remind(Memory.RoundResults))

    // The other player's grids are revealed by the moves, as well as in the view of a player who reloads the game
    for (const redView of [redClient.game, rules.getPlayerView(PlayerColor.Red)]) {
      for (let round = 1; round <= 3; round++) {
        const blueRound = new PlayerPuzzleHelper(redView, PlayerColor.Blue).getRound(round)
      expect(blueRound.grid).toEqual(solution)
      expect(blueRound.solution).toEqual(solution)
        expect(blueRound.puzzle?.clues).toEqual(getClues(solution))
      }
    }
  })

  test('the moves of a player are kept secret to the other players until they are done', () => {
    const rules = new ReflectionRules(newGame())
    const redClient = new ReflectionRules(JSON.parse(JSON.stringify(rules.getPlayerView(PlayerColor.Red))), { player: PlayerColor.Red })
    // Like the platform: after each action, the actions kept secret so far are sent to Red when they are not secret any more, then the new one
    const secrets: ReturnType<typeof play>[] = []
    const send = (action: ReturnType<typeof play>) => {
      for (const secret of [...secrets]) {
        if (rules.keepMoveSecret(secret.move, PlayerColor.Red)) continue
        secrets.splice(secrets.indexOf(secret), 1)
        sendToRed(secret)
      }
      if (rules.keepMoveSecret(action.move, PlayerColor.Red)) secrets.push(action)
      else sendToRed(action)
    }
    const sendToRed = ({ views }: ReturnType<typeof play>) => {
      const { move, consequences } = views.find(view => view.recipient === PlayerColor.Red)!.action
      for (const moveView of [move, ...consequences]) redClient.play(moveView)
    }
    at('10:00:00')
    send(play(rules, PlayerColor.Blue))
    const [first, second, last] = solutionMoves(rules)
    const firstAction = play(rules, PlayerColor.Blue, first)
    expect(rules.keepMoveSecret(firstAction.move, PlayerColor.Red)).toBe(true)
    expect(rules.keepMoveSecret(firstAction.move, PlayerColor.Blue)).toBe(false)
    send(firstAction)
    send(play(rules, PlayerColor.Blue, second))
    expect(redClient.material(MaterialType.Mirror).location(LocationType.PlayerGrid).length).toBe(0)

    // Blue solves the puzzle with their last move: Red receives all the moves of Blue
    send(play(rules, PlayerColor.Blue, last))
    expect(secrets).toHaveLength(0)
    expect(redClient.material(MaterialType.Mirror).location(LocationType.PlayerGrid).length).toBe(3)
    send(play(rules, PlayerColor.Red))
    send(play(rules, PlayerColor.Red, giveUp))
    expect(redClient.isOver()).toBe(true)
    expect(redClient.game.memory).toEqual(rules.game.memory)
  })

  test('the puzzle and the mirrors are hidden to the other players', () => {
    const rules = new ReflectionRules(newGame())
    at('10:00:00')
    play(rules, PlayerColor.Blue)
    play(rules, PlayerColor.Blue, move => isMoveItem(move))

    const redView = new ReflectionRules(rules.getPlayerView(PlayerColor.Red))
    expect(redView.material(MaterialType.Puzzle).location(LocationType.PlayerPuzzle).getItem()?.id.clues).toBeUndefined()
    expect(redView.material(MaterialType.Mirror).player(PlayerColor.Blue).getItems().every(mirror => mirror.id === undefined)).toBe(true)
    expect(redView.material(MaterialType.Puzzle).location(LocationType.PuzzleDeck).getItem()?.id.clues).toBeUndefined()

    const blueView = new ReflectionRules(rules.getPlayerView(PlayerColor.Blue))
    expect(blueView.material(MaterialType.Puzzle).location(LocationType.PlayerPuzzle).getItem()?.id.clues).toBeDefined()
  })

  test("a player's client can replay the other player's actions without seeing their puzzle", () => {
    const rules = new ReflectionRules(newGame())
    at('10:00:00')
    play(rules, PlayerColor.Blue)
    const redClient = new ReflectionRules(rules.getPlayerView(PlayerColor.Red), { player: PlayerColor.Red })
    for (const action of solve(rules, PlayerColor.Blue)) {
      for (const move of [action.move, ...action.consequences]) {
        expect(() => redClient.play(rules.getPlayerMoveView(move, PlayerColor.Red))).not.toThrow()
      }
    }
    expect(redClient.isTurnToPlay(PlayerColor.Blue)).toBe(false)
  })

  test('only one element is selected at a time', () => {
    const rules = new ReflectionRules(newGame())
    at('10:00:00')
    play(rules, PlayerColor.Blue)
    const [first, second] = rules.material(MaterialType.Mirror).location(LocationType.PlayerStock).player(PlayerColor.Blue).getIndexes()
    for (const index of [first, second]) {
      applyAutomaticMoves(rules, [rules.material(MaterialType.Mirror).index(index).selectItem()], undefined, { local: true })
    }
    expect(rules.material(MaterialType.Mirror).selected().getIndexes()).toEqual([second])
    // Dragging an element of another pile selects its pile (here emptied: nothing is selected)
    play(rules, PlayerColor.Blue, move => isMoveItem(move) && move.itemIndex === first)
    expect(rules.material(MaterialType.Mirror).selected().length).toBe(0)
  })

  test('the selection follows the moves: next element of the same pile, then the element sent back to the stock', () => {
    const game = newGame()
    game.items[MaterialType.Mirror]!.forEach(mirror => (mirror.id = Element.Slash))
    const rules = new ReflectionRules(game)
    at('10:00:00')
    play(rules, PlayerColor.Blue)
    const stock = () => rules.material(MaterialType.Mirror).location(LocationType.PlayerStock).player(PlayerColor.Blue)
    const [, second, top] = stock().getIndexes()
    applyAutomaticMoves(rules, [rules.material(MaterialType.Mirror).index(top).selectItem()], undefined, { local: true })
    play(rules, PlayerColor.Blue, move => isMoveItem(move) && move.itemIndex === top && move.location.type === LocationType.PlayerGrid)
    expect(rules.material(MaterialType.Mirror).selected().getIndexes()).toEqual([second])
    play(rules, PlayerColor.Blue, move => isMoveItem(move) && move.itemIndex === top && move.location.type === LocationType.PlayerStock)
    expect(rules.material(MaterialType.Mirror).selected().getIndexes()).toEqual([top])

    // Moving an element inside the grid keeps the selection
    play(rules, PlayerColor.Blue, move => isMoveItem(move) && move.itemIndex === top && move.location.type === LocationType.PlayerGrid)
    play(rules, PlayerColor.Blue, move => isMoveItem(move) && move.itemIndex === top && move.location.type === LocationType.PlayerGrid)
    expect(rules.material(MaterialType.Mirror).selected().getIndexes()).toEqual([second])

    // Once the player is done, nothing stays selected
    play(rules, PlayerColor.Blue, giveUp)
    expect(rules.material(MaterialType.Mirror).selected().length).toBe(0)
  })

  test('an element dropped on an occupied cell swaps places with its element', () => {
    const rules = new ReflectionRules(newGame())
    at('10:00:00')
    play(rules, PlayerColor.Blue)
    const [slash, backSlash, square] = rules.material(MaterialType.Mirror).location(LocationType.PlayerStock).player(PlayerColor.Blue).getIndexes()
    const cell = (x: number, y: number) => ({ type: LocationType.PlayerGrid, player: PlayerColor.Blue, x, y })
    const moveTo = (index: number, location: Partial<ReturnType<typeof cell>>) => (move: Move) =>
      isMoveItem(move) && move.itemIndex === index && Object.entries(location).every(([key, value]) => move.location[key as 'x'] === value)
    const location = (index: number) => rules.material(MaterialType.Mirror).getItem(index).location
    play(rules, PlayerColor.Blue, moveTo(slash, cell(0, 0)))
    play(rules, PlayerColor.Blue, moveTo(backSlash, cell(1, 1)))

    // From the grid to an occupied cell: the elements swap their cells
    play(rules, PlayerColor.Blue, moveTo(slash, cell(1, 1)))
    expect(location(slash)).toMatchObject({ x: 1, y: 1 })
    expect(location(backSlash)).toMatchObject({ x: 0, y: 0 })

    // From the stock to an occupied cell: the element of the cell goes back to the stock
    play(rules, PlayerColor.Blue, moveTo(square, cell(1, 1)))
    expect(location(square)).toMatchObject({ x: 1, y: 1 })
    expect(location(slash).type).toBe(LocationType.PlayerStock)
  })

  test('a solved grid is announced with a custom move every client can apply', () => {
    const rules = new ReflectionRules(newGame())
    at('10:00:00')
    play(rules, PlayerColor.Blue)
    const lastAction = solve(rules, PlayerColor.Blue).pop()!
    expect(lastAction.consequences.some(move => isCustomMoveType(CustomMoveType.Solved)(move))).toBe(true)
    expect((lastAction.consequences.find(isCustomMoveType(CustomMoveType.Solved)) as CustomMove).data).toEqual({ player: PlayerColor.Blue, duration: 0 })
  })

  describe('solo challenge', () => {
    const fail = (rules: ReflectionRules) => {
      play(rules, PlayerColor.Blue)
      play(rules, PlayerColor.Blue, giveUp)
    }
    const succeed = (rules: ReflectionRules) => {
      play(rules, PlayerColor.Blue)
      solve(rules, PlayerColor.Blue)
    }

    test('the challenge is won once enough puzzles are solved, a failure costs the heart', () => {
      const rules = new ReflectionRules(newGame(undefined, Challenge.Easy))
      at('10:00:00')
      fail(rules)
      expect(rules.remind(Memory.Hearts)).toBe(0)
      succeed(rules)
      succeed(rules)
      expect(rules.isOver()).toBe(false)
      succeed(rules)
      expect(rules.isOver()).toBe(true)
      expect(rules.getScore(PlayerColor.Blue)).toBe(3)
      expect(rules.remind(Memory.RoundResults).map((results: { hearts: number }) => results.hearts)).toEqual([0, 0, 0, 0])
    })

    test('a failure without any heart left loses the challenge', () => {
      const rules = new ReflectionRules(newGame(undefined, Challenge.Easy))
      at('10:00:00')
      succeed(rules)
      fail(rules)
      fail(rules)
      expect(rules.isOver()).toBe(true)
      expect(rules.remind(Memory.Hearts)).toBe(-1)
      expect(rules.getScore(PlayerColor.Blue)).toBe(1)
    })

    test('halfway to the goal, the player wins a heart, and the challenge forces harder puzzles', () => {
      const rules = new ReflectionRules(newGame(undefined, Challenge.Medium))
      expect(rules.remind(Memory.TimeLimit)).toBe(10)
      expect(rules.material(MaterialType.Mirror).location(LocationType.MirrorDeck).locationId(1).length).toBe(10)
      at('10:00:00')
      for (let i = 0; i < 3; i++) succeed(rules)
      expect(rules.remind(Memory.Hearts)).toBe(2)
      fail(rules)
      fail(rules)
      expect(rules.isOver()).toBe(false)
      for (let i = 0; i < 3; i++) succeed(rules)
      expect(rules.isOver()).toBe(true)
    })
  })
})
