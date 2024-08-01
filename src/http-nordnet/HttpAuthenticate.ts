import dayjs, { Dayjs } from 'dayjs';
import { injectable } from 'inversify';
import { Logger } from '../utils/Logger';
import { FetchSession } from './FetchSession';
import { HttpHeaderConstructor } from './HttpHeaderConstructor';

@injectable()
export class HttpAuthenticate {
  private lastAuth: Dayjs | undefined = undefined;
  private lastNtag: string | undefined = undefined;

  constructor(private httpHeaderConstructor: HttpHeaderConstructor, private logger: Logger) {}

  public async getAuth({ fetchSession }: { fetchSession: FetchSession }): Promise<string> {
    const needToLogin = !this.lastAuth || this.lastAuth.diff(dayjs(), 'seconds') > 60 * 5;
    this.logger.log(`Need to login ? ${needToLogin}`);

    if (needToLogin) {
      fetchSession.clear();
      await this.login({ fetchSession });
    }

    const ntag = this.lastNtag;
    if (!ntag) {
      throw new Error('Missing ntag');
    }

    return ntag;
  }

  private async login({ fetchSession }: { fetchSession: FetchSession }) {
    const username = process.env.NORDNET_USERNAME;
    const password = process.env.NORDNET_PASSWORD;

    if (!username || !password) {
      throw new Error('Missing username / password environment variables');
    }

    await this.getBaseCookie({ fetchSession });

    const request = {
      username,
      password,
    };

    const response = await fetchSession.fetch('https://www.nordnet.no/api/2/authentication/basic/login', {
      method: 'post',
      body: JSON.stringify(request),
      headers: this.httpHeaderConstructor.getHeaders({
        headers: {
          ntag: 'NO_NTAG_RECEIVED_YET',
          Accept: 'application/json',
          'content-type': 'application/json',
          'sub-client-id': 'NEXT',
          TE: 'Trailers',
          'client-id': 'NEXT',
        },
      }),
    });
    if (!response) {
      throw new Error('Empty response');
    }

    const ntag = response.headers.get('ntag');
    if (!ntag) {
      throw new Error('Missing updated ntag');
    }

    this.lastAuth = dayjs();
    this.lastNtag = ntag;

    return ntag;
  }

  private async getBaseCookie({ fetchSession }: { fetchSession: FetchSession }) {
    await fetchSession.fetch('https://www.nordnet.no/', {
      headers: this.httpHeaderConstructor.getHeaders({
        headers: {},
      }),
    });

    await fetchSession.fetch('https://www.nordnet.no/login', {
      headers: this.httpHeaderConstructor.getHeaders({
        headers: {},
      }),
    });
  }
}
