/**
 * The solo game is a challenge: solve a number of puzzles in a row, with a heart to survive a failure
 */
export enum Challenge {
  Easy = 1,
  Medium,
  Hard
}

/**
 * The puzzles to solve to win the challenge, the minimum number of elements and the maximum minutes per puzzle
 */
export const challenges: Record<Challenge, { goal: number; items?: number; timeLimit?: number }> = {
  [Challenge.Easy]: { goal: 3 },
  [Challenge.Medium]: { goal: 6, items: 10, timeLimit: 15 },
  [Challenge.Hard]: { goal: 10, items: 15, timeLimit: 10 }
}

/**
 * The player starts with a heart, loses one for each failure, and the game is lost on a failure without any heart left.
 * Halfway to the goal, the player wins a heart.
 */
export const START_HEARTS = 1

/**
 * The most puzzles a challenge can last: every puzzle but the last solved, and a failure for each heart plus the last one
 */
export const maxPuzzles = (goal: number) => goal - 1 + START_HEARTS + (goal % 2 === 0 ? 1 : 0) + 1
