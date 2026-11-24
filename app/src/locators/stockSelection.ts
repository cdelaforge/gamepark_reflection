import { Element } from '@gamepark/reflection/material/Element'
import { LocationType } from '@gamepark/reflection/material/LocationType'
import { MaterialType } from '@gamepark/reflection/material/MaterialType'
import { PlayerColor } from '@gamepark/reflection/PlayerColor'
import { Memory } from '@gamepark/reflection/rules/Memory'
import { PlayerPuzzleHelper } from '@gamepark/reflection/rules/PlayerPuzzleHelper'
import { useRules } from '@gamepark/react-game'
import { MaterialGame, MaterialItem, MaterialRules } from '@gamepark/rules-api'
import { uniq } from 'es-toolkit'
import { useEffect, useRef, useSyncExternalStore } from 'react'
import { getPlaceableElements, isSolving } from '../material/Material'

/**
 * The pile of the stock selected by the player: a click on an empty cell places the element on top of it.
 * The selection is kept out of the state of the game: changing it only renders the piles and the cells again, not the whole table,
 * which is too slow on big grids. It is stored by element, for the current round. When the pile is empty or cannot be placed
 * (during the tutorial, only the element of the current step can), the first pile that can be placed is selected.
 */
let selection: { round: number; id: number } | undefined
const listeners = new Set<() => void>()

export const selectPile = (rules: MaterialRules, id: number) => {
  selection = { round: rules.remind<number>(Memory.Round), id }
  listeners.forEach(listener => listener())
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const getStock = (rules: MaterialRules, player: PlayerColor) => new PlayerPuzzleHelper(rules.game, player).stock

/**
 * The elements of the round, in the stock or on the grid, the black hole last
 */
export const getElements = (rules: MaterialRules, player: PlayerColor) =>
  uniq(
    rules
      .material(MaterialType.Mirror)
      .player(player)
      .location(({ type }) => type === LocationType.PlayerStock || type === LocationType.PlayerGrid)
      .getItems()
      .map(item => item.id as number)
  ).sort((a, b) => Number(a === Element.BlackHole) - Number(b === Element.BlackHole) || a - b)

/**
 * The piles that can be selected: not empty, and their element can be placed
 */
export const getSelectablePiles = (rules: MaterialRules, player: PlayerColor) => {
  if (!isSolving(rules, player)) return []
  const stock = getStock(rules, player)
  const placeable = getPlaceableElements(rules, player)
  return getElements(rules, player).filter(id => stock.id(id).length && placeable.has(id))
}

/**
 * The selected pile, undefined when the player cannot place anything
 */
export const getSelectedPile = (rules: MaterialRules, player: PlayerColor) => {
  // Each cell asks for it at each render: computed once per state of the game and selection
  if (cache?.game !== rules.game || cache.player !== player || cache.selection !== selection) {
    const piles = getSelectablePiles(rules, player)
    const chosen = selection?.round === rules.remind<number>(Memory.Round) ? selection.id : undefined
    const pile = chosen !== undefined && piles.includes(chosen) ? chosen : piles[0]
    cache = { game: rules.game, player, selection, pile }
  }
  return cache.pile
}

let cache: { game: MaterialGame; player: PlayerColor; selection: typeof selection; pile?: number } | undefined

/**
 * The selected pile, for the components that display it: they render again when the selection changes
 */
export const useSelectedPile = (rules?: MaterialRules, player?: PlayerColor) => {
  useSyncExternalStore(subscribe, () => selection)
  return rules && player !== undefined ? getSelectedPile(rules, player) : undefined
}

/**
 * The element a move takes out of the stock, or sends back to it: an element sent back to the stock wins,
 * even when an element of the stock took its cell. A move inside the grid is not reported.
 */
export const getMovedElement = (before: MaterialItem[], after: MaterialItem[], player: PlayerColor) => {
  const is = (item: MaterialItem | undefined, type: LocationType) => item?.location.type === type && item.location.player === player
  const back = after.find((item, index) => is(item, LocationType.PlayerStock) && is(before[index], LocationType.PlayerGrid))
  const placed = after.find((item, index) => is(item, LocationType.PlayerGrid) && is(before[index], LocationType.PlayerStock))
  return (back ?? placed)?.id as number | undefined
}

/**
 * The selection follows the moves: the pile of an element placed from the stock, or of an element sent back to it, is selected
 */
export function useSelectionFollowsMoves(player: PlayerColor) {
  const rules = useRules<MaterialRules>()!
  const mirrors = rules.game.items[MaterialType.Mirror]
  const previous = useRef(mirrors)
  useEffect(() => {
    const before = previous.current
    previous.current = mirrors
    if (!before || !mirrors || before === mirrors) return
    const moved = getMovedElement(before, mirrors, player)
    if (moved !== undefined) selectPile(rules, moved)
  }, [mirrors, rules, player])
}
