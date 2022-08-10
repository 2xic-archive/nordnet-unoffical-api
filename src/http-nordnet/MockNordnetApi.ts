import BigNumber from 'bignumber.js';
import { injectable } from 'inversify';
import { SimpleDividendsResponse } from '..';
import { Balance, Transaction } from '../Broker';
import {
  InstrumentInformation,
  NordnetApi,
  NordnetMarketId,
  NordnetOrder,
  Position,
  SimpleEquityResponse,
} from './NordnetApi';

@injectable()
export class MockNordnetApi implements NordnetApi {
  private balance?: Balance;

  public equityResponse?: SimpleEquityResponse;

  public instrumentMapping: Record<string, InstrumentInformation> = {};

  public addInstrument(instrument: InstrumentInformation) {
    this.instrumentMapping[instrument.id] = instrument;
  }

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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public changeOrder(options: {
    orderId: string;
    amount: BigNumber;
  }): Promise<NordnetOrder> {
    throw new Error('Method not implemented.');
  }

  public async getInstrumentInformation({
    instrumentId,
  }: {
    instrumentId: string;
  }): Promise<InstrumentInformation | undefined> {
    return this.instrumentMapping[instrumentId];
  }

  public getAllPositions(): Promise<Position[]> {
    throw new Error('Method not implemented.');
  }
}
