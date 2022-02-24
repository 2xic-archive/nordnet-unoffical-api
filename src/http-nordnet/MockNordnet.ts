import { injectable } from "inversify";
import { Balance } from "../Broker";
import { NordnetApi, NordnetMarketId, SimpleEquityResponse } from "./Nordnet";

@injectable()
export class MockNordnetApi implements NordnetApi {
  private balance?: Balance;

  public equityResponse?: SimpleEquityResponse;

  public setSearchResponse(value: SimpleEquityResponse) {
    this.equityResponse = value;
  }

  public setBalanceResponse(value: Balance) {
    this.balance = value;
  }

  public sendBatchRequest<T>(): Promise<T> {
    throw new Error("Method not implemented.");
  }
  public async preformOrder(): Promise<boolean> {
    return true;
  }

  public async getInstrumentsFromInstrumentId(): Promise<
    NordnetMarketId | undefined
  > {
    return {
      marketId: '1',
      identifier: '1'
    }
  }

  public async getAccountBalance(): Promise<Balance[]> {
    if (!this.balance) {
      throw new Error("Balance not set");
    }
    return [this.balance];
  }

  public getStockPrice(): Promise<Balance[]> {
    throw new Error("Method not implemented.");
  }

  public async searchEquityMarket(): Promise<SimpleEquityResponse> {
    if (!this.equityResponse) {
      throw new Error("Equity response not set");
    }

    return this.equityResponse;
  }
}
