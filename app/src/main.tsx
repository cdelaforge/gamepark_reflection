import { ReflectionOptionsSpecV2 } from '@gamepark/reflection/ReflectionOptions'
import { ReflectionRules } from '@gamepark/reflection/ReflectionRules'
import { ReflectionSetup } from '@gamepark/reflection/ReflectionSetup'
import { css } from '@emotion/react'
import { GameProvider } from '@gamepark/react-game'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { gameAnimations } from './animations/GameAnimations'
import { App } from './App'
import { ResultHeader } from './headers/ResultHeader'
import { Locators } from './locators/Locators'
import { Material } from './material/Material'

// A dialog opened from the header (the give up confirmation) inherits the white header buttons: follow the dialog color instead
// No scoring details: only the result text changes, for the challenges
const scoring = { getScoringKeys: () => [], getScoringHeader: () => '', getScoringPlayerData: () => null, ResultHeader }

const theme = {
  dialog: {
    buttons: css`
      color: inherit;
      border-color: currentColor;
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
    >
      <App />
    </GameProvider>
  </StrictMode>
)
