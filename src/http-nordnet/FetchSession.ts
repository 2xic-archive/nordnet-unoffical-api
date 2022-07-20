import fetchSession, { SessionReturn } from 'fetch-session';
import { Headers, RequestInfo, RequestInit } from 'node-fetch';
import httpsProxyAgent from 'https-proxy-agent';
import { injectable } from 'inversify';

@injectable()
export class FetchSession {
  private fetchSession: SessionReturn = fetchSession();

  public async fetch<T>(
    url: RequestInfo,
    options?: FetchRequestOptions
  ): Promise<{
    headers: Headers;
    body: T;
  } | null> {
    return this.fetchSession.fetch<T>(url, options);
  }
}

// from fetch-session
type FetchRequestOptions = RequestInit & {
  rejectOnFailure?: boolean;
  returnError?: boolean;
  proxy?: Proxy;
  excludeCookies?: boolean;
  parse?: 'json' | 'text' | 'buffer' | 'blob' | 'arrayBuffer';
  raw?: boolean;
};
declare type Proxy = string | httpsProxyAgent.HttpsProxyAgentOptions;
