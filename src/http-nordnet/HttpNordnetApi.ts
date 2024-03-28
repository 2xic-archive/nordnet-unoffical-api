import BigNumber from 'bignumber.js';
import dayjs, { Dayjs } from 'dayjs';
import { injectable } from 'inversify';
import { Balance, Transaction } from '../Broker';
import { HttpAuthenticate } from './HttpAuthenticate';
import { HttpHeaderConstructor } from './HttpHeaderConstructor';
import {
  InstrumentFundInformation,
  InstrumentInformation,
  NordnetApi,
  NordnetOrder,
  NordnetOrderOptions,
  Position,
  SimpleDividendsResponse as SimpleDividendsResponse,
  SimpleEquityResponse,
} from './NordnetApi';
import { FetchSession } from './FetchSession';
import { Logger } from '../utils/Logger';

@injectable()
export class HttpNordnetApi implements NordnetApi {
  constructor(
    private httpAuthentication: HttpAuthenticate,
    private httpHeaderConstructor: HttpHeaderConstructor,
    private fetchSession: FetchSession,
    private logger: Logger
  ) {}

  public async sendBatchRequest<T>(batch: Array<Record<string, unknown>>): Promise<T> {
    const request = await this.sendApiRequest({
      url: 'https://www.nordnet.no/api/2/batch',
      body: JSON.stringify({
        batch: JSON.stringify(batch),
      }),
    });

    if (!request) {
      throw new Error('Empty response');
    }

    return request.body as T;
  }

  public async preformOrder({
    price,
    currency,
    marketIdentifier: identifier,
    marketId,
    side,
    validUntil,
    volume,
    accountId,
  }: NordnetOrderOptions): Promise<NordnetOrder> {
    const payload: Record<string, string> = {
      order_type: 'LIMIT',
      price: price.toString(),
      currency: currency,
      identifier,
      market_id: marketId,
      side: side,
      volume: volume.toString(),
      valid_until: validUntil.format('YYYY-MM-DD'),
    };
    const payloadStr = Object.entries(payload)
      .map((item) => `${item[0]}=${item[1]}`)
      .join('&');

    const ntag = await this.httpAuthentication.getAuth({
      fetchSession: this.fetchSession,
    });

    const response = await this.fetchSession.fetch(`https://www.nordnet.no/api/2/accounts/${accountId}/orders`, {
      method: 'post',
      headers: this.httpHeaderConstructor.getHeaders({
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          ntag: ntag,
          'client-id': 'NEXT',
          Accept: 'application/json',
        },
      }),
      body: payloadStr,
    });

    if (!response) {
      throw new Error('Empty response');
    }

    const parsedResponse: {
      order_state: 'DELETED' | 'LOCAL';
      order_id: number;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } = response.body as any;

    const isDeleted = parsedResponse.order_state === 'DELETED';
    const parsedOrder: NordnetOrder = isDeleted
      ? {
          state: 'INVALID',
        }
      : {
          state: 'MARKET',
          orderId: parsedResponse.order_id,
        };

