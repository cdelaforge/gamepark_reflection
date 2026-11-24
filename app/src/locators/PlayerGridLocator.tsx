import { css } from '@emotion/react'
import { LocationType } from '@gamepark/reflection/material/LocationType'
import { MaterialType } from '@gamepark/reflection/material/MaterialType'
import { PlayerColor } from '@gamepark/reflection/PlayerColor'
import { CustomMoveType } from '@gamepark/reflection/rules/CustomMoveType'
import { Lock } from '@gamepark/reflection/rules/SolvePuzzleRule'
import { DropAreaDescription, ItemContext, LocationContext, Locator, MaterialContext, usePlay, usePlayerId, useRules } from '@gamepark/react-game'
import { isMoveItemType, Location, MaterialItem, MaterialMove, MaterialMoveBuilder, MaterialRules } from '@gamepark/rules-api'
import { useEffect } from 'react'
import { useSettings } from '../dialogs/SettingsDialog'
import portal from '../images/portal.svg?no-inline'
import { getDisplayedRound } from '../laser/laserSelection'
import { elementImages, isLocked, isSolving, lockCss } from '../material/Material'
import { FocusHighlight } from './FocusHighlight'
import { CELL, cellCoordinates, getGridSize } from './Layout'
import { getSelectedPile, getStock, useSelectedPile } from './stockSelection'

/**
 * The grid of the player: only the player's own grid is displayed.
 * The spectators only see the grid at the end of the game, to browse the rounds of the players.
 */
class PlayerGridLocator extends Locator {
  locationDescription = new GridCellDescription()

  getLocations(context: MaterialContext) {
    if (context.player === undefined && !context.rules.isOver()) return []
    const size = getGridSize(context)
    return Array.from({ length: size * size }, (_, i) => ({ type: LocationType.PlayerGrid, player: context.player, x: i % size, y: Math.floor(i / size) }))
  }

  getCoordinates(location: Location, context: MaterialContext) {
    return cellCoordinates(location.x!, location.y!, getGridSize(context))
  }

  // The elements are above the laser, which is above the cells (see LaserLocator)
  getItemCoordinates(item: MaterialItem, context: ItemContext) {
    return { ...super.getItemCoordinates(item, context), z: 0.1 }
  }

  hide(item: MaterialItem, context: ItemContext) {
    return item.location.player !== context.player
  }
}

class GridCellDescription extends DropAreaDescription {
  width = CELL
  height = CELL
  extraCss = css`
    background-color: #55586b;
    border: 0.05em solid #0a0a0a;
    box-sizing: border-box;

    /* Every cell is a legal destination: the shine effect of the framework would light up the whole grid */
    &&:after {
      display: none;
    }

    /* A click on an empty cell places the selected element, decided when clicked (see GridCellElement): the cells are not clickable
       for the framework, which would let the pointer events through them */
    && {
      pointer-events: auto;
    }

    &&:has([data-clickable]):hover {
      background-color: #6a6d80;
      cursor: pointer;
    }

    &:hover .preview {
      opacity: 0.4;
    }
  `
  content = GridCellContent

  // No green cell under a dragged element: the element itself shows where it goes
  get dropHighlight() {
    return undefined
  }

  // The framework raises the drop areas while dragging: the cells would hide the elements already placed
  getLocationTransform(location: Location, context: LocationContext) {
    return super.getLocationTransform(location, { ...context, canDrop: false })
  }

  // Called for each cell and each legal move: the generic location comparison of the framework is too slow on big grids
  isMoveToLocation(move: MaterialMove, location: Location) {
    return isMoveItemType(MaterialType.Mirror)(move) && move.location.x === location.x && move.location.y === location.y && move.location.type === location.type
  }
}

function GridCellContent({ location }: { location: Location }) {
  return (
    <>
      <GridCellElement location={location} />
      <FocusHighlight location={location} />
    </>
  )
}

/**
 * A portal, or on an empty cell, the preview of the element selected in the stock when the mouse is over the cell.
 * A click on an empty cell places the element on top of the selected pile.
 */
