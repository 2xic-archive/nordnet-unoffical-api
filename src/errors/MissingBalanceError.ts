export class MissingBalanceError extends Error {
  constructor(msg = 'Missing balance for NOK') {
    super(msg);
  }
}
