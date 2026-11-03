import { pointerWithin } from '@dnd-kit/core'
import { PlayerColor } from '@gamepark/reflection/PlayerColor'
import { Memory } from '@gamepark/reflection/rules/Memory'
import { DevToolsHub, GameTable, usePlayerId, usePlayers, useRules } from '@gamepark/react-game'
import { MaterialRules } from '@gamepark/rules-api'
import { CELL, PILE_STEP, stockLines, usePortrait, useWindowSize } from './locators/Layout'
import { getElements } from './locators/PlayerStockLocator'
import { PlayerPanels, portraitPanelsHeight } from './panels/PlayerPanels'
import { useSettings } from './dialogs/SettingsDialog'
import { RoundInfo } from './panels/RoundInfo'
import { useCellLock } from './locators/PlayerGridLocator'

export function GameDisplay() {
  const rules = useRules<MaterialRules>()
  const player = usePlayerId<PlayerColor>()
  const portrait = usePortrait()
  useCellLock()
  const gridSize = rules?.remind<number>(Memory.GridSize) ?? 8
  // The grid and its clues are centered, the stock of elements is beside it, or above or below it on a portrait screen
  const half = ((gridSize + 2) / 2) * CELL + 1
  const elements = rules && player !== undefined ? getElements(rules, player).length : 0
  const stock = (1 + stockLines(elements, gridSize) * PILE_STEP) * CELL
  const { stockLeft, stockAbove } = useSettings()
  const [left, right] = portrait ? [0, 0] : stockLeft ? [stock, 0] : [0, stock]
  const [top, bottom] = !portrait ? [0, 0] : stockAbove ? [stock, 0] : [0, stock]
  // The player panels are on the right, or above the table on a portrait screen with the round information below it
  const players = usePlayers().length
  useWindowSize()
  const tableRatio = (2 * half + left + right) / (2 * half + top + bottom)
  const margin = portrait
    ? { top: 8.5 + portraitPanelsHeight(players, tableRatio, 8.5 + 6), left: 0, right: 0, bottom: 6 }
    : { top: 7, left: 0, right: 30, bottom: 0 }
  return (
    <>
      {/* The table is rebuilt when the screen turns or the stock changes sides. No zoom: the grid always fills the screen.
          An element is dropped on the cell under the pointer only: dropped on a locked cell, it goes back to its place */}
      <GameTable
        key={`${portrait}-${stockLeft}-${stockAbove}`}
        xMin={-half - left}
        xMax={half + right}
        yMin={-half - top}
        yMax={half + bottom}
        margin={margin}
        verticalCenter={portrait}
        zoom={false}
        collisionAlgorithm={pointerWithin}
      >
        <PlayerPanels />
        {process.env.NODE_ENV === 'development' && <DevToolsHub fabBottom="calc(5em)" />}
      </GameTable>
      {/* Out of the table: the settings dialog stays open while the table is rebuilt */}
      <RoundInfo />
    </>
  )
}
