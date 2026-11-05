import { ReflectionOptionsSpecV2 } from '@gamepark/reflection/ReflectionOptions'
import { ReflectionRules } from '@gamepark/reflection/ReflectionRules'
import { ReflectionSetup } from '@gamepark/reflection/ReflectionSetup'
import { RuleId } from '@gamepark/reflection/rules/RuleId'
import { css } from '@emotion/react'
import { GameProvider } from '@gamepark/react-game'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { gameAnimations } from './animations/GameAnimations'
import { App } from './App'
import { RulesHelp } from './dialogs/RulesHelp'
import { ResultHeader } from './headers/ResultHeader'
import space from './images/space.webp'
import { Locators } from './locators/Locators'
import { Material } from './material/Material'
import { Tutorial } from './tutorial/Tutorial'

// A dialog opened from the header (the give up confirmation) inherits the white header buttons: follow the dialog color instead
// No scoring details: only the result text changes, for the challenges
const scoring = { getScoringKeys: () => [], getScoringHeader: () => '', getScoringPlayerData: () => null, ResultHeader }

const theme = {
  root: {
    background: { image: space, overlay: 'rgba(0, 0, 0, 0.2)' }
  },
  // The header of a portrait screen is narrow: the sentence goes on several lines (up to 3) instead of hiding its button,
  // out of the platform buttons (wider on the right with the undo button)
  header: {
    bar: css`
      @media (max-aspect-ratio: 1/1) {
        box-sizing: border-box;
        padding: 0 16em 0 9em;

        h1 {
          white-space: normal;
          // The room between the platform buttons depends on the size of the interface: the sentence keeps to 2 lines
          font-size: min(2em, (100vw - 25em) / 17);
          line-height: 1.15;
          margin: 0.1em 0;
        }
      }
    `
  },
  // The dialog buttons have no hover of their own, or the dark one of the header for the give up confirmation: the light one of the table buttons
  dialog: {
    buttons: css`
      color: inherit;
      border-color: currentColor;

      &:focus,
      &:hover {
        background: var(--gp-on-surface-focus);
      }

      &:active {
        background: var(--gp-on-surface-active);
      }
    `
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameProvider
      game="reflection"
      Rules={ReflectionRules}
      optionsSpec={ReflectionOptionsSpecV2}
      GameSetup={ReflectionSetup}
      material={Material}
      locators={Locators}
      animations={gameAnimations}
      theme={theme}
      scoring={scoring}
      rulesHelp={{ [RuleId.SolvePuzzle]: RulesHelp }}
      tutorial={new Tutorial()}
    >
      <App />
    </GameProvider>
  </StrictMode>
)
