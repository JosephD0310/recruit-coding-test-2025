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

  it('aggregates count and avgLatency by date × path', () => {
    const rows = [
      '2025-01-01T15:00:00Z,u1,/api/orders,200,100', // UTC+7 -> 2025-01-01
      '2025-01-01T16:00:00Z,u2,/api/orders,200,200', // UTC+7 -> 2025-01-01
      '2025-01-01T17:00:00Z,u3,/api/users,200,150',  // UTC+7 -> 2025-01-02
      '2025-01-02T00:30:00Z,u4,/api/orders,200,120', // UTC+7 -> 2025-01-02
      '2025-01-02T01:00:00Z,u5,/api/users,500,300',  // UTC+7 -> 2025-01-02
      '2025-01-02T23:30:00Z,u6,/api/orders,200,80',  // UTC+7 -> 2025-01-03
      '2025-01-03T00:10:00Z,u7,/api/orders,200,90',  // UTC+7 -> 2025-01-03
      '2025-01-03T01:00:00Z,u8,/api/items,200,200',  // UTC+7 -> 2025-01-03
      'invalid_timestamp,u1,/api/orders,200,100',    // broken timestamp
      '2025-01-03T01:30:00Z,u9,/api/orders,200,abc', // broken latency
    ];

    const out = aggregate(rows, {
      from: '2025-01-01',
      to: '2025-01-03',
      tz: 'ict',
      top: 3,
    });

    expect(out).toEqual([
      { date: '2025-01-01', path: '/api/orders', count: 2, avgLatency: 150 },
      { date: '2025-01-02', path: '/api/users', count: 2, avgLatency: 225 },
      { date: '2025-01-02', path: '/api/orders', count: 1, avgLatency: 120 },
      { date: '2025-01-03', path: '/api/orders', count: 2, avgLatency: 85 },
      { date: '2025-01-03', path: '/api/items', count: 1, avgLatency: 200 },
    ]);
  });

  it('aggregate with JST (UTC+9)', () => {
    const rows = [
      '2025-01-01T15:30:00Z,u1,/api/test,200,100', // UTC+9 -> 2025-01-02
      '2025-01-01T17:00:00Z,u2,/api/test,200,200', // UTC+9 -> 2025-01-02
    ];

    const out = aggregate(rows, {
      from: '2025-01-01',
      to: '2025-01-03',
      tz: 'jst',
      top: 3,
    });
    expect(out).toEqual([
      { date: '2025-01-02', path: '/api/test', count: 2, avgLatency: 150 },
    ]);
  });

  it('aggregate with ICT (UTC+7)', () => {
    const rows = [
      '2025-01-01T16:00:00Z,u1,/api/x,200,100', // UTC+7 -> 2025-01-01
      '2025-01-01T18:00:00Z,u2,/api/x,200,200', // UTC+7 -> 2025-01-02
    ];

    const out = aggregate(rows, {
      from: '2025-01-01',
      to: '2025-01-03',
      tz: 'ict',
      top: 3,
    });

    expect(out).toEqual([
      { date: '2025-01-01', path: '/api/x', count: 1, avgLatency: 100 },
      { date: '2025-01-02', path: '/api/x', count: 1, avgLatency: 200 },
    ]);
  });

  it('sort order: date asc, count desc, path asc', () => {
    const rows = [
      '2025-01-02T00:00:00Z,u1,/api/z,200,150',
      '2025-01-02T00:00:00Z,u2,/api/z,200,180',
      '2025-01-02T00:00:00Z,u3,/api/a,200,100',
      '2025-01-01T00:00:00Z,u4,/api/x,200,100',
      '2025-01-01T00:00:00Z,u5,/api/a,200,200',
    ];

    const out = aggregate(rows, {
      from: '2025-01-01',
      to: '2025-01-03',
      tz: 'ict',
      top: 3,
    });

    expect(out).toEqual([
      { date: '2025-01-01', path: '/api/a', count: 1, avgLatency: 200 },
      { date: '2025-01-01', path: '/api/x', count: 1, avgLatency: 100 },
      { date: '2025-01-02', path: '/api/z', count: 2, avgLatency: 165 },
      { date: '2025-01-02', path: '/api/a', count: 1, avgLatency: 100 },
    ]);
  });

  it('handles ties and multiple paths per day', () => {
    const rows = [
      '2025-01-01T00:00:00Z,u1,/api/a,200,100',
      '2025-01-01T00:00:00Z,u2,/api/b,200,200',
      '2025-01-01T01:00:00Z,u3,/api/a,200,150',
      '2025-01-01T01:00:00Z,u4,/api/b,200,250',
      '2025-01-01T02:00:00Z,u5,/api/c,200,300',
    ];

    const out = aggregate(rows, {
      from: '2025-01-01',
      to: '2025-01-03',
      tz: 'ict',
      top: 3,
    });

    expect(out).toEqual([
      { date: '2025-01-01', path: '/api/a', count: 2, avgLatency: 125 },
      { date: '2025-01-01', path: '/api/b', count: 2, avgLatency: 225 },
      { date: '2025-01-01', path: '/api/c', count: 1, avgLatency: 300 },
    ]);
  });
});
