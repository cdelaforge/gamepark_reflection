import { RuleId } from '@gamepark/reflection/rules/RuleId'
import { ComponentType } from 'react'
import { SolvePuzzleHeader } from './SolvePuzzleHeader'

export const Headers: Partial<Record<RuleId, ComponentType>> = {
  [RuleId.SolvePuzzle]: SolvePuzzleHeader
}
