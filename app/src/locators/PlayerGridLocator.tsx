import { css } from '@emotion/react'
import { LocationType } from '@gamepark/reflection/material/LocationType'
import { PlayerColor } from '@gamepark/reflection/PlayerColor'
import { DropAreaDescription, ItemContext, LocationContext, Locator, MaterialContext, usePlayerId, useRules } from '@gamepark/react-game'
import { MaterialType } from '@gamepark/reflection/material/MaterialType'
import { isMoveItemType, Location, MaterialItem, MaterialMove, MaterialRules, MoveItem } from '@gamepark/rules-api'
import portal from '../images/portal.svg?no-inline'
import { getDisplayedRound } from '../laser/laserSelection'
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

function GridCellContent({ location }: { location: Location }) {
  const rules = useRules<MaterialRules>()
  const player = usePlayerId<PlayerColor>()
  if (!rules) return null
  const portals = getDisplayedRound(rules, player)?.puzzle?.portals ?? []
  if (!portals.some(cell => cell.col === location.x && cell.row === location.y)) return null
  return <img src={portal} alt="" css={fullSize} />
}

const fullSize = css`
  width: 100%;
  height: 100%;
`

export const playerGridLocator = new PlayerGridLocator()
