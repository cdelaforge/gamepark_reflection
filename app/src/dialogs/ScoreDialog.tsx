import { css } from '@emotion/react'
import { faChevronLeft, faChevronRight, faEye, faTrophy } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Grid, Side, sides, traceLaser } from '@gamepark/reflection/laser/Laser'
import { Puzzle } from '@gamepark/reflection/laser/PuzzleGenerator'
import { Element } from '@gamepark/reflection/material/Element'
import { PlayerColor } from '@gamepark/reflection/PlayerColor'
import { Memory } from '@gamepark/reflection/rules/Memory'
import { PlayerPuzzleHelper } from '@gamepark/reflection/rules/PlayerPuzzleHelper'
import { RoundResults } from '@gamepark/reflection/rules/SolvePuzzleRule'
import { Dialog, ThemeButton, usePlayerId, usePlayerName, usePlayers, useRules } from '@gamepark/react-game'
import { MaterialRules } from '@gamepark/rules-api'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatTime } from '../headers/SolvePuzzleHeader'
import portal from '../images/portal.svg?no-inline'
import { getLastRound } from '../laser/laserSelection'
import { ClueTile } from '../locators/ClueLocator'
import { usePortrait } from '../locators/Layout'
import { elementImages } from '../material/Material'

/**
 * A button beside the player panels opens the points of each player for each finished round.
 * At the end of the game, a click on a score displays the final grid of that player for that round, given up or not,
 * and a click in the last column displays the solution expected for the round.
 */
