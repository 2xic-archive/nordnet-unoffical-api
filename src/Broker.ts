import BigNumber from 'bignumber.js';
import { Dayjs } from 'dayjs';
import { injectable } from 'inversify';
import { NordnetOrder } from './http-nordnet/NordnetApi';

@injectable()
export abstract class Broker {
  public abstract dca(options: DcaOrderOptions): Promise<NordnetOrder>;

  public abstract buy(options: OrderOptions): Promise<NordnetOrder>;

  public abstract sell(options: OrderOptions): Promise<NordnetOrder>;

  public abstract getTransactionHistory({
    accountId,
    fromDate,
    toDate,
  }: {
    accountId: string;
    fromDate: Dayjs;
    toDate: Dayjs;
  }): Promise<Transaction[]>;

  public abstract deleteAllOrders({
    stock,
  }: {
    stock: string;
  }): Promise<boolean>;

  public abstract getAllOrders(): Promise<NordnetOrder[]>;

  public abstract getOrderStatus({
    orderId,
  }: {
    orderId: number;
  }): Promise<OrderStatus | null>;

  public abstract balance({
    accountId,
  }: {
    accountId: string;
  }): Promise<Balance[]>;

  public abstract getMarketPrice({
    stock,
  }: {
    stock: string;
  }): Promise<BigNumber>;

  public abstract getOrderBook({
    market,
    marketSide,
  }: {
    market: string;
    marketSide: MarketSide;
  }): Promise<SimpleOrder[]>;
}

export interface OrderOptions<market = string> {
  stock: market;
  quantity: BigNumber;
  price: BigNumber;
  accountId: string;
}

export interface DcaOrderOptions {
  accountId: string;
  stock: string;
  amount: BigNumber;
}

export interface Balance {
  stock: string;
  balance: BigNumber;
}

export enum MarketSide {
  BUY = 'BUY',
  SELL = 'SELL',
}

export interface SimpleOrder {
  price: BigNumber;
  quantity: BigNumber;
}

export interface OrderStatus {
  status: 'FILLED' | 'OPEN' | 'PARTIAL_FILLED';
  remaining: BigNumber;
  matched: BigNumber;
  cancelled: BigNumber;
}

export interface Transaction {
  amount: BigNumber;
  currency: string;
  instrument?: {
    symbol: string;
  };
}
