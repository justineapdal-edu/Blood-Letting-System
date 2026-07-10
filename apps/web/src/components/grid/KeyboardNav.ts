export type CellPosition = { row: number; col: number }

export type GridDimensions = { rows: number; cols: number }

export function navigateCell(
  pos: CellPosition,
  dims: GridDimensions,
  key: string,
): CellPosition {
  const { row, col } = pos
  const { rows, cols } = dims

  switch (key) {
    case 'ArrowDown':
      return { row: Math.min(row + 1, rows - 1), col }
    case 'ArrowUp':
      return { row: Math.max(row - 1, 0), col }
    case 'ArrowRight':
      return { row, col: Math.min(col + 1, cols - 1) }
    case 'ArrowLeft':
      return { row, col: Math.max(col - 1, 0) }
    case 'Tab':
      return { row: col + 1 >= cols ? row + 1 : row, col: col + 1 >= cols ? 0 : col + 1 }
    case 'Enter':
      return { row: Math.min(row + 1, rows - 1), col }
    default:
      return pos
  }
}