export const ScoreDialog = () => {
  const { t } = useTranslation()
  const rules = useRules<MaterialRules>()
  const me = usePlayerId<PlayerColor>()
  const players = usePlayers<PlayerColor>({ sortFromMe: true })
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<RoundView>()
  const [portraitRound, setPortraitRound] = useState<number>()
  const portrait = usePortrait()
  const results = rules?.remind<RoundResults[] | undefined>(Memory.RoundResults)
  if (!rules || !results?.length) return null
  const over = rules.isOver()
  const view: RoundView | undefined = over ? (selected ?? getLastRound(rules, me)) : undefined
  const total = (player: PlayerColor) => results.reduce((sum, round) => sum + (round.players.find((result) => result.player === player)?.score ?? 0), 0)
  const scoreCell = (round: number, player: PlayerColor) => {
    const result = results.find((results) => results.round === round)?.players.find((result) => result.player === player)
    if (!result) return <td key={player} />
    const score = (
      <>
        <span css={scoreCss}>{result.score}</span>
        <span css={timeCss}>{result.duration === undefined ? t('results.gave-up') : formatTime(result.duration)}</span>
      </>
    )
    return (
      <td key={player}>
        {view ? (
          <button
            css={[cellButtonCss, view.round === round && !view.solution && view.player === player && selectedCss]}
            onClick={() => setSelected({ round, player })}
          >
            {score}
          </button>
        ) : (
          score
        )}
      </td>
    )
  }
  const solutionButton = (round: number) =>
    view && (
      <button
        css={[cellButtonCss, view.round === round && view.solution && selectedCss]}
        title={t('scores.solution')}
        onClick={() => setSelected({ round, player: view.player, solution: true })}
      >
        <FontAwesomeIcon icon={faEye} />
      </button>
    )
  // On a portrait screen, one line per player and one round at a time: the table fits the width whatever the number of players
  const rounds = results.map(({ round }) => round)
  const round = view?.round ?? portraitRound ?? rounds[rounds.length - 1]
  const showRound = (step: number) => {
    const next = rounds[rounds.indexOf(round) + step]
    if (view) setSelected({ ...view, round: next })
    else setPortraitRound(next)
  }
  return (
    <>
      <ThemeButton css={tableButtonCss} onClick={() => setOpen(true)}>
        <FontAwesomeIcon icon={faTrophy} /> {t('button.scores')}
      </ThemeButton>
      <Dialog open={open} onBackdropClick={() => setOpen(false)} css={dialogCss}>
        <h2>{t('scores.title')}</h2>
        <div css={contentCss}>
          {portrait ? (
            <table css={tableCss}>
              <thead>
                <tr>
                  <th />
                  <th css={roundHeaderCss}>
                    <button css={arrowCss} disabled={round === rounds[0]} aria-label={t('scores.previous')} onClick={() => showRound(-1)}>
                      <FontAwesomeIcon icon={faChevronLeft} />
                    </button>
                    {t('results.round', { round })}
                    <button css={arrowCss} disabled={round === rounds[rounds.length - 1]} aria-label={t('scores.next')} onClick={() => showRound(1)}>
                      <FontAwesomeIcon icon={faChevronRight} />
                    </button>
                  </th>
                  <th>{t('scores.total')}</th>
                </tr>
              </thead>
              <tbody>
                {players.map(({ id }) => (
                  <tr key={id}>
                    <th css={nameCss}>
                      <PlayerName player={id} />
                    </th>
                    {scoreCell(round, id)}
                    <td>
                      <span css={scoreCss}>{total(id)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              {view && (
                <tfoot>
                  <tr>
                    <th>{t('scores.solution-column')}</th>
                    <td>{solutionButton(round)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          ) : (
            <table css={tableCss}>
              <thead>
                <tr>
                  <th />
                  {players.map((player) => (
                    <th key={player.id}>
                      <PlayerName player={player.id} />
                    </th>
                  ))}
                  {view && <th>{t('scores.solution-column')}</th>}
                </tr>
              </thead>
              <tbody>
                {rounds.map((round) => (
                  <tr key={round}>
                    <th>{t('results.round', { round })}</th>
                    {players.map(({ id }) => scoreCell(round, id))}
                    {view && <td>{solutionButton(round)}</td>}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th>{t('scores.total')}</th>
                  {players.map(({ id }) => (
                    <td key={id}>
                      <span css={scoreCss}>{total(id)}</span>
                    </td>
                  ))}
                  {view && <td />}
                </tr>
              </tfoot>
            </table>
          )}
          {view && <RoundGrid {...view} />}
        </div>
        <ThemeButton onClick={() => setOpen(false)}>{t('button.close')}</ThemeButton>
      </Dialog>
    </>
  )
}

const PlayerName = ({ player }: { player: PlayerColor }) => <>{usePlayerName(player)}</>

/**
 * The round chosen in the table: the final grid of a player, or the solution expected by the game
 */
type RoundView = { round: number; player: PlayerColor; solution?: boolean }

const RoundGrid = ({ round, player, solution }: RoundView) => {
  const { t } = useTranslation()
  const rules = useRules<MaterialRules>()!
  const name = usePlayerName(player)
  const history = new PlayerPuzzleHelper(rules.game, player).getRound(round)
  const grid = solution ? history.solution : history.grid
  if (!history.puzzle || !grid) return null
  return (
    <figure css={figureCss}>
      <figcaption>
        {t('results.round', { round })} : {solution ? t('scores.solution') : name}
      </figcaption>
      <MiniGrid puzzle={history.puzzle} grid={grid} />
    </figure>
  )
}

/**
 * A grid and its clues, red where the grid does not match the clue
 */
const MiniGrid = ({ puzzle, grid }: { puzzle: Puzzle; grid: Grid }) => {
  const size = grid.length
  return (
    <div css={miniGridCss(size)}>
      {grid.flatMap((cells, row) =>
        cells.map((element, col) => (
          <div key={`${row}-${col}`} css={[cellCss, positionCss(row + 1, col + 1)]}>
            {element !== 0 && <img src={element === Element.Portal ? portal : elementImages[element]} alt="" css={fullSize} />}
          </div>
        ))
      )}
      {sides.flatMap((side) =>
        puzzle.clues[side].map((target, index) => {
          const [row, col] = cluePosition(side, index, size)
          return (
            <div key={`${side}-${index}`} css={positionCss(row, col)}>
              <ClueTile target={target} current={traceLaser(grid, side, index).clue} />
            </div>
          )
        })
      )}
    </div>
  )
}

// Row and column in the mini grid, the clues taking the first and last rows and columns
function cluePosition(side: Side, index: number, size: number) {
  switch (side) {
    case Side.Top:
      return [0, index + 1]
    case Side.Right:
      return [index + 1, size + 1]
    case Side.Bottom:
      return [size + 1, index + 1]
    case Side.Left:
      return [index + 1, 0]
  }
}

/**
 * The buttons beside the player panels, see RoundInfo
 */
export const tableButtonCss = css`
  font-size: 2.4em;
  background-color: rgba(255, 255, 255, 0.9);
  color: #002448;
  border-color: transparent;
`

// On a narrow screen, the text gets smaller so that the table fits the width
const dialogCss = css`
  font-size: min(3em * var(--gp-scale), 4.5vw);
  max-width: 90vw;
  max-height: 90vh;
  overflow: auto;
  text-align: center;

  h2 {
    margin: 0 0 0.5em;
  }
`

const contentCss = css`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-start;
  gap: 1em;
  margin-bottom: 1em;
`

const tableCss = css`
  border-collapse: collapse;

  th,
  td {
    padding: 0.2em 0.5em;
    text-align: center;
    white-space: nowrap;
  }

  thead th {
    max-width: 7em;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  tbody th,
  tfoot th {
    text-align: left;
  }

  tbody tr:nth-of-type(odd) {
    background-color: rgba(0, 0, 0, 0.06);
  }

  tfoot {
    border-top: 0.1em solid currentColor;
  }
`

const scoreCss = css`
  display: block;
  font-weight: bold;
`

const timeCss = css`
  display: block;
  font-size: 0.6em;
  opacity: 0.7;
`

const cellButtonCss = css`
  all: unset;
  cursor: pointer;
  box-sizing: border-box;
  width: 100%;
  padding: 0.1em 0.3em;
  border-radius: 0.3em;
  border: 0.1em solid transparent;

  &:hover {
    border-color: currentColor;
  }
`

const nameCss = css`
  max-width: 7em;
  overflow: hidden;
  text-overflow: ellipsis;
`

// Unlike the names of the players, the round and its arrows are never cut
const roundHeaderCss = css`
  && {
    max-width: none;
  }
`

const arrowCss = css`
  all: unset;
  cursor: pointer;
  padding: 0 0.4em;

  &:disabled {
    cursor: default;
    opacity: 0.25;
  }
`

const selectedCss = css`
  background-color: #ffd700;
  color: #002448;
`

const figureCss = css`
  margin: 0;

  figcaption {
    margin-bottom: 0.3em;
    font-weight: bold;
  }
`

// One cell is 1em: the font size fits the grid and its clues in the dialog.
// Centered below a caption wider than the grid.
const miniGridCss = (size: number) => css`
  position: relative;
  margin: 0 auto;
  font-size: min(2em, ${50 / (size + 2)}vw, ${50 / (size + 2)}vh);
  width: ${size + 2}em;
  height: ${size + 2}em;
`

const positionCss = (row: number, col: number) => css`
  position: absolute;
  top: ${row}em;
  left: ${col}em;
  width: 1em;
  height: 1em;
`

const cellCss = css`
  box-sizing: border-box;
  background-color: #55586b;
  border: 0.05em solid #0a0a0a;
`

const fullSize = css`
  display: block;
  width: 100%;
  height: 100%;
`
