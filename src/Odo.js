/**
 * @file the core include for Odo
 */

import OdoError from './OdoError';

/**
 * An object creator that allows to separate values from structure, the key
 * reason for this is that structure allows to explain what the values are.
 * Structure makes code easier to read, debug and write. But the quickest way
 * to be sending and updating values rapidly — in certain contexts — is using a
 * typed array of values. Values without structure.
 *
 * An example context would be sending game data over a websocket. Here you
 * might have values that constantly update, but the structure stays the same
 * and would also increase the payload if you were always sending the structure.
 *
 * So instead with Odo you can initially formulate an object that allows you
 * to constantly send in new values. And when accessing those values you can
 * use the structure interface, rather than coding array offsets.
 *
 * @example
 *     const a = new Odo();
 *     a.setValues([0, 1, 2, 3, 4, 5, 6, 7]);
 *     a.addStructure({
 *       "position.x": 0,
 *       "position.y": [1, (v) => `${v}${v}`],
 *       "list": [3, 8, (list) => list.map((v) => v + 1)]
 *     });
 *     // a = {"position":{"x":0,"y":"11"},"list":[4,5,6,7,8]}
 *
 * @example
 *     // taking the already instantiated example above, we can then keep
 *     // updating the values.
 *     a.setValues([10, 11, 12, 13, 14, 15, 16, 17])
 *     // a = {"position":{"x":10,"y":"1111"},"list":[14,15,16,17,18]}
 *
 * @example
 *     // keeping the same values from the above exampke, expose via
 *     // different structure.
 *     a.resetStructure();
 *     a.addStructure({
 *       "pair.x": 3,
 *       "pair.y": 4,
 *       "pair.z": 5,
 *       "another.x": 0,
 *       "another.y": 1,
 *       "yet.x": 2,
 *       "yet.y": 6,
 *     });
 */
export default class Odo {
  constructor() {
    Object.defineProperty(this, 'i', {
      value: {},
      enumerable: false,
      configurable: true,
    });
    /**
     * Holds the values defined for this instance.
     * @type {array}
     */
    this.i.values = [];

    /**
     * Holds the field names that have been created on this instance. Simple
     * strings represent top-level field. Fields created inside substructure
     * are represented by arrays of strings. E.g. ['a', 'b', 'c'] would
     * represnt an object { a: { b: { c: {} } } }
     * @type {(string[]|string)[]}
     */
    this.i.fields = new Set();

    /**
     * Holds the intermediate objects/arrays that have been formulated to
     * construct substructure -- but that have had their sub-values removed.
     * We keep track of these as they might be re-used again if new
     * structure is recreated. Attempting to preseve references as much as
     * possible because these references may have been shared with other
     * code.
     * @type {Set}
     */
    this.i.unused = new Set();

    /**
     * For values that take some processing to calculate, we cache the
     * result. And only clear the cache if structure or values change.
     * Stores the cached value under the range reference.
     * @type {Map}
     */
    this.i.cached = new Map();
  }

  /**
   * An instance is to be powered by an array of values. Here we can define
   * those values. We can keep re-defining those values. No matter the
   * structure that has been defined. This is because values exposed through
   * the structure interface are obtained through getters.
   * @param {array} values
   */
  setValues(values) {
    this.i.values = values;
    this.i.cached.clear();
  }

  /**
   * Adding structure allows us to take the values that have been set and
   * given them a more structured interface.
   * @param {object} structure - a simple object of keys and values. The keys
   *    represent the fieldNames and the values represent the offset inside
   *    the values array (to find the value/values). The offset can be a
   *    single number, or defined as a range.
   */
  addStructure(structure) {
    let obj;
    let key;

    // because "numeric" properties get placed before string ones...
    // also protects against other ways JavaScript might not honour the
    // order of keys added to an object. We could perhaps switch to a Map
    // or an Array, but that is quite involved and makes using the
    // addStructure method quite verbose compared to using a POJO. E.g.
    // `addStructure({ a: [2] }}` vs `addStructure(new Map([['a', [2]]]))`
    // or vs `addStructure([['a', [2]]])`. The first is cleaner.
    // we reverse sort because longer keys need to be set first, and shorter
    // ones later. Mainly because some shorter keys are used to type convert
    // deeper properties. @TODO might be slightly faster to compare key
    // length rather than alphabetical sorting.
    const entries = [...Object.entries(structure)].sort((a, b) => {
      if (a[0] > b[0]) {
        return -1;
      }
      if (a[0] < b[0]) {
        return 1;
      }

      return 0;
    });

    for (const [fieldName, range] of entries) {
      const isPath = fieldName.includes('.');
      const path = fieldName.split('.');

      this.i.fields.add(fieldName);

      if (isPath) {
        ({ obj, key } = this._ensurePathStructure(path));
      } else {
        obj = this;
        key = fieldName;
      }

      Object.defineProperty(obj, key, {
        get: this._convertRangeToGetter(range, obj[key], key),
        enumerable: true,
        configurable: true,
      });
    }
  }

