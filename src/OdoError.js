/**
 * @file a simple Error wrapper to include error context.
 */

export default class OdoError extends Error {
  constructor(message, context = {}) {
    super(message);

    this.context = context;
  }
}
