import { Memory } from '@gamepark/reflection/rules/Memory'
import { MaterialContext } from '@gamepark/react-game'
import { useSyncExternalStore } from 'react'

/**
 * Size of a grid cell, in em. The grid is centered on the table.
 */
export const CELL = 3

export const getGridSize = (context: MaterialContext) => context.rules.remind<number>(Memory.GridSize)

/**
 * Center of a cell. Use -1 or gridSize to get the clues around the grid.
 */
export const cellCoordinates = (x: number, y: number, gridSize: number) => ({
  x: (x - (gridSize - 1) / 2) * CELL,
  y: (y - (gridSize - 1) / 2) * CELL
})

/**
 * The stock is beside the grid on a landscape screen, above or below it on a portrait screen
 */
const portraitQuery = window.matchMedia('(max-aspect-ratio: 1/1)')

export const isPortrait = () => portraitQuery.matches

export const usePortrait = () =>
  useSyncExternalStore(listener => {
    portraitQuery.addEventListener('change', listener)
    return () => portraitQuery.removeEventListener('change', listener)
  }, isPortrait)

/**
 * Renders again when the window is resized
 */
export const useWindowSize = () =>
  useSyncExternalStore(
    listener => {
      window.addEventListener('resize', listener)
      return () => window.removeEventListener('resize', listener)
    },
    () => `${innerWidth}x${innerHeight}`
  )

/**
 * Space between the centers of 2 piles of the stock, in cells
 */
export const PILE_STEP = 1.1

/**
 * The piles are lined up along the grid and its clues, on as many lines as needed
 */
export const pilesPerLine = (gridSize: number) => Math.floor((gridSize + 2) / PILE_STEP)

export const stockLines = (elements: number, gridSize: number) => Math.max(1, Math.ceil(elements / pilesPerLine(gridSize)))
