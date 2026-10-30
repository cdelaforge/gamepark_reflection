import { css } from '@emotion/react'
import { Exit, Side, traceLaser } from '@gamepark/reflection/laser/Laser'
import { Element } from '@gamepark/reflection/material/Element'
import { LocationType } from '@gamepark/reflection/material/LocationType'
import { PlayerColor } from '@gamepark/reflection/PlayerColor'
import { LocationDescription, Locator, MaterialContext, usePlayerId, useRules } from '@gamepark/react-game'
import { Location, MaterialRules } from '@gamepark/rules-api'
import portal from '../images/portal.svg?no-inline'
import { getDisplayedRound, useDisplayedGrid, useLaserSelection, useShowSolution } from '../laser/laserSelection'
import { elementImages } from '../material/Material'
import { CELL, getGridSize } from './Layout'

/**
 * A transparent layer over the grid, which draws the laser coming from the selected clue,
 * and the solution over the player's grid when they chose to see it
 */
class LaserLocator extends Locator {
  locationDescription = new LaserDescription()
  coordinates = { x: 0, y: 0, z: 1 }

  getLocations(context: MaterialContext) {
    if (!getDisplayedRound(context.rules, context.player)?.puzzle) return []
    return [{ type: LocationType.Laser }]
  }
}

class LaserDescription extends LocationDescription {
  getLocationSize(_location: Location, context: MaterialContext) {
    const size = getGridSize(context) * CELL
    return { width: size, height: size }
  }

  content = LaserContent
}

function LaserContent() {
  const rules = useRules<MaterialRules>()
  const player = usePlayerId<PlayerColor>()
  const selection = useLaserSelection()
  const showSolution = useShowSolution()
  const grid = useDisplayedGrid()
  if (!rules || !grid) return null
  const solution = showSolution ? getDisplayedRound(rules, player)?.solution : undefined
  return (
    <>
      {solution && <SolutionGrid solution={solution} />}
      {selection && <LaserPath grid={grid} selection={selection} />}
    </>
  )
}

function SolutionGrid({ solution }: { solution: number[][] }) {
  const size = solution.length
  return solution.flatMap((cells, row) =>
    cells.map((element, col) => (
      <div key={`${row}-${col}`} css={[cellCss, positionCss(row, col, size)]}>
        {element !== 0 && <img src={element === Element.Portal ? portal : elementImages[element]} alt="" css={fullSize} />}
      </div>
    ))
  )
}

function LaserPath({ grid, selection }: { grid: number[][]; selection: Exit }) {
  const size = grid.length
  const laser = traceLaser(grid, selection.side, selection.index)
  // Points in cell units: the center of each crossed cell, plus the border where the laser enters and exits
  const segments = laser.segments.map(cells => cells.map(({ row, col }) => [col + 0.5, row + 0.5]))
  segments[0].unshift(getBorderPoint(selection, size))
  if (laser.exit) segments[segments.length - 1].push(getBorderPoint(laser.exit, size))
  return (
    <svg viewBox={`0 0 ${size} ${size}`} css={svgCss}>
      {segments.map((points, index) => (
        <polyline key={index} points={points.join(' ')} fill="none" stroke="#06f804" strokeWidth={0.08} strokeLinejoin="round" />
      ))}
    </svg>
  )
}

function getBorderPoint({ side, index }: Exit, size: number) {
  switch (side) {
    case Side.Top:
      return [index + 0.5, 0]
    case Side.Right:
      return [size, index + 0.5]
    case Side.Bottom:
      return [index + 0.5, size]
    case Side.Left:
      return [0, index + 0.5]
  }
}

const cellCss = css`
  position: absolute;
  box-sizing: border-box;
  background-color: #55586b;
  border: 0.05em solid #0a0a0a;
`

const positionCss = (row: number, col: number, size: number) => css`
  left: ${(col * 100) / size}%;
  top: ${(row * 100) / size}%;
  width: ${100 / size}%;
  height: ${100 / size}%;
`

const fullSize = css`
  width: 100%;
  height: 100%;
`

const svgCss = css`
  position: absolute;
  width: 100%;
  height: 100%;
  overflow: visible;
`

export const laserLocator = new LaserLocator()
