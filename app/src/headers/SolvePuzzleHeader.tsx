import { Challenge, challenges } from '@gamepark/reflection/Challenge'
import { ChronoId } from '@gamepark/reflection/material/ChronoId'
import { MaterialType } from '@gamepark/reflection/material/MaterialType'
import { PlayerColor } from '@gamepark/reflection/PlayerColor'
import { CustomMoveType } from '@gamepark/reflection/rules/CustomMoveType'
import { Memory } from '@gamepark/reflection/rules/Memory'
import { PlayerPuzzleHelper } from '@gamepark/reflection/rules/PlayerPuzzleHelper'
import { PlayMoveButton, ThemeButton, useLegalMove, useNow, usePlay, usePlayerId, useRules } from '@gamepark/react-game'
import { CustomMove, isCustomMoveType, isRollItemType, MaterialMove, MaterialRules } from '@gamepark/rules-api'
import { useEffect } from 'react'
import { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { setShowSolution, useShowSolution } from '../laser/laserSelection'

export const SolvePuzzleHeader = () => {
  const { t } = useTranslation()
  const rules = useRules<MaterialRules>()!
  const start = useLegalMove<MaterialMove>(isRollItemType(MaterialType.Chrono))
  const giveUp = useLegalMove<MaterialMove>(isCustomMoveType(CustomMoveType.GiveUp))
  const round = { progress: getProgress(rules, t) }
  if (start) {
    return (
      <>
        <RoundResult />
        {t('header.start', round)}{' '}
        <PlayMoveButton move={start} onPlay={() => setShowSolution(false)}>
          {t('button.start')}
        </PlayMoveButton>
      </>
    )
  }
  if (giveUp) return <SolvingHeader giveUp={giveUp as CustomMove} round={round} />
  return (
    <>
      <RoundResult />
      {t('header.wait', round)}
    </>
  )
}

/**
 * The result of the player's last round: their time when they solved it, or the switch to see the solution when they gave up
 */
const RoundResult = () => {
  const { t } = useTranslation()
  const rules = useRules<MaterialRules>()!
  const player = usePlayerId<PlayerColor>()
  const showSolution = useShowSolution()
  if (player === undefined) return null
  const duration = rules.remind<number | undefined>(Memory.Duration, player)
  if (duration !== undefined) return <>{t('header.solved', { time: formatTime(duration) })} </>
  if (!new PlayerPuzzleHelper(rules.game, player).solution) return null
  // The last action of the player is a give up: before the time limit, it was on purpose
  const chrono = (id: ChronoId) => rules.material(MaterialType.Chrono).player(player).id(id).getItem()!.location.rotation as number
  const timeUp = chrono(ChronoId.Last) - chrono(ChronoId.Start) >= rules.remind<number>(Memory.TimeLimit) * 60
  return (
    <>
      {timeUp ? t('header.time-up') : t('header.gave-up')}{' '}
      <ThemeButton onClick={() => setShowSolution(!showSolution)}>{showSolution ? t('button.show-grid') : t('button.show-solution')}</ThemeButton>{' '}
    </>
  )
}

/**
 * The current round, or in a challenge, the puzzles solved and the hearts left
 */
const getProgress = (rules: MaterialRules, t: TFunction) => {
  const challenge = rules.remind<Challenge | undefined>(Memory.Challenge)
  if (!challenge) return t('header.round', { round: rules.remind<number>(Memory.Round), rounds: rules.remind<number>(Memory.Rounds) })
  const solved = rules.remind<number | undefined>(Memory.Score, rules.players[0]) ?? 0
  return `${t('header.challenge', { solved, goal: challenges[challenge].goal })} ${formatHearts(rules.remind<number>(Memory.Hearts))}`
}

export const formatHearts = (hearts: number) => (hearts > 0 ? '❤️'.repeat(hearts) : '💔')

export const formatTime =(seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

type SolvingHeaderProps = { giveUp: CustomMove; round: { progress: string } }

/**
 * Displays the remaining time, and gives up automatically when it is over. The server checks the time anyway.
 */
const SolvingHeader = ({ giveUp, round }: SolvingHeaderProps) => {
  const { t } = useTranslation()
  const rules = useRules<MaterialRules>()!
  const player = usePlayerId<PlayerColor>()!
  const play = usePlay()
  const now = useNow({ updateRate: 1000 })
  const start = rules.material(MaterialType.Chrono).player(player).id(ChronoId.Start).getItem()!.location.rotation as number
  const remaining = Math.max(0, start + rules.remind<number>(Memory.TimeLimit) * 60 - Math.floor(now / 1000))
  const timeUp = remaining === 0
  useEffect(() => {
    if (timeUp) play(giveUp)
  }, [timeUp])
  // An element is always selected while the stock is not empty: by default the top of the first pile
  const stock = new PlayerPuzzleHelper(rules.game, player).stock
  const firstPileTop = stock.selected().length ? undefined : stock.id(Math.min(...stock.getItems().map(item => item.id))).getIndexes().pop()
  useEffect(() => {
    if (firstPileTop !== undefined) play(rules.material(MaterialType.Mirror).index(firstPileTop).selectItem(), { local: true })
  }, [firstPileTop])
  return (
    <>
      {t('header.solving', { ...round, time: formatTime(remaining) })}{' '}
      <PlayMoveButton move={giveUp} confirmation={{ text: t('give-up.confirm') }}>
        {t('button.give-up')}
      </PlayMoveButton>
    </>
  )
}
