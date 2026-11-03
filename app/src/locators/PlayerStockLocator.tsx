import { css } from '@emotion/react'
import { Element } from '@gamepark/reflection/material/Element'
import { LocationType } from '@gamepark/reflection/material/LocationType'
import { MaterialType } from '@gamepark/reflection/material/MaterialType'
import { PlayerColor } from '@gamepark/reflection/PlayerColor'
import { DropAreaDescription, ItemContext, Locator, MaterialContext, useDraggedItem, usePlay, usePlayerId, useRules } from '@gamepark/react-game'
import { isMoveItemType, Location, MaterialItem, MaterialMove, MaterialRules } from '@gamepark/rules-api'
import { uniq } from 'es-toolkit'
import { useEffect } from 'react'
import { getSettings } from '../dialogs/SettingsDialog'
import { useShowSolution } from '../laser/laserSelection'
import { elementImages } from '../material/Material'
import { CELL, getGridSize, isPortrait, PILE_STEP, pilesPerLine } from './Layout'

/**
 * The elements still to place, beside the grid, or above or below it: one pile per element, with the number of elements left.
 * Each pile keeps its place when it is empty, so that the other piles do not move.
 */
class PlayerStockLocator extends Locator {
  locationDescription = new PileDescription()

  getLocations(context: MaterialContext) {
    if (context.player === undefined) return []
    return getElements(context.rules, context.player).map(id => ({ type: LocationType.PlayerStock, player: context.player, id }))
  }

  getCoordinates(location: Location, context: MaterialContext) {
    const size = getGridSize(context)
    const pile = getElements(context.rules, location.player!).indexOf(location.id)
    // Along the grid, from the first clue: a column beside the grid, or a line above or below it
    const along = (-(size + 1) / 2 + (pile % pilesPerLine(size)) * PILE_STEP) * CELL
    const across = ((size + 1) / 2 + 1.5 + Math.floor(pile / pilesPerLine(size)) * PILE_STEP) * CELL
    // The player may prefer the stock on the other side of the grid
    const { stockLeft, stockAbove } = getSettings()
    return isPortrait() ? { x: along, y: stockAbove ? -across : across, z: 2 } : { x: stockLeft ? -across : across, y: along, z: 2 }
  }

  // The elements of a pile are exactly on top of each other: the count tells how many there are
  getItemCoordinates(item: MaterialItem, context: ItemContext) {
    const { x, y } = this.getCoordinates({ ...item.location, id: item.id }, context)
    const pile = getStock(context.rules, item.location.player!).id(item.id).getIndexes()
    return { x, y, z: Math.max(0, pile.indexOf(context.index)) * 0.05 }
  }

  hide(item: MaterialItem, context: ItemContext) {
    return item.location.player !== context.player
  }
}

const getStock = (rules: MaterialRules, player: PlayerColor) =>
  rules.material(MaterialType.Mirror).location(LocationType.PlayerStock).player(player)

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

const steps: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }

/**
 * The arrow keys and the mouse wheel over the table select the next pile of the stock, or the previous one, skipping the empty piles
 */
export function useStockNavigation(player: PlayerColor) {
  const rules = useRules<MaterialRules>()!
  const play = usePlay()
  useEffect(() => {
    let lastWheel = 0
    const select = (step: number) => {
      const stock = getStock(rules, player)
      const selected = stock.selected().getItem()
      if (!selected) return false
      const piles = getElements(rules, player).filter(id => stock.id(id).length)
      const next = piles[(piles.indexOf(selected.id) + step + piles.length) % piles.length]
      if (next !== selected.id) play(rules.material(MaterialType.Mirror).index(stock.id(next).getIndexes().pop()!).selectItem(), { local: true })
      return true
    }
    const onKey = (event: KeyboardEvent) => {
      const step = steps[event.key]
      if (!step || (event.target instanceof HTMLElement && event.target.closest('input, textarea'))) return
      if (select(step)) event.preventDefault()
    }
    const onWheel = (event: WheelEvent) => {
      if (!event.deltaY || !(event.target instanceof Element) || !event.target.closest('.wrapperClass')) return
      event.preventDefault()
      event.stopPropagation()
      // A touchpad sends many events for one gesture
      if (event.timeStamp - lastWheel < 150) return
      lastWheel = event.timeStamp
      select(event.deltaY > 0 ? 1 : -1)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('wheel', onWheel, { capture: true, passive: false })
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('wheel', onWheel, { capture: true })
    }
  }, [rules, player, play])
}

/**
 * A drop area to send an element back to the stock, which displays the number of elements in the pile
 */
class PileDescription extends DropAreaDescription {
  width = CELL
  height = CELL
  content = PileCount
  // Every pile accepts the dragged element: the shine effect of the framework would light up the whole stock, and cut the count badges
  extraCss = css`
    && {
      overflow: visible;
    }

    &&:after {
      display: none;
    }
  `

  get dropHighlight() {
    return undefined
  }

  // An element goes back to the stock without a pile id: it can be dropped on any pile
  isMoveToLocation(move: MaterialMove, location: Location) {
    return isMoveItemType(MaterialType.Mirror)(move) && move.location.type === location.type
  }

  // A pile is only a drop area: a click must reach the elements of the pile, which are below it
  canLongClick() {
    return false
  }
}

function PileCount({ location }: { location: Location }) {
  const rules = useRules<MaterialRules>()
  const player = usePlayerId<PlayerColor>()
  const dragged = useDraggedItem()
  const showSolution = useShowSolution()
  if (!rules || player === undefined) return null
  // The dragged element already left its pile, as well as a dropped element until its move is played
  const leaving = [dragged, ...(rules.game.droppedItems ?? [])].flatMap(item => (item?.type === MaterialType.Mirror ? [item.index] : []))
  const count = getStock(rules, player)
    .id(location.id)
    .index(index => !leaving.includes(index)).length
  // An empty pile shows its element greyed out, over the elements left when the solution is on display: they are all on the grid
  if (!count || showSolution) {
    return (
      <div css={emptyCss}>
        <img src={elementImages[location.id]} alt="" />
      </div>
    )
  }
  return <div css={countCss}>{count}</div>
}

const emptyCss = css`
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  background-color: #55586b;
  border: 0.05em solid #0a0a0a;

  img {
    display: block;
    width: 100%;
    height: 100%;
    opacity: 0.3;
    filter: grayscale(1);
  }
`

const countCss = css`
  position: absolute;
  top: -0.4em;
  right: -0.4em;
  min-width: 1.4em;
  height: 1.4em;
  border-radius: 0.7em;
  background-color: #f9665e;
  color: white;
  font-size: 0.9em;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
`

export const playerStockLocator = new PlayerStockLocator()
