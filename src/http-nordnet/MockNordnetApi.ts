import BigNumber from 'bignumber.js';
import { injectable } from 'inversify';
import { SimpleDividendsResponse } from '..';
import { Balance, Transaction } from '../Broker';
import {
  NordnetApi,
  NordnetMarketId,
  NordnetOrder,
  SimpleEquityResponse,
} from './NordnetApi';

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
    throw new Error('Method not implemented.');
  }
  public async preformOrder(): Promise<NordnetOrder> {
    return {
      state: 'MARKET',
      orderId: 1,
    };
  }

  public async getInstrumentsFromInstrumentId(): Promise<
    NordnetMarketId | undefined
  > {
    return {
      marketId: '1',
      identifier: '1',
    };
  }

  public async getAccountBalance(): Promise<Balance[]> {
    if (!this.balance) {
      throw new Error('Balance not set');
    }
    return [this.balance];
  }

  public getStockPrice(): Promise<Balance[]> {
    throw new Error('Method not implemented.');
  }

  public async searchEquityMarket(): Promise<SimpleEquityResponse> {
    if (!this.equityResponse) {
      throw new Error('Equity response not set');
    }

    return this.equityResponse;
  }

  public getDividendsReport(): Promise<SimpleDividendsResponse[]> {
    throw new Error('Method not implemented.');
  }

  public getTransactionReport(): Promise<Transaction[]> {
    throw new Error('Method not implemented.');
  }

  public getAllOrders(): Promise<NordnetOrder[]> {
    throw new Error('Method not implemented.');
  }

  public changeOrder(options: {
    orderId: string;
    amount: BigNumber;
  }): Promise<NordnetOrder> {
    throw new Error('Method not implemented.');
  }
}
