import { css } from '@emotion/react'
import { PlayerColor } from '@gamepark/reflection/PlayerColor'
import { Memory } from '@gamepark/reflection/rules/Memory'
import { StyledPlayerPanel, usePlayers, useRules } from '@gamepark/react-game'
import { MaterialRules } from '@gamepark/rules-api'
import { createPortal } from 'react-dom'
import score from '../images/score.svg?no-inline'

export const PlayerPanels = () => {
  const players = usePlayers<PlayerColor>({ sortFromMe: true })
  const rules = useRules<MaterialRules>()
  const root = document.getElementById('root')
  if (!root || !rules) {
    return null
  }

  return createPortal(
    <>
      {players.map((player, index) => (
        <StyledPlayerPanel
          key={player.id}
          player={player}
          css={panelPosition(index)}
          activeRing
          mainCounter={{ image: score, value: rules.remind<number | undefined>(Memory.Score, player.id) ?? 0 }}
        />
      ))}
    </>,
    root
  )
}

const panelPosition = (index: number) => css`
  position: absolute;
  right: 1em;
  top: ${8.5 + index * 16}em;
  width: 28em;
`
