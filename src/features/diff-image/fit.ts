type Budget = {
  imageWidth: number
  imageHeight: number
  maxColumns: number
  maxRows: number
  cellAspect: number
}

export function fit(budget: Budget) {
  for (let columns = budget.maxColumns; columns > 0; columns--) {
    const rows = rowsFor(columns, budget)

    if (rows <= budget.maxRows) return { columns, rows }
  }

  return { columns: 1, rows: 1 }
}

function rowsFor(columns: number, budget: Budget) {
  const exact =
    (columns * budget.imageHeight) / budget.imageWidth / budget.cellAspect

  return Math.max(1, Math.round(exact))
}
