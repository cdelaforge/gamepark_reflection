import { Side } from '@gamepark/reflection/laser/Laser'
import { Element } from '@gamepark/reflection/material/Element'
import { LocationType } from '@gamepark/reflection/material/LocationType'
import { MaterialType } from '@gamepark/reflection/material/MaterialType'
import { PlayerColor } from '@gamepark/reflection/PlayerColor'
import { ReflectionOptions } from '@gamepark/reflection/ReflectionOptions'
import { SpecialShapes } from '@gamepark/reflection/SpecialShapes'
import { MaterialTutorial, TutorialStep } from '@gamepark/react-game'
import { isMoveItemType, isRollItemType, Location, MaterialGame, MaterialMove } from '@gamepark/rules-api'
import { tutorialSolution, TutorialSetup } from './TutorialSetup'

const me = PlayerColor.Blue
const opponent = PlayerColor.Red

/**
 * Places an element of the stock on a cell of the grid: an element of the same kind already on the grid must not move instead
 */
const place = (element: Element, x: number, y: number) => (move: MaterialMove, game: MaterialGame) => {
  if (!isMoveItemType(MaterialType.Mirror)(move) || move.location.type !== LocationType.PlayerGrid) return false
  const mirror = game.items[MaterialType.Mirror]![move.itemIndex]
  return move.location.x === x && move.location.y === y && mirror.id === element && mirror.location.type === LocationType.PlayerStock
}

const clue = (side: Side, index: number) => ({ type: LocationType.Clue, id: side, x: index })
const cell = (x: number, y: number) => ({ type: LocationType.PlayerGrid, player: me, x, y })
const pile = (element: Element) => ({ type: LocationType.PlayerStock, player: me, id: element })

/**
 * The focused locations get a golden frame (see FocusHighlight). The framework would also dim the items that are not focused,
 * such as the elements already placed: the table has no zoom, the frames are enough.
 */
const focus = (...locations: Location[]) => () => ({ locations, highlight: undefined })

// The popups of the moves stay above or below the cells to click
const below = { y: 30 }
const above = { y: -25 }

/**
 * A 2 players game of one round: the opponent starts first and finishes last, so the player wins
 */
export class Tutorial extends MaterialTutorial<PlayerColor, MaterialType, LocationType> {
  version = 1
  options: ReflectionOptions = {
    players: [{ id: me }, { id: opponent }],
    gridSize: 5,
    items: 5,
    blackHoles: true,
    lightWarps: false,
    specialShapes: SpecialShapes.None,
    // Plenty of time to read the tutorial
    timeLimit: 60,
    rounds: 1
  }
  setup = new TutorialSetup()
  players = [{ id: me }, { id: opponent, name: 'Hector' }]

  steps: TutorialStep<PlayerColor, MaterialType, LocationType>[] = [
    { popup: { text: t => t('tuto.welcome') } },
    { move: { player: opponent, filter: isRollItemType(MaterialType.Chrono) } },
    { popup: { text: t => t('tuto.start') }, move: { filter: isRollItemType(MaterialType.Chrono) } },
    {
      popup: { text: t => t('tuto.clues'), position: below },
      focus: focus(...[0, 1, 2, 3, 4].map(index => clue(Side.Top, index)))
    },
    { popup: { text: t => t('tuto.colors') } },
    {
      popup: { text: t => t('tuto.stock'), position: below },
      focus: focus(...[Element.Slash, Element.BackSlash, Element.Vertical, Element.BlackHole].map(pile))
    },
    {
      popup: { text: t => t('tuto.vertical'), position: above },
      focus: focus(clue(Side.Left, 3), cell(0, 3), pile(Element.Vertical)),
      move: { filter: place(Element.Vertical, 0, 3) }
    },
    {
      popup: { text: t => t('tuto.black-hole'), position: below },
      focus: focus(clue(Side.Right, 2), cell(3, 2), pile(Element.BlackHole)),
      move: { filter: place(Element.BlackHole, 3, 2) }
    },
    {
      popup: { text: t => t('tuto.backslash'), position: below },
      focus: focus(clue(Side.Top, 4), clue(Side.Right, 1), cell(4, 1), pile(Element.BackSlash)),
      move: { filter: place(Element.BackSlash, 4, 1) }
    },
    { popup: { text: t => t('tuto.laser') } },
    {
      popup: { text: t => t('tuto.slash'), position: below },
      focus: focus(clue(Side.Top, 1), clue(Side.Left, 1), cell(1, 1), pile(Element.Slash)),
      move: { filter: place(Element.Slash, 1, 1) }
    },
    { popup: { text: t => t('tuto.last'), position: above }, move: { filter: place(Element.Slash, 2, 4) } },
    { popup: { text: t => t('tuto.solved') } },
    { popup: { text: t => t('tuto.wait') } },
    // The opponent solves the same puzzle, after the player
    ...tutorialSolution.flatMap((cells, y) => cells.flatMap((element, x) => (element ? [{ move: { player: opponent, filter: place(element, x, y) } }] : []))),
    { popup: { text: t => t('tuto.end') } }
  ]
}
