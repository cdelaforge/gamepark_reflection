import { css } from '@emotion/react'
import { PlayerColor } from '@gamepark/reflection/PlayerColor'
import { Memory } from '@gamepark/reflection/rules/Memory'
import { DevToolsHub, GameTable, GameTableNavigation, usePlayerId, useRules } from '@gamepark/react-game'
import { MaterialRules } from '@gamepark/rules-api'
import { CELL, PILE_STEP, stockLines, usePortrait } from './locators/Layout'
import { getElements } from './locators/PlayerStockLocator'
import { PlayerPanels } from './panels/PlayerPanels'
import { ScoreDialog } from './dialogs/ScoreDialog'

export function GameDisplay() {
  const rules = useRules<MaterialRules>()
  const player = usePlayerId<PlayerColor>()
  const portrait = usePortrait()
  const gridSize = rules?.remind<number>(Memory.GridSize) ?? 8
  // The grid and its clues are centered, the stock of elements is on the right, or below on a portrait screen
  const half = ((gridSize + 2) / 2) * CELL + 1
  const elements = rules && player !== undefined ? getElements(rules, player).length : 0
  const stock = (1 + stockLines(elements, gridSize) * PILE_STEP) * CELL
  const margin = { top: 7, left: 0, right: 30, bottom: 0 }
  return (
    <>
      {/* The table is rebuilt when the screen turns: the stock moves */}
      <GameTable
        key={String(portrait)}
        xMin={-half}
        xMax={portrait ? half : half + stock}
        yMin={-half}
        yMax={portrait ? half + stock : half}
        margin={margin}
        css={process.env.NODE_ENV === 'development' && tableBorder}
      >
        <GameTableNavigation />
        <PlayerPanels />
        <ScoreDialog />
        {process.env.NODE_ENV === 'development' && <DevToolsHub fabBottom="calc(5em)" />}
      </GameTable>
    </>
  )
}

const tableBorder = css`
  border: 1px solid white;
`
