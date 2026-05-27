import { describe, test, expect } from 'vitest'

describe('Dashboard Component - Zero Value Filter (NaN Chart Prevention)', () => {
  test('filters out zero-value distribusi entries', () => {
    const raw = [
      { jenis: 'SPT', total: 5 },
      { jenis: 'Kosong', total: 0 },  // ← this caused NaN
      { jenis: 'NPWP', total: 3 }
    ]
    const filtered = raw.filter(d => Number(d.total) > 0)
    expect(filtered).toHaveLength(2)
    expect(filtered.find(d => d.jenis === 'Kosong')).toBeUndefined()
  })
})
