import { css } from '@emotion/react'
import { LocationType } from '@gamepark/reflection/material/LocationType'
import { MaterialType } from '@gamepark/reflection/material/MaterialType'
import { PlayerColor } from '@gamepark/reflection/PlayerColor'
import { CustomMoveType } from '@gamepark/reflection/rules/CustomMoveType'
import { PlayerPuzzleHelper } from '@gamepark/reflection/rules/PlayerPuzzleHelper'
import { Lock } from '@gamepark/reflection/rules/SolvePuzzleRule'
import { DropAreaDescription, ItemContext, LocationContext, Locator, MaterialContext, usePlay, usePlayerId, useRules } from '@gamepark/react-game'
import { isMoveItemType, Location, MaterialItem, MaterialMove, MaterialRules, MoveItem } from '@gamepark/rules-api'
import { useEffect } from 'react'
import { useSettings } from '../dialogs/SettingsDialog'
import portal from '../images/portal.svg?no-inline'
import { getDisplayedRound } from '../laser/laserSelection'
import { elementImages, isLocked, lockCss } from '../material/Material'
import { CELL, cellCoordinates, getGridSize } from './Layout'

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

    /* The framework lights up a clickable location with a transparent white: the cell would show the background */
    &&:hover {
      background-color: #6a6d80;
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

  /**
   * A click on an empty cell places the selected element.
   * Called for each cell and each legal move: the cheap location test comes first.
   */
  canShortClick(move: MaterialMove, location: Location, context: MaterialContext) {
    return this.isMoveToLocation(move, location) && !!context.rules.game.items[MaterialType.Mirror]![(move as MoveItem).itemIndex].selected
  }

  // Called for each cell and each legal move: the generic location comparison of the framework is too slow on big grids
  isMoveToLocation(move: MaterialMove, location: Location) {
    return isMoveItemType(MaterialType.Mirror)(move) && move.location.x === location.x && move.location.y === location.y && move.location.type === location.type
  }
}

/**
 * A portal, or on an empty cell, the preview of the element selected in the stock when the mouse is over the cell
 */
function GridCellContent({ location }: { location: Location }) {
  const rules = useRules<MaterialRules>()
  const player = usePlayerId<PlayerColor>()
  const { hoverPreview } = useSettings()
  if (!rules) return null
  const { x, y } = location as { x: number; y: number }
  const portals = getDisplayedRound(rules, player)?.puzzle?.portals ?? []
  if (portals.some(cell => cell.col === x && cell.row === y)) return <img src={portal} alt="" css={fullSize} />
  if (player === undefined || !canPlay(rules, player)) return null
  const locked = isLocked(rules, player, x, y)
  const mirrors = rules.material(MaterialType.Mirror).player(player)
  const empty = !mirrors.location(LocationType.PlayerGrid).filter(({ location }) => location.x === x && location.y === y).length
  const selected = mirrors.location(LocationType.PlayerStock).selected().getItem()
  return (
    <div css={fullSize} data-cell={`${x},${y}`}>
      {hoverPreview && empty && !locked && selected && <img src={elementImages[selected.id]} alt="" className="preview" css={[fullSize, previewCss]} />}
      {locked && <div css={lockCss} />}
    </div>
  )
}

const canPlay = (rules: MaterialRules, player: PlayerColor) => rules.isTurnToPlay(player) && new PlayerPuzzleHelper(rules.game, player).hasStarted

/**
 * A right click on a cell (a long press on a phone) locks it, or unlocks it. The element placed on the cell is above the cell:
 * the cell is found under the pointer.
 */
export function useCellLock() {
  const rules = useRules<MaterialRules>()
  const player = usePlayerId<PlayerColor>()
  const play = usePlay()
  useEffect(() => {
    if (!rules || player === undefined) return
    const handler = (event: MouseEvent) => {
      const cell = document.elementsFromPoint(event.clientX, event.clientY).find(element => element instanceof HTMLElement && element.dataset.cell)
      if (!(cell instanceof HTMLElement)) return
      event.preventDefault()
      const [x, y] = cell.dataset.cell!.split(',').map(Number)
      play(rules.customMove(CustomMoveType.Lock, { player, x, y } satisfies Lock), { local: true })
    }
    document.addEventListener('contextmenu', handler)
    return () => document.removeEventListener('contextmenu', handler)
  }, [rules, player, play])
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
