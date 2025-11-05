import { describe, expect, it } from 'vitest';
import { aggregate, parseLines } from './core.js';

describe('Q2 core', () => {
  it('parseLines: skips broken rows', () => {
    const rows = parseLines([
      '2025-01-03T10:12:00Z,u1,/a,200,100',
      'broken,row,only,three',
    ]);
    expect(rows.length).toBe(1);
  });

  it('aggregate basic', () => {
  const lines = [
    '2025-01-01T00:00:00Z,u1,/api/a,200,100',
    '2025-01-01T01:00:00Z,u2,/api/a,200,300',
    '2025-01-01T02:00:00Z,u3,/api/b,200,200',
  ];

  const result = aggregate(lines, {
    from: '2025-01-01',
    to: '2025-01-01',
    tz: 'ict',
    top: 2,
  });

  expect(result).toEqual([
    { date: '2025-01-01', path: '/api/a', count: 2, avgLatency: 200 },
    { date: '2025-01-01', path: '/api/b', count: 1, avgLatency: 200 },
  ]);
});
});
