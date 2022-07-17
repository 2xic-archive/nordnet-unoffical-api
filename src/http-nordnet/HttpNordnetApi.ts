import BigNumber from 'bignumber.js';
import dayjs, { Dayjs } from 'dayjs';
import fetchSession, { SessionReturn } from 'fetch-session';
import { injectable } from 'inversify';
import { Balance, Transaction } from '../Broker';
import { HttpAuthenticate } from './HttpAuthenticate';
import { HttpHeaderConstructor } from './HttpHeaderConstructor';
import {
  InstrumentInformation,
  NordnetApi,
  NordnetOrder,
  NordnetOrderOptions,
  SimpleDividendsResponse as SimpleDividendsResponse,
  SimpleEquityResponse,
} from './NordnetApi';

@injectable()
export class HttpNordnetApi implements NordnetApi {
  private fetchSession: SessionReturn;

  constructor(
    private httpAuthentication: HttpAuthenticate,
    private httpHeaderConstructor: HttpHeaderConstructor
  ) {
    this.fetchSession = fetchSession();
  }

  public async sendBatchRequest<T>(
    batch: Array<Record<string, unknown>>
  ): Promise<T> {
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
    identifier,
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

    const response = await this.fetchSession.fetch(
      `https://www.nordnet.no/api/2/accounts/${accountId}/orders`,
      {
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
      }
    );

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
    const response = await this.fetchSession.fetch(
      `https://www.nordnet.no/api/2/instruments/${instrumentId}`,
      {
        headers: this.httpHeaderConstructor.getHeaders({
          headers: {
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

    const instruments: Array<{
      asset_class: 'EQY' | undefined;
      tradables: Array<{
        identifier: string;
        market_id: string;
      }>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }> = response.body as any;
    const item = instruments.find((item) => item.asset_class === 'EQY')
      ?.tradables[0];
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
  }): Promise<InstrumentInformation | undefined> {
    const ntag = await this.httpAuthentication.getAuth({
      fetchSession: this.fetchSession,
    });
    const response = await this.fetchSession.fetch<{
      results: Array<{
        instrument_info: {
          instrument_id: number;
        };
        price_info: {
          last: {
            price: number;
          };
        };
      }>;
    }>(
      `https://www.nordnet.no/api/2/instrument_search/query/stocklist?apply_filters=instrument_id=${instrumentId}`,
      {
        headers: this.httpHeaderConstructor.getHeaders({
          headers: {
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
    const instruments = response.body.results;
    const length = instruments.length;
    if (length === 0) {
      return undefined;
    }

    const [instrument] = instruments;
    return {
      id: instrument.instrument_info.instrument_id.toString(),
      price: {
        lastPrice: new BigNumber(instrument.price_info.last.price),
      },
    };
  }

  public async getAccountBalance({
    accountId,
  }: {
    accountId: string;
  }): Promise<Balance[]> {
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
      `https://www.nordnet.no/api/2/main_search?query=${
        query.split('.')[0]
      }&search_space=ALL&limit=5`,
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
      ?.results.find(
        (item) =>
          item.display_symbol.startsWith(query) &&
          item.exchange_country === exchangeCountry
      );

    if (!market) {
      throw new Error('Missing market');
    }

    return {
      lastPrice: new BigNumber(market.last_price.price),
      instrumentId: market.instrument_id,
    };
  }

  public async getDividendsReport(options?: {
    historical: boolean;
  }): Promise<SimpleDividendsResponse[]> {
    const data = await this.sendBatchRequest<
      [
        {
          code: number;
          body: Array<{
            event_type: string;
            event_date: string;
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
        relative_url: `company_data/positionsevents/dividend?history=${
          options?.historical ? 'true' : 'false'
        }`,
        method: 'GET',
      },
    ]);

    const dividensItems = data[0].body.filter((item) => {
      const dividensType = ['dividend.CASH', 'dividend.SPECIAL_CASH'];
      return dividensType.includes(item.event_type);
    });

    const items = dividensItems.map((rawItem): SimpleDividendsResponse => {
      const item: SimpleDividendsResponse = {
        instrument: rawItem.instrument.name,
        payout: new BigNumber(rawItem.paid_total),
        date: dayjs(rawItem.event_date),
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
  }: {
    accountId: string;
    fromDate: Dayjs;
    toDate: Dayjs;
  }): Promise<Transaction[]> {
    const allTransactions = `#ERS,#SL,#INB,IKBK,GROC,#RK,CRDFM,K,GRU,CRDFI,S,GRDFM,US,CUD,UD,#AVA,GTI`;
    const fromDateString = fromDate.format('YYYY-MM-DD');
    const toDateString = toDate.format('YYYY-MM-DD');

    const ntag = await this.httpAuthentication.getAuth({
      fetchSession: this.fetchSession,
    });
    const response = await this.fetchSession.fetch(
      `https://www.nordnet.no/api/2/accounts/${accountId}/transactions/next?from=${fromDateString}&to=${toDateString}&limit=50&offset=0&transaction_type_id=${allTransactions}&currency=&symbol=`,
      {
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
      }
    );
    if (!response) {
      throw new Error('Expected a response');
    }
    const transactionResponse =
      response.body as unknown as TransactionRessponse;

    const transactions: Transaction[] =
      transactionResponse.transaction_list.map((item): Transaction => {
        return {
          amount: new BigNumber(item.amount.value),
          currency: item.amount.currency,
          instrument: item.instrument
            ? {
                symbol: item.instrument?.symbol,
              }
            : undefined,
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
    >([{ relative_url: 'accounts/orders', method: 'GET' }]).then(
      (response) => response[0].body
    );

    return orders.map(
      (item): NordnetOrder => ({
        orderId: item.order_id,
        state: item.order_state === 'LOCAL' ? 'MARKET' : 'UNKNOWN',
        name: item.instrument.name,
      })
    );
  }

  public async changeOrder({
    orderId,
    amount,
  }: {
    orderId: string;
    amount: BigNumber;
  }): Promise<NordnetOrder> {
    const request = await this.fetchSession.fetch(
      `https://www.nordnet.no/api/2/accounts/orders/${orderId}`,
      {
        method: 'put',
        headers: await this.apiHeaders({
          contentType: 'application/x-www-form-urlencoded',
        }),
        body: `currency=NOK&price=${amount.decimalPlaces(2).toString()}`,
      }
    );

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

  private async sendApiRequest({ url, body }: { url: string; body: string }) {
    const request = await this.fetchSession.fetch(url, {
      method: 'post',
      headers: await this.apiHeaders({}),
      body,
    });

    return request;
  }

  private async apiHeaders({
    contentType = 'application/json',
  }: {
    contentType?: string;
  }) {
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

interface TransactionRessponse {
  transaction_list: Array<NordnetTransaction>;
}

interface NordnetTransaction {
  transaction_id: number;
  accounting_date: string;
  business_date: string;
  settlement_date: string;
  currency_date: string;
  transaction_type: {
    transaction_type_id: string;
    transaction_type_name: string;
  };
  amount: {
    currency: string;
    value: number;
  };
  instrument?: NordnetInstrument;
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