  /**
   * addStructure() can be called many times, allowing more structure to be
   * built up. This method however will remove all existing structure. This
   * allows an instance to be fully re-used. Especially useful if an instance
   * needs to morph its structure.
   */
  resetStructure() {
    this.i.unused.clear();
    this.i.cached.clear();

    for (const fieldName of this.i.fields.values()) {
      // if dealing with a path of fields (to a sub value) we only
      // need to delete the value, not the chain.
      const isPath = fieldName.includes('.');
      const path = fieldName.split('.');

      if (isPath) {
        const cursor = this._getCursorToEndOfPath(path);
        const unusedPath = cursor.path.join('.');
        this.i.unused.add(unusedPath);

        delete cursor.obj[cursor.key];

        continue;
      }

      delete this[fieldName];
    }

    this.i.fields.clear();
  }

  /**
   * Convenience method that triggers resetStructure() followed by
   * addStructure() and then removeUnusedStructure().
   * @param {object} structure
   */
  setStructure(structure) {
    this.resetStructure();
    this.addStructure(structure);
    this.removeUnusedStructure();
  }

  /**
   * If we are sure we aren't going to be reusing unused elements. We can
   * strip them from the object.
   */
  removeUnusedStructure() {
    for (const field of this.i.unused.values()) {
      const isPath = Array.isArray(field);
      if (isPath) {
        const cursor = this._getCursorToEndOfPath(field);

        delete cursor.obj[cursor.key];

        continue;
      }

      delete this[field];
    }

    this.i.unused.clear();
  }

  /**
   * Function wrapper that will cache the value permanently (at least until
   * the cache is cleared).
   * @param {function} valueFn - the function that generates a costly value.
   * @param {object} cacheKey - we use the reference of this object as the
   *    key inside a Map.
   */
  _cachedValue(valueFn, cacheKey) {
    return () => {
      if (this.i.cached.has(cacheKey)) {
        return this.i.cached.get(cacheKey);
      }

      const val = valueFn();

      this.i.cached.set(cacheKey, val);

      return val;
    };
  }

  /**
   * Internal method that will navigate down a path of keys. It will return
   * the last parent and the final key. Allowing for reading or assignment
   * at that location within an object.
   * @param {string[]} path
   */
  _getCursorToEndOfPath([...path]) {
    const lastKey = path.pop();
    const cursor = { obj: this, key: lastKey, path };

    for (const field of path) {
      if (!cursor.obj[field]) {
        throw new OdoError(
          `"${field}" may be misdefined, encountered undefined parent for path elements "${path}"`,
          { cursor, field },
        );
      }

      cursor.obj = cursor.obj[field];
    }

    return cursor;
  }

  /**
   * Internal method that will return a getter function for either a singular
   * index of values, or a range. Supports:
   * - range as an index e.g. 0
   * - range as an index with translation function  e.g. [0, () => {}]
   * - range as a range e.g. [0, 3] - will slice values from 0 to 3 offset
   * - range as a range with translation functions e.g. [0, 3, () => {}]
   *
   * Translation functions can be used to covert the values found into other
   * values or structures.
   * @param {number | number[]} range
   * @param {any} existingValue
   */
  _convertRangeToGetter(range, existingValue = undefined, hint = '') {
    if (typeof range === 'function') {
      // @TODO cache output?
      return () => range(existingValue);
    }

    // simple one index getter
    if (Number.isFinite(range)) {
      return () => this.i.values[range];
    }

    // one index getter with translation function
    if (typeof range[1] === 'function') {
      return this._cachedValue(
        () => range[1](this.i.values[range[0]]),
        range,
      );
    }

    // ranged getter with translation function
    if (typeof range[2] === 'function') {
      return this._cachedValue(
        () => range[2](this.i.values.slice(range[0], range[1])),
        range,
      );
    }

    // ranged getter
    return () => this.i.values.slice(range[0], range[1]);
  }

  /**
   * Given a path (a list of keys) will make sure that these keys exist on
   * `this`. With each key descending further into substructure. Numeric
   * keys mean that the enforced parent structure is defined as an array.
   * Anything else will be ensured as an object. If the keys already exist,
   * they are left as they are. Presumes that the final key is going to
   * be managed externally to this function, so returns a cursor up to
   * that point.
   * @example
   *     a = new Odo();
   *     a.ensurePathStructure(['b', 'c', '0', 'd', 'e']);
   *     // a = { b: { c: [{ d: {} }] } }
   * @param {string[]} path
   */
  _ensurePathStructure([...path]) {
    const lastKey = path.pop();
    const cursor = { obj: this, key: lastKey };
    const isPathNumber = path.map((p) => isFinite(p)); // eslint-disable-line no-restricted-globals
    let notDefined;
    let index = 0;
    let rebuiltPath = '';

    for (const key of path) {
      if (cursor.obj[key] === notDefined) {
        const isNextKeyNumeric = isPathNumber[index + 1];
        cursor.obj[key] = isNextKeyNumeric ? [] : {};
      }

      cursor.obj = cursor.obj[key];

      rebuiltPath += (rebuiltPath ? '.' : '') + path;
      if (this.i.unused.has(rebuiltPath)) {
        this.i.unused.delete(rebuiltPath);
      }

      index++;
    }

    return cursor;
  }

  export() {
    return JSON.parse(JSON.stringify(this));
  }
}
