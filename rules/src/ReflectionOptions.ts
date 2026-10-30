import { getEnumValues, OptionsSpecV2 } from '@gamepark/rules-api'
import { Challenge } from './Challenge'
import { PlayerColor } from './PlayerColor'
import { SpecialShapes } from './SpecialShapes'

/**
 * This is the options for each player in the game.
 */
type PlayerOptions = { id: PlayerColor }

/**
 * This is the type of object that the game receives when a new game is started.
 */
export type ReflectionOptions = {
  players: PlayerOptions[]
  gridSize: number
  items: number
  blackHoles: boolean
  lightWarps: boolean
  specialShapes: SpecialShapes
  timeLimit: number
  // Several players play a number of rounds, a single player plays a challenge
  rounds?: number
  challenge?: Challenge
}

const range = (min: number, max: number) => Array.from({ length: max - min + 1 }, (_, i) => min + i)

/**
 * The structure of everything a host can choose before the game starts — and nothing else.
 *
 * Two things are deliberately absent, both because they change without the game changing:
 *
 * - **Text.** No labels, no help. They live in `app/public/options/<locale>.json`, published beside the
 *   game's translations and keyed by convention: `option.<option>`, `option.<option>.<value>`,
 *   `identities.<value>`, plus optional `.help` variants. See the files in that folder.
 * - **Subscription and competitive gates.** Which options require a subscription, and which are allowed
 *   in ranked play, are the platform's decisions. They live in its database and are edited there.
 *
 * The declaration is plain JSON on purpose: the platform snapshots it when the bundle is prepared, so
 * every screen reads the option space without downloading and running a game bundle.
 *
 * `players` must match the range declared for the game on the platform — it is the root that every other
 * range narrows, and a disagreement silently changes which tables exist.
 */
export const ReflectionOptionsSpecV2: OptionsSpecV2 = {
  specVersion: 2,
  players: { min: 1, max: 6 },
  identities: { values: getEnumValues(PlayerColor) },
  options: {
    gridSize: { kind: 'enum', values: range(4, 12) },
    items: { kind: 'enum', values: range(3, 30) },
    blackHoles: { kind: 'boolean' },
    lightWarps: { kind: 'boolean' },
    specialShapes: { kind: 'enum', values: getEnumValues(SpecialShapes) },
    timeLimit: { kind: 'enum', values: [2, 5, 10, 15, 20, 25, 30, 60] },
    rounds: { kind: 'enum', playerCount: { min: 2 }, values: [1, 3, 5] },
    challenge: { kind: 'enum', playerCount: { max: 1 }, values: getEnumValues(Challenge) }
  }
}
