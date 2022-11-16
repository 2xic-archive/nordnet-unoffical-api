import BigNumber from 'bignumber.js';
import dayjs, { Dayjs } from 'dayjs';
import {
  Balance,
  Broker,
  DcaOrderOptions,
  InstrumentOrderOptions,
  MarketSide,
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
  NordnetOrder,
  NordnetOrderOptions,
  SimpleEquityResponse,
} from './http-nordnet/NordnetApi';

@injectable()
export class NordnetBroker implements Broker {
  constructor(private nordnetApi: NordnetApi) {}

  public async dca(options: DcaOrderOptions): Promise<NordnetOrder> {
    const market = await this.getSearch({
      query: options.stock,
      exchangeCountry: 'NO',
    });
    const price = new BigNumber(market.lastPrice);
    const quantity = new BigNumber(options.amount)
      .dividedBy(market.lastPrice)
      .integerValue(BigNumber.ROUND_FLOOR);

    const total = price.multipliedBy(quantity);
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
        instrumentId: market.instrumentId,
        ...options,
        price,
        quantity,
      });
    } else {
      throw new TooLowBalance();
    }
  }

  public getOrderStatus(): Promise<OrderStatus> {
    throw new Error('NOt implemented');
  }

  public getAllOrders(): Promise<NordnetOrder[]> {
    return this.nordnetApi.getAllOrders();
  }

  public async buy(options: InstrumentOrderOptions): Promise<NordnetOrder> {
    const instrument = await this.nordnetApi.getInstrumentInformation({
      instrumentId: options.instrumentId,
    });
    if (!instrument) {
      throw new Error('Found no instrument id');
    }

    if (instrument.currency !== 'NOK') {
      throw new Error('Only NOK is currently supported (saftey first)');
    }

    return this.preformOrder({
      price: options.price,
      volume: options.quantity,
      accountId: options.accountId,
      marketIdentifier: instrument.market.identifier,
      marketId: instrument.market.id,
      currency: 'NOK',
      side: MarketSide.BUY,
      validUntil: dayjs().add(7, 'day'),
    });
  }

  public async sell(options: InstrumentOrderOptions): Promise<NordnetOrder> {
    const instrument = await this.nordnetApi.getInstrumentInformation({
      instrumentId: options.instrumentId,
    });
    if (!instrument) {
      throw new Error('Found no instrument id');
    }

    if (instrument.currency !== 'NOK') {
      throw new Error('Only NOK is currently supported (saftey first)');
    }

    return this.preformOrder({
      price: options.price,
      volume: options.quantity,
      accountId: options.accountId,
      marketIdentifier: instrument.market.identifier,
      marketId: instrument.market.id,
      currency: 'NOK',
      side: MarketSide.SELL,
      validUntil: dayjs().add(7, 'day'),
    });
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
    limit,
    offset,
  }: {
    accountId: string;
    fromDate: Dayjs;
    toDate: Dayjs;
    limit: number;
    offset: number;
  }): Promise<Transaction[]> {
    return this.nordnetApi.getTransactionReport({
      accountId,
      fromDate,
      toDate,
      limit,
      offset,
    });
  }

  private async instrumentsFromInstrumentId(
    options: NordnetGetMarketIdOptions
  ): Promise<NordnetMarketId | undefined> {
    return this.nordnetApi.getInstrumentsFromInstrumentId(options);
  }

  private async preformOrder(
    options: NordnetOrderOptions
  ): Promise<NordnetOrder> {
    return this.nordnetApi.preformOrder(options);
  }

  public changeOrder(options: {
    orderId: string;
    amount: BigNumber;
  }): Promise<NordnetOrder> {
    return this.nordnetApi.changeOrder(options);
  }
}
