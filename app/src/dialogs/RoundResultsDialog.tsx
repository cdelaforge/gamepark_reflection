import { css } from '@emotion/react'
import { START_HEARTS } from '@gamepark/reflection/Challenge'
import { PlayerColor } from '@gamepark/reflection/PlayerColor'
import { Memory } from '@gamepark/reflection/rules/Memory'
import { PlayerPuzzleHelper } from '@gamepark/reflection/rules/PlayerPuzzleHelper'
import { RoundResults } from '@gamepark/reflection/rules/SolvePuzzleRule'
import { Dialog, ThemeButton, usePlayerId, usePlayerName, useRules } from '@gamepark/react-game'
import { MaterialRules } from '@gamepark/rules-api'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatHearts, formatTime } from '../headers/SolvePuzzleHeader'

/**
 * The results of the round that just ended, until the player closes it or starts the next round.
 * The last round is followed by the results of the game, displayed by the platform.
 */
export const RoundResultsDialog = () => {
  const { t } = useTranslation()
  const rules = useRules<MaterialRules>()
  const player = usePlayerId<PlayerColor>()
  const [closedRound, setClosedRound] = useState<number>()
  const history = rules?.remind<RoundResults[] | undefined>(Memory.RoundResults)
  const results = history?.at(-1)
  const open =
    !!rules &&
    !!results &&
    results.round !== closedRound &&
    !rules.isOver() &&
    (player === undefined || !new PlayerPuzzleHelper(rules.game, player).hasStarted)
  const close = () => setClosedRound(results?.round)
  return (
    <Dialog open={open} onBackdropClick={close} css={dialogCss}>
      {results && (
        <>
          <h2>{t('results.title', { round: results.round })}</h2>
          <table css={tableCss}>
            <tbody>
              {results.players.map(result => (
                <ResultLine key={result.player} {...result} />
              ))}
            </tbody>
          </table>
          {results.hearts !== undefined && <HeartsMessage hearts={results.hearts} previous={history?.at(-2)?.hearts ?? START_HEARTS} />}
          <ThemeButton onClick={close}>{t('button.continue')}</ThemeButton>
        </>
      )}
    </Dialog>
  )
}

const ResultLine = ({ player, duration, score }: RoundResults['players'][number]) => {
  const { t } = useTranslation()
  const name = usePlayerName(player)
  return (
    <tr>
      <td>{name}</td>
      <td>{duration === undefined ? t('results.gave-up') : formatTime(duration)}</td>
      <td css={scoreCss}>{t('results.score', { score: score > 0 ? `+${score}` : score })}</td>
    </tr>
  )
}

/**
 * In a challenge, the heart lost by a failure or won halfway
 */
const HeartsMessage = ({ hearts, previous }: { hearts: number; previous: number }) => {
  const { t } = useTranslation()
  if (hearts === previous) return null
  return (
    <p>
      {hearts < previous ? t('results.heart.lost') : t('results.heart.won')} {formatHearts(hearts)}
      {hearts === 0 && (
        <>
          <br />
          {t('results.heart.none')}
        </>
      )}
    </p>
  )
}

const dialogCss = css`
  font-size: calc(3em * var(--gp-scale));
  max-width: 90vw;
  text-align: center;

  h2 {
    margin: 0 0 0.5em;
  }
`

const tableCss = css`
  margin: 0 auto 1em;
  border-spacing: 1em 0.3em;
  text-align: left;
`

const scoreCss = css`
  text-align: right;
  font-weight: bold;
`
