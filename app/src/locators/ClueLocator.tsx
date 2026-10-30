import { css } from '@emotion/react'
import { Clue, Side, sides, traceLaser } from '@gamepark/reflection/laser/Laser'
import { LocationType } from '@gamepark/reflection/material/LocationType'
import { PlayerColor } from '@gamepark/reflection/PlayerColor'
import { LocationDescription, Locator, MaterialContext, usePlayerId, useRules } from '@gamepark/react-game'
import { Location, MaterialRules } from '@gamepark/rules-api'
import { getDisplayedRound, toggleLaser, useDisplayedGrid, useLaserSelection } from '../laser/laserSelection'
import { ClueNumber } from './ClueNumber'
import { CELL, cellCoordinates, getGridSize } from './Layout'

/**
 * The clues around the grid, displayed once the player has started the round, until they start the next one, and for the round on display at the end of the game
 */
class ClueLocator extends Locator {
  locationDescription = new ClueDescription()

  getLocations(context: MaterialContext) {
    if (!getDisplayedRound(context.rules, context.player)?.puzzle) return []
    const size = getGridSize(context)
    return sides.flatMap(side => Array.from({ length: size }, (_, x) => ({ type: LocationType.Clue, id: side, x })))
  }

  getCoordinates(location: Location, context: MaterialContext) {
    const size = getGridSize(context)
    const index = location.x!
    switch (location.id as Side) {
      case Side.Top:
        return cellCoordinates(index, -1, size)
      case Side.Right:
        return cellCoordinates(size, index, size)
      case Side.Bottom:
        return cellCoordinates(index, size, size)
      case Side.Left:
        return cellCoordinates(-1, index, size)
    }
  }
}

class ClueDescription extends LocationDescription {
  width = CELL
  height = CELL
  content = ClueContent
}

/**
 * Displays the clue to solve, or the current value of the grid when the laser is displayed.
 * The tile is round on a red cell as long as the grid does not match the clue. The color of the tile tells how the laser ends.
 */
function ClueContent({ location }: { location: Location }) {
  const rules = useRules<MaterialRules>()
  const player = usePlayerId<PlayerColor>()
  const selection = useLaserSelection()
  const grid = useDisplayedGrid()
  if (!rules || !grid) return null
  const side = location.id as Side
  const index = location.x!
  const target = getDisplayedRound(rules, player)?.puzzle?.clues[side][index]
  if (!target) return null
  const selected = selection?.side === side && selection.index === index
  return <ClueTile target={target} current={traceLaser(grid, side, index).clue} selected={selected} onClick={() => toggleLaser(side, index)} />
}

type ClueTileProps = { target: Clue; current: Clue; selected?: boolean; onClick?: () => void }

export function ClueTile({ target, current, selected, onClick }: ClueTileProps) {
  const shown = selected ? current : target
  // As long as the grid does not match the clue, the tile is round on a red cell. The cell is blue when the laser is displayed.
  const solved = current === target
  const background = selected ? '#77b5fe' : solved ? 'transparent' : '#f9665e'
  return (
    <div css={[clueCss, onClick && clickableCss, css`background-color: ${background};`]} onClick={onClick}>
      <div css={[tileCss, colorCss(shown), !solved && roundCss]}>
        <ClueNumber value={parseInt(shown)} />
      </div>
    </div>
  )
}

const clueCss = css`
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  border: 0.05em solid #0a0a0a;
`

const clickableCss = css`
  pointer-events: auto;
  cursor: pointer;
`

const tileCss = css`
  height: 100%;
  box-sizing: border-box;
  padding: 0.15em;
`

const roundCss = css`
  border-radius: 50%;
`

const colors: Record<string, string> = { r: '#fff7ab', s: '#92cea8', a: 'grey' }

const colorCss = (clue: Clue) => css`
  background-color: ${colors[clue.charAt(clue.length - 1)]};
`


export const clueLocator = new ClueLocator()
