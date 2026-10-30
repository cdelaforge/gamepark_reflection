import { LocationType } from '@gamepark/reflection/material/LocationType'
import { MaterialType } from '@gamepark/reflection/material/MaterialType'
import { PlayerColor } from '@gamepark/reflection/PlayerColor'
import { Locator } from '@gamepark/react-game'
import { clueLocator } from './ClueLocator'
import { laserLocator } from './LaserLocator'
import { playerGridLocator } from './PlayerGridLocator'
import { playerStockLocator } from './PlayerStockLocator'
import { roundHistoryLocator } from './RoundHistoryLocator'

class HiddenLocator extends Locator {
  hide() {
    return true
  }
}

export const Locators: Partial<Record<LocationType, Locator<PlayerColor, MaterialType, LocationType>>> = {
  [LocationType.MirrorDeck]: new HiddenLocator(),
  [LocationType.PlayerStock]: playerStockLocator,
  [LocationType.PlayerGrid]: playerGridLocator,
  [LocationType.Clue]: clueLocator,
  [LocationType.Laser]: laserLocator,
  [LocationType.RoundHistory]: roundHistoryLocator
}
