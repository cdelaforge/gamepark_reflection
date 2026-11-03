import { css } from '@emotion/react'
import { faEye } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { PlayerColor } from '@gamepark/reflection/PlayerColor'
import { Memory } from '@gamepark/reflection/rules/Memory'
import { PlayerPuzzleHelper } from '@gamepark/reflection/rules/PlayerPuzzleHelper'
import { ThemeButton, usePlayerId, usePlayers, useRules } from '@gamepark/react-game'
import { MaterialRules } from '@gamepark/rules-api'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { ScoreDialog, tableButtonCss } from '../dialogs/ScoreDialog'
import { SettingsButton } from '../dialogs/SettingsDialog'
import { setShowSolution, useShowSolution } from '../laser/laserSelection'
import { usePortrait } from '../locators/Layout'
import { landscapePanelsBottom } from './PlayerPanels'

/**
 * Below the player panels, or at the bottom of a portrait screen: the current round, the scores and the solution of a given up puzzle
 */
export const RoundInfo = () => {
  const { t } = useTranslation()
  const rules = useRules<MaterialRules>()
  const players = usePlayers().length
  const portrait = usePortrait()
  const root = document.getElementById('root')
  if (!root || !rules) return null
  const round = rules.remind<number>(Memory.Round)
  // A challenge has no fixed number of puzzles
  const progress = rules.remind(Memory.Challenge) ? t('info.puzzle', { round }) : t('info.round', { round, rounds: rules.remind<number>(Memory.Rounds) })
  return createPortal(
    <div css={portrait ? bottomCss : belowPanelsCss(players)}>
      {/* Beside the round, the settings do not make the column longer */}
      <div css={lineCss}>
        <span css={progressCss}>{progress}</span>
        {!portrait && <SettingsButton />}
      </div>
      {/* Side by side: the column is short below 6 panels */}
      <div css={lineCss}>
        <ScoreDialog />
        <SolutionButton />
        {portrait && <SettingsButton />}
      </div>
    </div>,
    root
  )
}

/**
 * Once the player gave up, until they start the next round: switches between their grid and the solution
 */
const SolutionButton = () => {
  const { t } = useTranslation()
  const rules = useRules<MaterialRules>()!
  const player = usePlayerId<PlayerColor>()
  const showSolution = useShowSolution()
  if (player === undefined || !new PlayerPuzzleHelper(rules.game, player).solution) return null
  return (
    <ThemeButton css={tableButtonCss} onClick={() => setShowSolution(!showSolution)}>
      <FontAwesomeIcon icon={faEye} /> {t(showSolution ? 'button.show-grid' : 'button.show-solution')}
    </ThemeButton>
  )
}

const belowPanelsCss = (players: number) => css`
  position: absolute;
  right: 1em;
  top: ${landscapePanelsBottom(players)}em;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1em;
`

// On a portrait screen, the panels are above the table: the bottom of the screen is free.
// Like the panels, the line gets smaller when it would be wider than the screen.
const bottomCss = css`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 1em;
  font-size: min(1em, 100vw / 62);
  white-space: nowrap;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1em;
`

const lineCss = css`
  display: flex;
  align-items: center;
  gap: 1em;
`

const progressCss = css`
  font-size: 2.4em;
  color: white;
  text-shadow: 0 0 0.2em black;
`
