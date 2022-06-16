import BigNumber from 'bignumber.js';
import { Dayjs } from 'dayjs';
import { injectable } from 'inversify';
import { Balance, MarketSide, Transaction } from '../Broker';

@injectable()
export abstract class NordnetApi {
  /*
    Special api method, allows for multiple request at the same time.
  */
  public abstract sendBatchRequest<T>(
    batch: Array<Record<string, unknown>>
  ): Promise<T>;

  public abstract preformOrder(
    options: NordnetOrderOptions
  ): Promise<NordnetOrder>;

  public abstract getInstrumentsFromInstrumentId(
    Options: NordnetGetMarketIdOptions
  ): Promise<NordnetMarketId | undefined>;

  /*
    accountId is found on nordnet, it's just the account number (single digit for most)
  */
  public abstract getAccountBalance({
    accountId,
  }: {
    accountId: string;
  }): Promise<Balance[]>;

  public abstract searchEquityMarket({
    query,
    exchangeCountry,
  }: {
    query: string;
    exchangeCountry: string;
  }): Promise<SimpleEquityResponse>;

  public abstract getDividendsReport(options?: {
    historical: boolean;
  }): Promise<SimpleDividendsResponse[]>;

  public abstract getTransactionReport({
    accountId,
    fromDate,
    toDate,
  }: {
    accountId: string;
    fromDate: Dayjs;
    toDate: Dayjs;
  }): Promise<Transaction[]>;

  public abstract getAllOrders(): Promise<NordnetOrder[]>;
}

export interface NordnetOrderOptions {
  price: BigNumber;
  currency: string;
  identifier: string;
  marketId: string;
  volume: BigNumber;
  validUntil: Dayjs;
  side: MarketSide;
  accountId: string;
}

export interface NordnetGetMarketIdOptions {
  instrumentId: string;
}

export interface NordnetMarketId {
  marketId: string;
  identifier: string;
}

export interface SimpleEquityResponse {
  lastPrice: BigNumber;
  instrumentId: string;
}

export interface SimpleDividendsResponse {
  instrument: string;
  payout: BigNumber;
  date: Dayjs;
  currency: string;
}

export type NordnetOrder = MarketOrder | InvalidOrder;

interface MarketOrder {
  state: 'MARKET' | 'UNKNOWN';
  orderId: number;
  name?: string;
}

interface InvalidOrder {
  state: 'INVALID';
}
