import { css } from '@emotion/react'
import { IconDefinition } from '@fortawesome/free-solid-svg-icons'
import { Element } from '@gamepark/reflection/material/Element'
import { PlayerColor } from '@gamepark/reflection/PlayerColor'
import { PlayerPuzzleHelper } from '@gamepark/reflection/rules/PlayerPuzzleHelper'
import { LocationType } from '@gamepark/reflection/material/LocationType'
import { MaterialType } from '@gamepark/reflection/material/MaterialType'
import { ItemContext, MaterialDescription, TokenDescription } from '@gamepark/react-game'
import { isMoveItemType, MaterialGame, MaterialItem, MaterialMove, MaterialRules } from '@gamepark/rules-api'
import absorbingTriangleA from '../images/absorbing-triangle-a.svg?no-inline'
import absorbingTriangleB from '../images/absorbing-triangle-b.svg?no-inline'
import absorbingTriangleC from '../images/absorbing-triangle-c.svg?no-inline'
import absorbingTriangleD from '../images/absorbing-triangle-d.svg?no-inline'
import backslash from '../images/backslash.svg?no-inline'
import blackHole from '../images/black-hole.svg?no-inline'
import horizontal from '../images/horizontal.svg?no-inline'
// A taller shackle than the FontAwesome padlock, which looks like a plain box at the size of the cells
import lockIcon from '../images/lock.svg?no-inline'
import slash from '../images/slash.svg?no-inline'
import square from '../images/square.svg?no-inline'
import triangleA from '../images/triangle-a.svg?no-inline'
import triangleB from '../images/triangle-b.svg?no-inline'
import triangleC from '../images/triangle-c.svg?no-inline'
import triangleD from '../images/triangle-d.svg?no-inline'
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
  [Element.TriangleB]: triangleB,
  [Element.TriangleC]: triangleC,
  [Element.TriangleD]: triangleD,
  [Element.AbsorbingTriangleA]: absorbingTriangleA,
  [Element.AbsorbingTriangleB]: absorbingTriangleB,
  [Element.AbsorbingTriangleC]: absorbingTriangleC,
  [Element.AbsorbingTriangleD]: absorbingTriangleD
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

  // Every element can be moved: no shine effect, the selected pile gets a golden outline instead (see stockSelection)
  highlight() {
    return false
  }

  // A dragged element is slightly transparent. An element on a locked cell shows the padlock.
  // On the grid, the cell gives the background and border: the laser, between the cell and the element, stays visible around it.
  getItemExtraCss(item: MaterialItem, context: ItemContext) {
    const onGrid = item.location.type === LocationType.PlayerGrid
    return [noTransitionCss, onGrid && noTileCss, context.isDragging && draggingCss, isOnLockedCell(item, context) && lockedCss]
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
    const mirrors = context.rules.material(MaterialType.Mirror)
    const item = mirrors.getItem(context.index)
    if (item.location.type !== LocationType.PlayerGrid || !canPlay(context) || isOnLockedCell(item, context)) return
    return mirrors.index(context.index).moveItem({ type: LocationType.PlayerStock, player: item.location.player })
  }
}

/**
 * The elements stay on display once the player is done, until the end of the round
 */
const canPlay = ({ rules, player }: ItemContext) => player !== undefined && isSolving(rules, player)

export const isSolving = (rules: MaterialRules, player: PlayerColor) => {
  const helper = new PlayerPuzzleHelper(rules.game, player)
  return rules.isTurnToPlay(player) && helper.hasStarted && !helper.hasGivenUp
}

/**
 * The elements of the stock that can be placed: during the tutorial, only the element of the current step
 */
export const getPlaceableElements = (rules: MaterialRules, player: PlayerColor) => {
  // Each element asks for it at each render: computed once per state of the game (the states of the store are immutable)
  if (placeable?.game !== rules.game || placeable.player !== player) {
    const mirrors = rules.game.items[MaterialType.Mirror]!
    const ids = rules.getLegalMoves(player).flatMap(move =>
      isMoveItemType(MaterialType.Mirror)(move) && mirrors[move.itemIndex].location.type === LocationType.PlayerStock ? [mirrors[move.itemIndex].id as number] : []
    )
    placeable = { game: rules.game, player, ids: new Set(ids) }
  }
  return placeable.ids
}

let placeable: { game: MaterialGame; player: PlayerColor; ids: Set<number> } | undefined

/**
 * The cells locked by the player, see SolvePuzzleRule
 */
export const isLocked = (rules: MaterialRules, player: PlayerColor, x: number, y: number) =>
  new PlayerPuzzleHelper(rules.game, player).isLocked(x, y)

const isOnLockedCell = ({ location }: MaterialItem, { rules }: ItemContext) =>
  location.type === LocationType.PlayerGrid && isLocked(rules, location.player!, location.x!, location.y!)

/**
 * A FontAwesome icon as an image url
 */
export const iconUrl = ({ icon: [width, height, , , path] }: IconDefinition, color: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><path fill="${color}" d="${path}"/></svg>`)}`

/**
 * The padlock in the corner of a locked cell, over its element if any
 */
export const lockCss = css`
  position: absolute;
  top: 4%;
  right: 4%;
  width: 28%;
  height: 28%;
  background: url("${lockIcon}") no-repeat center / contain;
  filter: drop-shadow(0 0 0.05em #000);
`

const lockedCss = css`
  &:after {
    content: '';
    ${lockCss};
  }
`

// A speed game: the framework slides the elements to their new place, they jump there instead
const noTransitionCss = css`
  && {
    transition: none;
  }
`

// Only the element itself, without the background and border of its tile
const noTileCss = css`
  && * {
    background-color: transparent;
    border-color: transparent;
  }
`

const draggingCss = [noTileCss, css`
  opacity: 0.7;
`]

export const Material:Partial<Record<MaterialType, MaterialDescription>> = {
  [MaterialType.Mirror]: new MirrorDescription()
}
