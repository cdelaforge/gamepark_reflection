import { Challenge, challenges } from '@gamepark/reflection/Challenge'
import { Memory } from '@gamepark/reflection/rules/Memory'
import { useResultText, useRules } from '@gamepark/react-game'
import { MaterialRules } from '@gamepark/rules-api'
import { useTranslation } from 'react-i18next'

/**
 * A challenge is won or lost, whatever the score: the platform text would always announce a victory
 */
export const ResultHeader = () => {
  const { t } = useTranslation()
  const rules = useRules<MaterialRules>()!
  const resultText = useResultText()
  const challenge = rules.remind<Challenge | undefined>(Memory.Challenge)
  if (!challenge) return <>{resultText}</>
  const goal = challenges[challenge].goal
  const solved = rules.remind<number | undefined>(Memory.Score, rules.players[0]) ?? 0
  return <>{solved === goal ? t('result.challenge.won', { goal }) : t('result.challenge.lost', { solved, goal })}</>
}
