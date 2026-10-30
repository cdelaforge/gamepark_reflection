import { css } from '@emotion/react'
import { faEye, faTrophy } from '@fortawesome/free-solid-svg-icons'
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
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { formatTime } from '../headers/SolvePuzzleHeader'
import portal from '../images/portal.svg?no-inline'
import { getLastRound } from '../laser/laserSelection'
import { ClueTile } from '../locators/ClueLocator'
import { elementImages } from '../material/Material'

/**
 * A button at the top of the screen opens the points of each player for each finished round.
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
  const root = document.getElementById('root')
  const results = rules?.remind<RoundResults[] | undefined>(Memory.RoundResults)
  if (!root || !rules || !results?.length) return null
  const over = rules.isOver()
  const view: RoundView | undefined = over ?(selected ?? getLastRound(rules, me)) : undefined
  const total = (player: PlayerColor) => results.reduce((sum, round) => sum + (round.players.find(result => result.player === player)?.score ?? 0), 0)
  return (
    <>
      {createPortal(
        <ThemeButton css={openButtonCss(players.length)} onClick={() => setOpen(true)}>
          <FontAwesomeIcon icon={faTrophy} /> {t('button.scores')}
        </ThemeButton>,
        root
      )}
      <Dialog open={open} onBackdropClick={() => setOpen(false)} css={dialogCss}>
        <h2>{t('scores.title')}</h2>
        <div css={contentCss}>
          <table css={tableCss}>
            <thead>
              <tr>
                <th />
                {players.map(player => (
                  <th key={player.id}>
                    <PlayerName player={player.id} />
                  </th>
                ))}
                {view && <th>{t('scores.solution-column')}</th>}
              </tr>
            </thead>
            <tbody>
              {results.map(({ round, players: roundPlayers }) => (
                <tr key={round}>
                  <th>{t('results.round', { round })}</th>
                  {players.map(({ id }) => {
                    const result = roundPlayers.find(result => result.player === id)
                    if (!result) return <td key={id} />
                    const score = (
                      <>
                        <span css={scoreCss}>{result.score}</span>
                        <span css={timeCss}>{result.duration === undefined ? t('results.gave-up') : formatTime(result.duration)}</span>
                      </>
                    )
                    return (
                      <td key={id}>
                        {view ? (
                          <button
                            css={[cellButtonCss, view.round === round && !view.solution && view.player === id && selectedCss]}
                            onClick={() => setSelected({ round, player: id })}
                          >
                            {score}
                          </button>
                        ) : (
                          score
                        )}
                      </td>
                    )
                  })}
                  {view && (
                    <td>
                      <button
                        css={[cellButtonCss, view.round === round && view.solution && selectedCss]}
                        title={t('scores.solution')}
                        onClick={() => setSelected({ round, player: view.player, solution: true })}
                      >
                        <FontAwesomeIcon icon={faEye} />
                      </button>
                    </td>
                  )}
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
      {sides.flatMap(side =>
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

// Below the player panels, see PlayerPanels
const openButtonCss = (players: number) => css`
  position: absolute;
  right: ${1 / 2.4}em;
  top: ${(8.5 + players * 16) / 2.4}em;
  font-size: 2.4em;
  background-color: rgba(255, 255, 255, 0.9);
  color: #002448;
  border-color: transparent;
`

const dialogCss = css`
  font-size: calc(3em * var(--gp-scale));
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

// One cell is 1em: the font size fits the grid and its clues in the dialog
const miniGridCss = (size: number) => css`
  position: relative;
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
