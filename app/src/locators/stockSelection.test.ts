import { Element } from '@gamepark/reflection/material/Element'
import { LocationType } from '@gamepark/reflection/material/LocationType'
import { PlayerColor } from '@gamepark/reflection/PlayerColor'
import { MaterialItem } from '@gamepark/rules-api'
import { expect, test, vi } from 'vitest'
import { getMovedElement } from './stockSelection'

// The user interface needs a browser: the moves are compared without it
vi.mock('@gamepark/react-game', () => ({}))
vi.mock('../material/Material', () => ({}))

const me = PlayerColor.Blue
const stock = (id: Element, player = me): MaterialItem => ({ id, location: { type: LocationType.PlayerStock, player } })
const cell = (id: Element, x: number, player = me): MaterialItem => ({ id, location: { type: LocationType.PlayerGrid, player, x, y: 0 } })

test('the pile of an element placed from the stock, or sent back to it, is selected', () => {
  expect(getMovedElement([stock(Element.Slash), stock(Element.Square)], [stock(Element.Slash), cell(Element.Square, 0)], me)).toBe(Element.Square)
  expect(getMovedElement([cell(Element.Slash, 0), stock(Element.Square)], [stock(Element.Slash), stock(Element.Square)], me)).toBe(Element.Slash)
})

test('an element sent back to the stock by the element placed on its cell is selected', () => {
  expect(getMovedElement([stock(Element.Slash), cell(Element.Square, 0)], [cell(Element.Slash, 0), stock(Element.Square)], me)).toBe(Element.Square)
})

test('a move inside the grid, the start of a round and the moves of the other players keep the selection', () => {
  expect(getMovedElement([cell(Element.Slash, 0)], [cell(Element.Slash, 1)], me)).toBeUndefined()
  const deck: MaterialItem = { id: Element.Slash, location: { type: LocationType.MirrorDeck, id: 1, player: me } }
  expect(getMovedElement([deck], [stock(Element.Slash)], me)).toBeUndefined()
  expect(getMovedElement([stock(Element.Slash, PlayerColor.Red)], [cell(Element.Slash, 0, PlayerColor.Red)], me)).toBeUndefined()
})
