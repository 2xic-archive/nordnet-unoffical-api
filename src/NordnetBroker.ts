import BigNumber from 'bignumber.js';
import dayjs, { Dayjs } from 'dayjs';
import {
  Balance,
  Broker,
  DcaOrderOptions,
  MarketSide,
  OrderOptions,
  OrderStatus,
  SimpleOrder,
  Transaction,
} from './Broker';
import { injectable } from 'inversify';
import { MissingBalanceError } from './errors/MissingBalanceError';
import { StockPriceHigherThanBuyAmount } from './errors/StockPriceHigherThanBuyAmount';
import { TooLowBalance } from './errors/TooLowBalance';
import {
  NordnetApi,
  NordnetGetMarketIdOptions,
  NordnetMarketId,
  NordnetOrderOptions,
  SimpleEquityResponse,
} from './http-nordnet/NordnetApi';

@injectable()
export class NordnetBroker implements Broker {
  constructor(private nordnetApi: NordnetApi) {}

  public async dca(options: DcaOrderOptions): Promise<boolean> {
    const market = await this.getSearch({
      query: options.stock,
      exchangeCountry: 'NO',
    });
    const price = new BigNumber(market.lastPrice);
    const quanity = new BigNumber(options.amount)
      .dividedBy(market.lastPrice)
      .integerValue(BigNumber.ROUND_FLOOR);

    const total = price.multipliedBy(quanity);
    const balance = (
      await this.balance({
        accountId: options.accountId,
      })
    ).find((item) => item.stock === 'NOK');

    if (!balance) {
      throw new MissingBalanceError();
    }

    if (price.isGreaterThan(options.amount)) {
      throw new StockPriceHigherThanBuyAmount();
    } else if (balance.balance.isGreaterThan(total)) {
      return await this.buy({
        ...options,
        price,
        quanity,
      });
    } else {
      throw new TooLowBalance();
    }
  }

  public getOrderStatus(): Promise<OrderStatus> {
    throw new Error('Method not implemented.');
  }

  public async buy(options: OrderOptions): Promise<boolean> {
    const market = await this.getSearch({
      query: options.stock,
      exchangeCountry: 'NO',
    });
    const marketIdentifiers = await this.instrumentsFromInstrumentId({
      instrumentId: market.instrumentId,
    });
    if (!marketIdentifiers) {
      throw new Error('Found no instrument id');
    }
    const { marketId, identifier } = marketIdentifiers;

    return this.preformOrder({
      price: options.price,
      volume: options.quanity,
      marketId,
      validUntil: dayjs().add(3, 'day'),
      currency: 'NOK',
      side: MarketSide.BUY,
      identifier,
      accountId: options.accountId,
    });
  }

  public sell(): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  public deleteAllOrders(): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  public async balance({
    accountId,
  }: {
    accountId: string;
  }): Promise<Balance[]> {
    return this.nordnetApi.getAccountBalance({ accountId });
  }

  public async getMarketPrice({
    stock,
  }: {
    stock: string;
  }): Promise<BigNumber> {
    const market = await this.getSearch({
      query: stock,
      exchangeCountry: 'NO',
    });

    const price = market.lastPrice;

    if (price.isZero()) {
      throw new Error('Price should never be zero');
    }
    return price;
  }

  public getOrderBook(): Promise<SimpleOrder[]> {
    throw new Error('Method not implemented.');
  }

  public async getSearch({
    query,
    exchangeCountry,
  }: {
    query: string;
    exchangeCountry: string;
  }): Promise<SimpleEquityResponse> {
    return this.nordnetApi.searchEquityMarket({
      exchangeCountry,
      query,
    });
  }

  public getTransactionHistory({
    accountId,
    fromDate,
    toDate,
  }: {
    accountId: string;
    fromDate: Dayjs;
    toDate: Dayjs;
  }): Promise<Transaction[]> {
    return this.nordnetApi.getTransactionReport({
      accountId,
      fromDate,
      toDate,
    });
  }

  private async instrumentsFromInstrumentId(
    options: NordnetGetMarketIdOptions
  ): Promise<NordnetMarketId | undefined> {
    return this.nordnetApi.getInstrumentsFromInstrumentId(options);
  }

  private async preformOrder(options: NordnetOrderOptions): Promise<boolean> {
    return this.nordnetApi.preformOrder(options);
  }
}