function GridCellElement({ location }: { location: Location }) {
  const rules = useRules<MaterialRules>()
  const player = usePlayerId<PlayerColor>()
  const play = usePlay()
  if (!rules) return null
  const { x, y } = location as { x: number; y: number }
  const portals = getDisplayedRound(rules, player)?.puzzle?.portals ?? []
  if (portals.some(cell => cell.col === x && cell.row === y)) return <img src={portal} alt="" css={fullSize} />
  if (player === undefined || !isSolving(rules, player)) return null
  const locked = isLocked(rules, player, x, y)
  const empty = !rules.material(MaterialType.Mirror).player(player).location(LocationType.PlayerGrid).filter(({ location }) => location.x === x && location.y === y).length
  const place = () => {
    // The selection is read when clicked: it is not part of the state of the game
    const pile = getSelectedPile(rules, player)
    const top = pile === undefined ? undefined : getStock(rules, player).id(pile).getIndexes().pop()
    const move = rules.getLegalMoves(player).find(move => isMoveItemType(MaterialType.Mirror)(move) && move.itemIndex === top && move.location.x === x && move.location.y === y)
    if (move) play(move)
  }
  return (
    <div css={fullSize} data-cell={`${x},${y}`} onClick={empty && !locked ? place : undefined}>
      {empty && !locked && <CellPreview />}
      {locked && <div css={lockCss} />}
    </div>
  )
}

/**
 * The selected element, shown when the mouse is over the empty cell. Marks the cell as clickable while an element is selected.
 * Only this part renders again when the selection changes.
 */
function CellPreview() {
  const rules = useRules<MaterialRules>()
  const player = usePlayerId<PlayerColor>()
  const { hoverPreview } = useSettings()
  const selected = useSelectedPile(rules, player)
  if (selected === undefined) return null
  if (!hoverPreview) return <div data-clickable />
  return <img src={elementImages[selected]} alt="" className="preview" data-clickable css={[fullSize, previewCss]} />
}

const LONG_PRESS = 600

/**
 * A right click on a cell, or a long press on a touch screen, locks it, or unlocks it.
 * A locked cell is not clickable, so the framework lets the pointer events through it: the cell is found by its position.
 * The long press is detected here: the browsers of the phones do not all open a context menu, and the framework only plays
 * legal moves on a long click, while the lock is a move of the interface only.
 */
export function useCellLock() {
  const player = usePlayerId<PlayerColor>()
  const play = usePlay()
  useEffect(() => {
    if (player === undefined) return
    const cellAt = (x: number, y: number) =>
      [...document.querySelectorAll<HTMLElement>('[data-cell]')].find(cell => {
        const { left, right, top, bottom } = cell.getBoundingClientRect()
        return x >= left && x < right && y >= top && y < bottom
      })
    let lastLock = -Infinity
    const lock = (cell: HTMLElement) => {
      const [x, y] = cell.dataset.cell!.split(',').map(Number)
      play(MaterialMoveBuilder.customMove(CustomMoveType.Lock, { player, x, y } satisfies Lock), { local: true })
    }
    const onContextMenu = (event: MouseEvent) => {
      const cell = cellAt(event.clientX, event.clientY)
      if (!cell) return
      event.preventDefault()
      // A long press already locked the cell: some phones follow it with a context menu
      if (event.timeStamp - lastLock > 1000) lock(cell)
    }
    let press: { timer: number; x: number; y: number } | undefined
    const cancel = () => {
      clearTimeout(press?.timer)
      press = undefined
    }
    const onPointerDown = (event: PointerEvent) => {
      cancel()
      const cell = event.pointerType !== 'mouse' && cellAt(event.clientX, event.clientY)
      if (cell) press = { timer: window.setTimeout(() => {
        lastLock = performance.now()
        lock(cell)
      }, LONG_PRESS), x: event.clientX, y: event.clientY }
    }
    const onPointerMove = (event: PointerEvent) => {
      if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 5) cancel()
    }
    // The framework stops the propagation of the pointer events on the items: they are caught before
    const listeners = { contextmenu: onContextMenu, pointerdown: onPointerDown, pointermove: onPointerMove, pointerup: cancel, pointercancel: cancel }
    for (const [type, listener] of Object.entries(listeners)) document.addEventListener(type, listener as EventListener, true)
    return () => {
      cancel()
      for (const [type, listener] of Object.entries(listeners)) document.removeEventListener(type, listener as EventListener, true)
    }
  }, [player, play])
}

const fullSize = css`
  display: block;
  width: 100%;
  height: 100%;
`

// Visible when the mouse is over the cell, see GridCellDescription
const previewCss = css`
  opacity: 0;
`

export const playerGridLocator = new PlayerGridLocator()
