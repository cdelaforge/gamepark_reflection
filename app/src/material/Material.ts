import { css } from '@emotion/react'
import { Element } from '@gamepark/reflection/material/Element'
import { PlayerPuzzleHelper } from '@gamepark/reflection/rules/PlayerPuzzleHelper'
import { LocationType } from '@gamepark/reflection/material/LocationType'
import { MaterialType } from '@gamepark/reflection/material/MaterialType'
import { ItemContext, MaterialDescription, TokenDescription } from '@gamepark/react-game'
import { MaterialItem, MaterialMove } from '@gamepark/rules-api'
import backslash from '../images/backslash.svg?no-inline'
import blackHole from '../images/black-hole.svg?no-inline'
import horizontal from '../images/horizontal.svg?no-inline'
import slash from '../images/slash.svg?no-inline'
import square from '../images/square.svg?no-inline'
import triangleA from '../images/triangle-a.svg?no-inline'
import triangleB from '../images/triangle-b.svg?no-inline'
import vertical from '../images/vertical.svg?no-inline'
import { CELL } from '../locators/Layout'

export const elementImages: Record<number, string> = {
  [Element.Slash]: slash,
  [Element.BackSlash]: backslash,
  [Element.Vertical]: vertical,
  [Element.Horizontal]: horizontal,
  [Element.Square]: square,
  [Element.BlackHole]: blackHole,
  [Element.TriangleA]: triangleA,
  [Element.TriangleB]: triangleB
}

class MirrorDescription extends TokenDescription {
  width = CELL
  ratio = 1
  transparency = true
  images = elementImages

  getFrontExtraCss() {
    return css`
      background-color: #55586b;
      border: 0.05em solid #0a0a0a;
      box-sizing: border-box;
    `
  }

  // Every element can be moved: no shine effect, the selected element gets a golden outline instead
  highlight() {
    return false
  }

  // A dragged element is slightly transparent, without the selection outline
  getItemExtraCss(item: MaterialItem, context: ItemContext) {
    return [noTransitionCss, context.isDragging ? draggingCss : item.selected && selectedCss]
  }

  // An element goes back to the stock without a pile id: the piles accept it, the framework must not add a pile for this location
  getDropLocations(context: ItemContext, dragMoves: MaterialMove[]) {
    return super.getDropLocations(context, dragMoves).filter(location => location.type !== LocationType.PlayerStock)
  }

  // No help dialog when an element is clicked: the click selects it, then a click on an empty cell places it
  displayHelp() {
    return undefined
  }

  /**
   * A click on an element of the grid sends it back to the stock
   */
  getShortClickMove(context: ItemContext) {
    const mirror = context.rules.material(MaterialType.Mirror).index(context.index)
    const item = mirror.getItem()!
    if (item.location.type !== LocationType.PlayerGrid || !canPlay(context)) return
    return mirror.moveItem({ type: LocationType.PlayerStock, player: item.location.player })
  }

  /**
   * A click on an element of the stock selects it (a click on the selected element unselects it)
   */
  getShortClickLocalMove(context: ItemContext) {
    if (!canPlay(context)) return
    return context.rules.material(MaterialType.Mirror).index(context.index).selectItem()
  }
}

/**
 * The elements stay on display once the player is done, until they start the next round
 */
const canPlay = ({ rules, player }: ItemContext) =>
  player !== undefined && rules.isTurnToPlay(player) && new PlayerPuzzleHelper(rules.game, player).hasStarted

const selectedCss = css`
  outline: 0.2em solid #ffd700;
  box-shadow: 0 0 0.6em 0.2em #ffd700;
`

// A speed game: the framework slides the elements to their new place, they jump there instead
const noTransitionCss = css`
  && {
    transition: none;
  }
`

// Only the element itself is dragged, without the background and border of its tile
const draggingCss = css`
  opacity: 0.7;

  && * {
    background-color: transparent;
    border-color: transparent;
  }
`

export const Material:Partial<Record<MaterialType, MaterialDescription>> = {
  [MaterialType.Mirror]: new MirrorDescription()
}
