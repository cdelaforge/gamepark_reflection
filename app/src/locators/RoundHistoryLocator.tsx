import { Locator, ItemContext, MaterialContext } from '@gamepark/react-game'
import { Location, MaterialItem } from '@gamepark/rules-api'
import { getLastRound } from '../laser/laserSelection'
import { cellCoordinates, getGridSize } from './Layout'

/**
 * The final grids of every round, kept for the end of the game: only the last round is displayed on the grid, the others in the score dialog
 */
class RoundHistoryLocator extends Locator {
  getCoordinates(location: Location, context: MaterialContext) {
    return cellCoordinates(location.x!, location.y!, getGridSize(context))
  }

  hide(item: MaterialItem, context: ItemContext) {
    if (!context.rules.isOver()) return true
    const view = getLastRound(context.rules, context.player)
    return item.location.player !== view.player || item.location.id !== view.round
  }
}

export const roundHistoryLocator = new RoundHistoryLocator()
