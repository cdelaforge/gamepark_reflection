import { ChronoId } from '@gamepark/reflection/material/ChronoId'
import { MaterialType } from '@gamepark/reflection/material/MaterialType'
import { PlayerColor } from '@gamepark/reflection/PlayerColor'
import { CustomMoveType } from '@gamepark/reflection/rules/CustomMoveType'
import { Memory } from '@gamepark/reflection/rules/Memory'
import { PlayerPuzzleHelper } from '@gamepark/reflection/rules/PlayerPuzzleHelper'
import { PlayMoveButton, useNow, usePlay, usePlayerId, useRules } from '@gamepark/react-game'
import { MaterialRules } from '@gamepark/rules-api'
import { useEffect, useRef } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { setShowSolution } from '../laser/laserSelection'
import { useStockNavigation } from '../locators/PlayerStockLocator'
import { useSelectionFollowsMoves } from '../locators/stockSelection'

/**
 * One sentence: what the player must do. The progress, the times and the solution are beside the player panels.
 * The sentence depends on the state of the rules, not on the legal moves: they are not known during the animations.
 */
export const SolvePuzzleHeader = () => {
  const { t } = useTranslation()
  const rules = useRules<MaterialRules>()!
  const player = usePlayerId<PlayerColor>()
  if (player === undefined) return <>{t('header.spectator')}</>
  if (!rules.isTurnToPlay(player)) return <>{t('header.wait')}</>
  if (!new PlayerPuzzleHelper(rules.game, player).hasStarted) {
    const start = rules.material(MaterialType.Chrono).player(player).id(ChronoId.Start).rollItem()
    return <Trans i18nKey="header.start" components={{ start: <PlayMoveButton move={start} onPlay={() => setShowSolution(false)} /> }} />
  }
  // After a give up, the solution is on display until the player continues
  if (new PlayerPuzzleHelper(rules.game, player).hasGivenUp) {
    const continueMove = rules.customMove(CustomMoveType.Continue, player)
    const key = rules.remind(Memory.GivingUp, player) ? 'header.gave-up' : 'header.time-up'
    return <Trans i18nKey={key} components={{ continue: <PlayMoveButton move={continueMove} /> }} />
  }
  return <SolvingHeader player={player} />
}

export const formatHearts = (hearts: number) => (hearts > 0 ? '❤️'.repeat(hearts) : '💔')

export const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

/**
 * The seconds left to a player who started the round
 */
export const getRemainingTime = (rules: MaterialRules, player: PlayerColor, now: number) => {
  const start = rules.material(MaterialType.Chrono).player(player).id(ChronoId.Start).getItem()!.location.rotation as number
  return Math.max(0, start + rules.remind<number>(Memory.TimeLimit) * 60 - Math.floor(now / 1000))
}

/**
 * Gives up automatically when the time is over. The server checks the time anyway.
 */
const SolvingHeader = ({ player }: { player: PlayerColor }) => {
  const { t } = useTranslation()
  const rules = useRules<MaterialRules>()!
  const play = usePlay()
  const now = useNow({ updateRate: 1000 })
  const giveUp = rules.customMove(CustomMoveType.GiveUp, player)
  const timeUp = getRemainingTime(rules, player, now) === 0
  // Sent once: the header can be displayed after the time limit (the player comes back), and React runs the effects twice in development
  const gaveUp = useRef(false)
  useEffect(() => {
    if (!timeUp || gaveUp.current) return
    gaveUp.current = true
    play(giveUp)
  }, [timeUp])
  useSelectionFollowsMoves(player)
  useStockNavigation(player)
  return <Trans i18nKey="header.solving" components={{ giveUp: <PlayMoveButton move={giveUp} confirmation={{ text: t('give-up.confirm') }} /> }} />
}
