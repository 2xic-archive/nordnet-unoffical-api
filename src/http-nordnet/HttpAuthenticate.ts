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
      throw new Error('Missing username / password enviroment variables');
    }

    await this.getBaseCookie({ fetchSession });

    const ntagRequest = await fetchSession.fetch('https://www.nordnet.no/api/2/login', {
      headers: this.httpHeaderConstructor.getHeaders({
        headers: {
          'client-id': 'NEXT',
        },
      }),
    });

    await fetchSession.fetch('https://classic.nordnet.no/api/2/login/anonymous', {
      method: 'post',
      headers: this.httpHeaderConstructor.getHeaders({
        headers: {},
      }),
    });

    if (!ntagRequest) {
      throw new Error('Empty response');
    }

    let ntag = ntagRequest.headers.get('ntag');

    const request = {
      username,
      password,
    };

    if (!ntag) {
      throw new Error('Missing ntag');
    }

    const response = await fetchSession.fetch('https://www.nordnet.no/api/2/authentication/basic/login', {
      method: 'post',
      body: JSON.stringify(request),
      headers: this.httpHeaderConstructor.getHeaders({
        headers: {
          ntag,
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

    ntag = response.headers.get('ntag');
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
