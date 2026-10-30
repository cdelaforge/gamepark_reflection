import { MaterialGameAnimations } from '@gamepark/react-game'

export const gameAnimations = new MaterialGameAnimations()

// A speed game: every move is displayed instantly
gameAnimations.defaults().skip()
