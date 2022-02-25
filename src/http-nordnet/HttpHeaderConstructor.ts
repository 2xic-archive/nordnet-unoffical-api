import { injectable } from 'inversify';

@injectable()
export class HttpHeaderConstructor {
  public getHeaders({
    headers: inputHeaders,
  }: {
    headers: Record<string, string>;
  }) {
    const baseHeaders = {
      'User-Agent':
        'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:89.0) Gecko/20100101 Firefox/89.0',
    };
    const headers = {
      ...baseHeaders,
      ...inputHeaders,
    };

    return headers;
  }
}
