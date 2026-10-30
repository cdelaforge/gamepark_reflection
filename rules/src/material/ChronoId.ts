/**
 * Each player owns a Start and a Last chrono. Rolling a chrono stores the server time (in seconds) in its location rotation.
 * Start is rolled when the player starts the puzzle, Last after each of their actions.
 */
export enum ChronoId {
  Start = 1,
  Last
}
