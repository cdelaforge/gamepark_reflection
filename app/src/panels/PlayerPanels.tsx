import { css } from '@emotion/react'
import { faCircleCheck, faCircleXmark, faFlagCheckered, faHeart, faHeartCrack, faStopwatch } from '@fortawesome/free-solid-svg-icons'
import { Challenge, challenges } from '@gamepark/reflection/Challenge'
import { PlayerColor } from '@gamepark/reflection/PlayerColor'
import { Memory } from '@gamepark/reflection/rules/Memory'
import { PlayerPuzzleHelper } from '@gamepark/reflection/rules/PlayerPuzzleHelper'
import { StyledPlayerPanel, useNow, usePlayerId, usePlayers, useRules } from '@gamepark/react-game'
import { MaterialRules } from '@gamepark/rules-api'
import { createPortal } from 'react-dom'
import { formatTime, getRemainingTime } from '../headers/SolvePuzzleHeader'
import score from '../images/score.svg?no-inline'
import { usePortrait } from '../locators/Layout'
import { iconUrl } from '../material/Material'

const stopwatch = iconUrl(faStopwatch, 'white')
const solved = iconUrl(faCircleCheck, '#5cd65c')
const gaveUp = iconUrl(faCircleXmark, '#f9665e')
const finished = iconUrl(faFlagCheckered, 'white')
const heart = iconUrl(faHeart, '#f9665e')
const heartCrack = iconUrl(faHeartCrack, '#f9665e')

export const PlayerPanels = () => {
  const players = usePlayers<PlayerColor>({ sortFromMe: true })
  const rules = useRules<MaterialRules>()
  const me = usePlayerId<PlayerColor>()
  const portrait = usePortrait()
  const now = useNow({ updateRate: 1000 })
  const root = document.getElementById('root')
  if (!root || !rules) {
    return null
  }
  const challenge = rules.remind<Challenge | undefined>(Memory.Challenge)
  const hearts = rules.remind<number>(Memory.Hearts)

  return createPortal(
    <div css={portrait && portraitPanelsCss}>
      <div css={portrait && portraitScaleCss}>
      {players.map((player, index) => {
        const points = rules.remind<number | undefined>(Memory.Score, player.id) ?? 0
        const time = getTimeCounter(rules, player.id, me, now)
        // A single counter below the main one is narrow and on the left: without hearts, the score goes beside the time
        return (
          <StyledPlayerPanel
            key={player.id}
            player={player}
            css={portrait ? portraitPosition(index, players.length) : panelPosition(index)}
            activeRing
            mainCounter={challenge ? { image: score, value: `${points}/${challenges[challenge].goal}` } : undefined}
            counters={challenge ? [{ image: hearts > 0 ? heart : heartCrack, value: Math.max(0, hearts) }, time] : [{ image: score, value: points }, time]}
            countersPerLine={2}
          />
        )
      })}
      </div>
    </div>,
    root
  )
}

const isDone = (rules: MaterialRules, player: PlayerColor) => new PlayerPuzzleHelper(rules.game, player).hasStarted && !rules.isTurnToPlay(player)

/**
 * The time left to a player, or their result once they are done.
 * As long as a player is solving the puzzle, I only know whether the other players are done: neither their result nor their time.
 */
const getTimeCounter = (rules: MaterialRules, player: PlayerColor, me: PlayerColor | undefined, now: number) => {
  const hidden = { image: stopwatch, value: '–' }
  if (me !== undefined && player !== me && rules.game.players.some(p => rules.isTurnToPlay(p))) {
    return isDone(rules, player) ? { ...hidden, image: finished } : hidden
  }
  if (!new PlayerPuzzleHelper(rules.game, player).hasStarted) return hidden
  if (rules.isTurnToPlay(player)) return { ...hidden, value: formatTime(getRemainingTime(rules, player, now)) }
  const duration = rules.remind<number | undefined>(Memory.Duration, player)
  return duration === undefined ? { ...hidden, image: gaveUp } : { ...hidden, image: solved, value: formatTime(duration) }
}

/**
 * On a landscape screen, the panels are on the right, one below the other, and the round information below them
 */
const PANEL_STEP = 12.5

export const landscapePanelsBottom = (players: number) => 8.5 + players * PANEL_STEP

const panelPosition = (index: number) => css`
  position: absolute;
  right: 1em;
  top: ${8.5 + index * PANEL_STEP}em;
  width: 28em;
`

/**
 * On a portrait screen, the panels are above the table, 2 by line: the grid gets the whole width of the screen
 */
const PANELS_PER_LINE = 2
// A panel is 28em wide and 11.8em high, with the same gap between the columns and the lines
const GAP = 1.5
const PANEL_COLUMN = 28 + GAP
const PANEL_LINE = 11.8 + GAP

/**
 * The room of the panels above the table, in em, when the table has the given width / height ratio and the given room for the rest of the interface.
 * The panels get smaller when 2 of them would be wider than the screen, and the em depends on the room left to the table (see GameTable):
 * a few rounds of calculation find the balance.
 */
export const portraitPanelsHeight = (players: number, tableRatio: number, otherMargins: number) => {
  const fullSize = Math.ceil(players / PANELS_PER_LINE) * PANEL_LINE
  let height = fullSize
  for (let i = 0; i < 10; i++) {
    const ratio = ((100 - otherMargins - height) * tableRatio) / 100
    const em = Math.min(innerHeight / 100, innerWidth / 100 / ratio)
    height = fullSize * Math.min(1, innerWidth / (PANELS_PER_LINE * PANEL_COLUMN + GAP) / em)
  }
  return height
}

// Below the header
const portraitPanelsCss = css`
  position: absolute;
  top: 8em;
  left: 0;
  right: 0;
`

/**
 * The panels get smaller when 2 of them would be wider than the screen: the text of the interface grows with the number of lines of panels
 */
const portraitScaleCss = css`
  position: relative;
  font-size: min(1em, 100vw / ${PANELS_PER_LINE * PANEL_COLUMN + GAP});
`

const portraitPosition = (index: number, players: number) => {
  const column = index % PANELS_PER_LINE
  const columns = Math.min(players, PANELS_PER_LINE)
  return css`
    position: absolute;
    left: calc(50% + ${(column - columns / 2) * PANEL_COLUMN + GAP / 2}em);
    top: ${Math.floor(index / PANELS_PER_LINE) * PANEL_LINE}em;
    width: 28em;
  `
}