    return parsedOrder;
  }

  public async getInstrumentsFromInstrumentId({
    instrumentId,
  }: {
    instrumentId: string;
  }): Promise<{ marketId: string; identifier: string } | undefined> {
    const ntag = await this.httpAuthentication.getAuth({
      fetchSession: this.fetchSession,
    });
    const response = await this.fetchSession.fetch(`https://www.nordnet.no/api/2/instruments/${instrumentId}`, {
      headers: this.httpHeaderConstructor.getHeaders({
        headers: {
          ntag: ntag,
          'client-id': 'NEXT',
          Accept: 'application/json',
        },
      }),
    });
    if (!response) {
      throw new Error('Missing response');
    }

    const instruments: Array<{
      asset_class: 'EQY' | undefined;
      tradables: Array<{
        identifier: string;
        market_id: string;
      }>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }> = response.body as any;
    const item = instruments.find((item) => item.asset_class === 'EQY')?.tradables[0];
    if (item) {
      return {
        marketId: item.market_id,
        identifier: item.identifier,
      };
    }
    return undefined;
  }

  public async getInstrumentInformation({
    instrumentId,
  }: {
    instrumentId: string;
  }): Promise<InstrumentInformation | InstrumentFundInformation | undefined> {
    const ntag = await this.httpAuthentication.getAuth({
      fetchSession: this.fetchSession,
    });
    const response = await this.fetchSession.fetch<{
      results?: Array<{
        instrument_info: {
          instrument_id: number;
          currency: string;
          long_name: string;
        };
        market_info: {
          market_id: string;
          identifier: string;
        };
        price_info:
          | {
              last: {
                price: number;
              };
              ask: {
                price: number;
              };
              open: {
                price: number;
              };
              close: {
                price: number;
              };
              bid: {
                price: number;
              };
              low: {
                price: number;
              };
              high: {
                price: number;
              };
            }
          | {
              last: {
                price: number;
              };
            };
      }>;
    }>(`https://www.nordnet.no/api/2/instrument_search/query/instrument?apply_filters=instrument_id=${instrumentId}`, {
      headers: this.httpHeaderConstructor.getHeaders({
        headers: {
          ntag: ntag,
          'client-id': 'NEXT',
          Accept: 'application/json',
        },
      }),
    });
    if (!response) {
      throw new Error('Missing response');
    }

    const instruments = response.body.results;
    const length = instruments?.length;
    if (length === 0 || !instruments) {
      return undefined;
    }

    const [instrument] = instruments;
    if ('low' in instrument.price_info) {
      return {
        id: instrument.instrument_info.instrument_id.toString(),
        name: instrument.instrument_info.long_name,
        currency: instrument.instrument_info.currency,
        market: {
          id: instrument.market_info.market_id,
          identifier: instrument.market_info.identifier,
        },
        price: {
          lastPrice: new BigNumber(instrument.price_info.last.price),
          ask: new BigNumber(instrument.price_info.ask.price),
          bid: new BigNumber(instrument.price_info.bid.price),
          close: new BigNumber(instrument.price_info.close.price),
          open: new BigNumber(instrument.price_info.open.price),
          low: new BigNumber(instrument.price_info.low.price),
          high: new BigNumber(instrument.price_info.high.price),
        },
      };
    } else {
      return {
        id: instrument.instrument_info.instrument_id.toString(),
        name: instrument.instrument_info.long_name,
        currency: instrument.instrument_info.currency,
        market: {
          id: instrument.market_info.market_id,
          identifier: instrument.market_info.identifier,
        },
        price: {
          lastPrice: new BigNumber(instrument.price_info.last.price),
        },
      };
    }
  }

  public async getAccountBalance({ accountId }: { accountId: string }): Promise<Balance[]> {
    const [balance] = await this.sendBatchRequest<
      [
        {
          body: Array<{
            account_sum: {
              value: number;
              currency: string;
            };
          }>;
        }
      ]
    >([
      {
        relative_url: `accounts/${accountId}/info`,
        method: 'GET',
      },
    ]);

    const response = balance.body[0].account_sum;
    return [
      {
        stock: response.currency,
        balance: new BigNumber(response.value),
      },
    ];
  }

  public async searchEquityMarket({
    query,
    exchangeCountry,
  }: {
    query: string;
    exchangeCountry: string;
  }): Promise<SimpleEquityResponse> {
    const ntag = await this.httpAuthentication.getAuth({
      fetchSession: this.fetchSession,
    });
    const response = await this.fetchSession.fetch(
      `https://www.nordnet.no/api/2/main_search?query=${query.split('.')[0]}&search_space=ALL&limit=5`,
      {
        headers: this.httpHeaderConstructor.getHeaders({
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
            ntag: ntag,
            'client-id': 'NEXT',
            Accept: 'application/json',
          },
        }),
      }
    );
    if (!response) {
      throw new Error('Missing response');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: SearchResponse = response.body as any;

    const market = body
      .find((item) => item.display_group_type === 'EQUITY')
      ?.results.find((item) => item.display_symbol.startsWith(query) && item.exchange_country === exchangeCountry);

    if (!market) {
      throw new Error('Missing market');
    }

    return {
      lastPrice: new BigNumber(market.last_price.price),
      instrumentId: market.instrument_id,
    };
  }

  public async getDividendsReport(options?: { historical: boolean }): Promise<SimpleDividendsResponse[]> {
    const data = await this.sendBatchRequest<
      [
        {
          code: number;
          body: Array<{
            event_type: string;
            event_date: string;
            ex_date: string;
            dividend: {
              paid_per_share: number;
              currency: string;
            };
            instrument: {
              current: string;
              name: string;
              symbol: string;
            };
            paid_total: number;
          }>;
        }
      ]
    >([
      {
        relative_url: `company_data/positionsevents/dividend?history=${options?.historical ? 'true' : 'false'}`,
        method: 'GET',
      },
    ]);

    const dividesItems = data[0].body.filter((item) => {
      const dividesType = ['dividend.CASH', 'dividend.SPECIAL_CASH'];
      return dividesType.includes(item.event_type);
    });

    const items = dividesItems.map((rawItem): SimpleDividendsResponse => {
      const item: SimpleDividendsResponse = {
        instrument: rawItem.instrument.name,
        payout: new BigNumber(rawItem.paid_total),
        date: dayjs(rawItem.event_date),
        exDate: dayjs(rawItem.ex_date),
        currency: rawItem.dividend.currency,
      };
      return item;
    });

    return items;
  }

  public async getTransactionReport({
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
    const allTransactions =
      '#INB,GBI,#IAG,GSPI,GTI,CRDFI,US,CRDFM,#UAG,#ERS,CUS,CSI,GSI,GROC,GRU,GRMI,#SL,GRDMI,CROC,GSU,CAAC,IKBK,CUD,IE,GRDUU,#RK,UD,GRDU,GCU,GRDFM,#AVA,CSU,GBU,K,S';
    const fromDateString = fromDate.format('YYYY-MM-DD');
    const toDateString = toDate.format('YYYY-MM-DD');

    const ntag = await this.httpAuthentication.getAuth({
      fetchSession: this.fetchSession,
    });
    const url = `https://www.nordnet.no/api/2/accounts/${accountId}/transactions/next?from=${fromDateString}&to=${toDateString}&limit=${limit}&offset=${offset}&transaction_type_id=${allTransactions}&currency=&symbol=`;
    const response = await this.fetchSession.fetch(url, {
      method: 'get',
      headers: this.httpHeaderConstructor.getHeaders({
        headers: {
          ntag: ntag,
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate, br',

          'Accept-Language': 'en-US,en;q=0.5',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',

          'client-id': 'NEXT',
        },
      }),
    });
    if (!response) {
      throw new Error('Expected a response');
    }
    const transactionResponse = response.body as unknown as TransactionResponse;

    const transactions: Transaction[] = transactionResponse.transaction_list.map((item): Transaction => {
      return {
        totalAmount: new BigNumber(item.amount.value),
        quantity: new BigNumber(item.quantity),
        instrumentPrice: new BigNumber(item.price.value),
        settled: dayjs(item.settlement_date),
        currency: item.amount.currency,
        instrument: item.instrument
          ? {
              symbol: item.instrument?.symbol,
              groupType: item.instrument.instrument_group_type,
              id: item.instrument?.instrument_id?.toString(),
            }
          : undefined,
        transaction: {
          id: item.transaction_type.transaction_type_id,
          name: item.transaction_type.transaction_type_name,
        },
      };
    });

    return transactions;
  }

  public async getAllOrders(): Promise<NordnetOrder[]> {
    const orders = await this.sendBatchRequest<
      [
        {
          body: Array<{
            order_id: number;
            order_state: 'LOCAL';
            volume: number;
            instrument: NordnetInstrument;
          }>;
        }
      ]
    >([{ relative_url: 'accounts/orders', method: 'GET' }]).then((response) => response[0].body);

    return orders.map(
      (item): NordnetOrder => ({
        orderId: item.order_id,
        state: item.order_state === 'LOCAL' ? 'MARKET' : 'UNKNOWN',
        name: item.instrument.name,
      })
    );
  }

  public async changeOrder({ orderId, amount }: { orderId: string; amount: BigNumber }): Promise<NordnetOrder> {
    const request = await this.fetchSession.fetch(`https://www.nordnet.no/api/2/accounts/orders/${orderId}`, {
      method: 'put',
      headers: await this.apiHeaders({
        contentType: 'application/x-www-form-urlencoded',
      }),
      body: `currency=NOK&price=${amount.decimalPlaces(2).toString()}`,
    });

    if (!request) {
      throw new Error('');
    }

    const body = request?.body as unknown as {
      order_id: number;
      order_state: 'LOCAL';
    };

    throw {
      orderId: body.order_id,
      state: body.order_state === 'LOCAL',
    };
  }

  public async getAllPositions({ accountId }: { accountId: string }): Promise<Position[]> {
    const positions =
      (await this.sendBatchRequest<
        [
          {
            body:
              | Array<{
                  qty: number;
                  instrument: NordnetInstrument;
                  currency: string;
                  morning_price: {
                    currency: string;
                    value: number;
                  };
                  main_market_price: {
                    currency: string;
                    value: number;
                  };
                  acq_price: {
                    currency: string;
                    value: number;
                  };
                }>
              | undefined;
          }
        ]
      >([
        {
          relative_url: `accounts/${accountId}/positions?include_instrument_loans=true`,
          method: 'GET',
        },
      ]).then((response) => response[0].body)) || [];

    return positions.map(
      (item): Position => ({
        currency: item.currency || item.morning_price.currency || item.acq_price.currency,
        quantity: item.qty.toString(),
        instrument: item.instrument.name,
        instrumentId: item.instrument.instrument_id.toString(),
        instrumentGroupType: item.instrument.instrument_group_type,
        currentPrice: new BigNumber(item.main_market_price.value),
        morningPrice: new BigNumber(item.morning_price.value),
        acquiredPrice: new BigNumber(item.acq_price.value),
        profits: new BigNumber(item.main_market_price.value).minus(item.acq_price.value).multipliedBy(item.qty),
      })
    );
  }

  private async sendApiRequest({ url, body }: { url: string; body: string }) {
    const request = await this.fetchSession.fetch(url, {
      method: 'post',
      headers: await this.apiHeaders({}),
      body,
    });

    return request;
  }

  private async apiHeaders({ contentType = 'application/json' }: { contentType?: string }) {
    const ntag = await this.httpAuthentication.getAuth({
      fetchSession: this.fetchSession,
    });

    return this.httpHeaderConstructor.getHeaders({
      headers: {
        ntag,
        Accept: 'application/json',
        'content-type': contentType,
        'client-id': 'NEXT',
      },
    });
  }
}

type SearchResponse = Array<{
  display_group_type: string;
  results: EquityResponse[];
}>;

interface EquityResponse {
  display_symbol: string;
  instrument_id: string;
  display_name: string;
  last_price: {
    price: number;
  };
  diff_pct_one_day: number;
  exchange_country: string;
  currency: string;
}

interface TransactionResponse {
  transaction_list: Array<NordnetTransaction>;
}

interface NordnetTransaction {
  transaction_id: number;
  accounting_date: string;
  business_date: string;
  settlement_date?: string;
  currency_date: string;
  transaction_type: {
    transaction_type_id: string;
    transaction_type_name: string;
  };
  amount: {
    currency: string;
    value: number;
  };
  price: {
    currency: string;
    value: number;
  };
  instrument?: NordnetInstrument;
  quantity: number;
}

interface NordnetInstrument {
  instrument_id: number;
  symbol: string;
  name: string;
  display_name: string;
  isin_code: string;
  instrument_group_type: string;
  currency: string;
}
