import { Side } from '@gamepark/reflection/laser/Laser'
import { PlayerColor } from '@gamepark/reflection/PlayerColor'
import { Memory } from '@gamepark/reflection/rules/Memory'
import { PlayerPuzzleHelper } from '@gamepark/reflection/rules/PlayerPuzzleHelper'
import { usePlayerId, useRules } from '@gamepark/react-game'
import { MaterialRules } from '@gamepark/rules-api'
import { useSyncExternalStore } from 'react'

export type LaserSelection = { side: Side; index: number } | undefined

let selection: LaserSelection
let showSolution = false
const listeners = new Set<() => void>()
const notify = () => listeners.forEach(listener => listener())

/**
 * Clicking a clue displays the laser coming from it, clicking it again hides the laser. Only on this screen.
 */
export const toggleLaser = (side: Side, index: number) => {
  selection = selection?.side === side && selection.index === index ? undefined : { side, index }
  notify()
}

/**
 * After giving up, the player can switch between their final grid and the solution
 */
export const setShowSolution = (show: boolean) => {
  showSolution = show
  notify()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const useLaserSelection = () => useSyncExternalStore(subscribe, () => selection)

export const useShowSolution = () => useSyncExternalStore(subscribe, () => showSolution)

/**
 * The round on display: the current round of the player, or at the end of the game, their last round.
 * The spectators only see the last round of the first player, at the end of the game.
 */
export const getDisplayedRound = (rules: MaterialRules, player?: PlayerColor) => {
  if (!rules.isOver()) {
    if (player === undefined) return
    const helper = new PlayerPuzzleHelper(rules.game, player)
    return { puzzle: helper.puzzle, grid: helper.grid, solution: helper.solution }
  }
  const view = getLastRound(rules, player)
  return new PlayerPuzzleHelper(rules.game, view.player).getRound(view.round)
}

/**
 * At the end of the game, the round on the table: the last round of the player, or of the first player for a spectator
 */
export const getLastRound = (rules: MaterialRules, player?: PlayerColor) => ({ round: rules.remind<number>(Memory.Round), player: player ?? rules.players[0] })

/**
 * The grid on display: the player's grid, or the solution when they chose to see it
 */
export const useDisplayedGrid = () => {
  const rules = useRules<MaterialRules>()
  const player = usePlayerId<PlayerColor>()
  const show = useShowSolution()
  const round = rules && getDisplayedRound(rules, player)
  if (!round) return
  return (show && round.solution) || round.grid
}
