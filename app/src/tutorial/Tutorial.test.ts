import { LocationType } from '@gamepark/reflection/material/LocationType'
import { MaterialType } from '@gamepark/reflection/material/MaterialType'
import { PlayerColor } from '@gamepark/reflection/PlayerColor'
import { ReflectionRules } from '@gamepark/reflection/ReflectionRules'
import { MaterialGame, playAction } from '@gamepark/rules-api'
import { expect, test, vi } from 'vitest'
import { Tutorial } from './Tutorial'

// The user interface needs a browser: only the base class of the tutorial is needed here
vi.mock('@gamepark/react-game', () => ({ MaterialTutorial: class {} }))

test('the scripted moves of the tutorial can all be played, and the player wins', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-05T10:00:00Z'))
  const tutorial = new Tutorial()
  const game = tutorial.setup.setup(tutorial.options) as MaterialGame<PlayerColor, MaterialType, LocationType>
  const rules = new ReflectionRules(game)
  for (const step of tutorial.steps) {
    if (!step.move) continue
    // Reading the popups takes time: the opponent starts first and finishes last
    vi.advanceTimersByTime(10_000)
    const player = step.move.player ?? PlayerColor.Blue
    // The tutorial plays any of the filtered moves for the opponent: the last one is the most likely to be wrong
    const move = rules
      .getLegalMoves(player)
      .filter(move => step.move!.filter?.(move, game) ?? true)
      .pop()
    expect(move).toBeDefined()
    playAction(rules, move!, player)
  }
  expect(rules.isOver()).toBe(true)
  expect(rules.getScore(PlayerColor.Blue)).toBeGreaterThan(rules.getScore(PlayerColor.Red))
  vi.useRealTimers()
})
