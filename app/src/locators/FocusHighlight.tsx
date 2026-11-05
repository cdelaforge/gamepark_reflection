import { css, keyframes } from '@emotion/react'
import { useFocusContext } from '@gamepark/react-game'
import { Location } from '@gamepark/rules-api'

/**
 * A golden frame on a location focused by the tutorial. The table has no zoom, so the framework does not show the focused locations:
 * only the content of our locations can show them.
 */
export function FocusHighlight({ location }: { location: Location }) {
  const { focus } = useFocusContext()
  const focused = focus?.locations.some(
    focused =>
      focused.type === location.type &&
      focused.id === location.id &&
      focused.x === location.x &&
      focused.y === location.y &&
      (focused.player === undefined || focused.player === location.player)
  )
  return focused ? <div css={highlightCss} /> : null
}

const pulse = keyframes`
  from { box-shadow: 0 0 0.2em 0.1em #ffd700; }
  to { box-shadow: 0 0 0.8em 0.3em #ffd700; }
`

const highlightCss = css`
  position: absolute;
  inset: -0.05em;
  border: 0.2em solid #ffd700;
  border-radius: 0.2em;
  pointer-events: none;
  z-index: 1;
  animation: ${pulse} 0.8s ease-in-out infinite alternate;
`
