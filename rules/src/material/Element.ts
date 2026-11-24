/**
 * The elements a player can place on their grid. The values match the laser deflections in Laser.ts.
 */
export enum Element {
  Slash = 1,
  BackSlash,
  Vertical,
  Horizontal,
  Square,
  BlackHole,
  Portal,
  TriangleA,
  TriangleB,
  TriangleC,
  TriangleD,
  // The same orientations as the triangles: the 2 sides of the right angle return the laser, the diagonal absorbs it
  AbsorbingTriangleA,
  AbsorbingTriangleB,
  AbsorbingTriangleC,
  AbsorbingTriangleD
}
