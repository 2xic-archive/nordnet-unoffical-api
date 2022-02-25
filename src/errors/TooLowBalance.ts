export class TooLowBalance extends Error {
  constructor(msg = 'Too low blaance.') {
    super(msg);
  }
}
