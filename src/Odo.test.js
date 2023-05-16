/**
 * @file these are not the tests you are look... oh, actually.
 */

import Odo from './Odo';

describe('Utils > Odo', () => {
  test('can create a simple object with values and structure', () => {
    const o = new Odo();

    o.setValues([11, 12, 13, 14, 15, 16]);
    o.setStructure({
      a: 0,
      b: 1,
      c: 2,
    });

    expect(o.export()).toEqual({
      a: 11,
      b: 12,
      c: 13,
    });
  });

  test('can support creating lists of values', () => {
    const o = new Odo();

    o.setValues([11, 12, 13, 14, 15, 16]);
    o.setStructure({
      a: 0,
      b: 1,
      c: 2,
      list: [3, 6],
    });

    expect(o.export()).toEqual({
      a: 11,
      b: 12,
      c: 13,
      list: [14, 15, 16],
    });
  });

  test('can support transforming both single values and ranges', () => {
    const o = new Odo();

    o.setValues([11, 12, 13, 14, 15, 16]);
    o.setStructure({
      a: [0, (v) => v * 100],
      b: [1, (v) => v * 50],
      c: [2, (v) => v * 0],
      list: [3, 6, (list) => list.map((v) => v + 10)],
    });

    expect(o.export()).toEqual({
      a: 1100,
      b: 600,
      c: 0,
      list: [24, 25, 26],
    });
  });

  test('can support just setting new values and the object updates', () => {
    const o = new Odo();

    o.setValues([11, 12, 13, 14, 15, 16]);

    o.setStructure({
      a: [0, (v) => v * 100],
      b: 1,
      c: [2, 3],
      list: [4, 6, (list) => list.map((v) => v + 10)],
    });

    expect(o.export()).toEqual({
      a: 1100,
      b: 12,
      c: [13],
      list: [25, 26],
    });

    o.setValues([111, 112, 113, 114, 115, 116]);

    expect(o.export()).toEqual({
      a: 11100,
      b: 112,
      c: [113],
      list: [125, 126],
    });
  });

  test('can support just setting new structure and the object updates', () => {
    const o = new Odo();

    o.setValues([11, 12, 13, 14, 15, 16]);

    o.setStructure({
      a: [0, (v) => v * 100],
      b: 1,
      c: [2, 3],
      list: [4, 6, (list) => list.map((v) => v + 10)],
    });

    expect(o.export()).toEqual({
      a: 1100,
      b: 12,
      c: [13],
      list: [25, 26],
    });

    o.setStructure({
      listOne: [0, 3],
      listTwo: [3, 6],
    });

    expect(o.export()).toEqual({
      listOne: [11, 12, 13],
      listTwo: [14, 15, 16],
    });
  });

  test('can support substructure', () => {
    const o = new Odo();

    o.setValues([11, 12, 13, 14, 15, 16]);

    o.setStructure({
      'position.x': 0,
      'position.y': 1,
      'angle.rad': 2,
      'angle.deg': 3,
      'cow.launcher.enabled': 4,
    });

    expect(o.export()).toEqual({
      position: { x: 11, y: 12 },
      angle: { rad: 13, deg: 14 },
      cow: { launcher: { enabled: 15 } },
    });

    o.setValues([111, 112, 113, 114, 115, 116]);

    expect(o.export()).toEqual({
      position: { x: 111, y: 112 },
      angle: { rad: 113, deg: 114 },
      cow: { launcher: { enabled: 115 } },
    });
  });

  test('can support caching for transformed values', () => {
    const o = new Odo();
    const chunkBy2 = (agg, cur) => {
      const last = agg[agg.length - 1];

      if (!last || last.length === 2) {
        agg.push([cur]);
      } else {
        last.push(cur);
      }

      return agg;
    };

    o.setValues([11, 12, 13, 14, 15, 16]);

    o.setStructure({
      'position.x': 0,
      'position.y': 1,
      list: [2, 6, (list) => list.reduce(chunkBy2, [])],
    });

    // without value caching list would cycle each access
    expect(o.list).toBe(o.list);
  });
});
