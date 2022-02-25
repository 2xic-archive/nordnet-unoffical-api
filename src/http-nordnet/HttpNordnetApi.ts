import BigNumber from 'bignumber.js';
import dayjs from 'dayjs';
import fetchSession, { SessionReturn } from 'fetch-session';
import { injectable } from 'inversify';
import { Balance } from '../Broker';

import { HttpAuthenticate } from './HttpAuthenticate';
import { HttpHeaderConstructor } from './HttpHeaderConstructor';
import {
  NordnetApi,
  NordnetOrderOptions,
  SimpleDividensResponse,
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
    const ntag = await this.httpAuthentication.getAuth({
      fetchSession: this.fetchSession,
    });

    const request = await this.fetchSession.fetch(
      'https://www.nordnet.no/api/2/batch',
      {
        method: 'post',
        headers: this.httpHeaderConstructor.getHeaders({
          headers: {
            ntag,
            Accept: 'application/json',
            'content-type': 'application/json',
            'client-id': 'NEXT',
          },
        }),
        body: JSON.stringify({
          batch: JSON.stringify(batch),
        }),
      }
    );
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
  }: NordnetOrderOptions): Promise<boolean> {
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

    return !!response.body;
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

  public async getDividensReport(options?: {
    historical: boolean;
  }): Promise<SimpleDividensResponse[]> {
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

    //        [{"relative_url":"company_data/positionsevents/calendar?history=true","method":"GET"},{"relative_url":"company_data/positionsevents/dividend?history=true","method":"GET"}]

    const dividensItems = data[0].body.filter((item) => {
      const dividensType = ['dividend.CASH', 'dividend.SPECIAL_CASH'];
      return dividensType.includes(item.event_type);
    });

    const items = dividensItems.map((rawItem): SimpleDividensResponse => {
      const item: SimpleDividensResponse = {
        instrument: rawItem.instrument.name,
        payout: new BigNumber(rawItem.paid_total),
        date: dayjs(rawItem.event_date),
        currency: rawItem.dividend.currency,
      };
      return item;
    });

    return items;
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
