import { css } from '@emotion/react'
import { faLock, IconDefinition } from '@fortawesome/free-solid-svg-icons'
import { Element } from '@gamepark/reflection/material/Element'
import { PlayerColor } from '@gamepark/reflection/PlayerColor'
import { Memory } from '@gamepark/reflection/rules/Memory'
import { PlayerPuzzleHelper } from '@gamepark/reflection/rules/PlayerPuzzleHelper'
import { Lock } from '@gamepark/reflection/rules/SolvePuzzleRule'
import { LocationType } from '@gamepark/reflection/material/LocationType'
import { MaterialType } from '@gamepark/reflection/material/MaterialType'
import { ItemContext, MaterialDescription, TokenDescription } from '@gamepark/react-game'
import { isMoveItemType, MaterialItem, MaterialMove, MaterialRules } from '@gamepark/rules-api'
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

  // A dragged element is slightly transparent, without the selection outline. An element on a locked cell shows the padlock.
  getItemExtraCss(item: MaterialItem, context: ItemContext) {
    return [noTransitionCss, context.isDragging ? draggingCss : item.selected && selectedCss, isOnLockedCell(item, context) && lockedCss]
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

  /**
   * A click on an element of the stock selects it (a click on the selected element unselects it)
   */
  getShortClickLocalMove(context: ItemContext) {
    if (!canPlay(context)) return
    const mirror = context.rules.material(MaterialType.Mirror).index(context.index)
    if (!mirror.getItem()!.selected && !canPlace(context.rules, context.player!, mirror.getItem()!.id)) return
    return mirror.selectItem()
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
 * An element of the stock can be selected only if it can be placed: during the tutorial, only the element of the current step
 */
export const canPlace = (rules: MaterialRules, player: PlayerColor, id: number) =>
  rules.getLegalMoves(player).some(move => {
    if (!isMoveItemType(MaterialType.Mirror)(move)) return false
    const mirror = rules.material(MaterialType.Mirror).getItem(move.itemIndex)
    return mirror.id === id && mirror.location.type === LocationType.PlayerStock
  })

/**
 * The cells locked by the player, see SolvePuzzleRule
 */
export const isLocked = (rules: MaterialRules, player: PlayerColor, x: number, y: number) =>
  !!rules.remind<Lock[] | undefined>(Memory.Locks, player)?.some(lock => lock.x === x && lock.y === y)

const isOnLockedCell = ({ location }: MaterialItem, { rules }: ItemContext) =>
  location.type === LocationType.PlayerGrid && isLocked(rules, location.player!, location.x!, location.y!)

/**
 * A FontAwesome icon as an image url
 */
export const iconUrl = ({ icon: [width, height, , , path] }: IconDefinition, color: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><path fill="${color}" d="${path}"/></svg>`)}`

const lockIcon = iconUrl(faLock, '#ffd700')

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
