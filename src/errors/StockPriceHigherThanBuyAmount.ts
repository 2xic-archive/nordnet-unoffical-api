export class StockPriceHigherThanBuyAmount extends Error {
  constructor(msg = "Stock price is higher than buy amount") {
    super(msg);
  }
}
