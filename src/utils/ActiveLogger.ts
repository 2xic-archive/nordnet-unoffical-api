import { injectable } from 'inversify';
import { Logger } from './Logger';

@injectable()
export class ActiveLogger implements Logger {
  public log(message?: unknown, ...optionalParams: unknown[]): void {
    // eslint-disable-next-line no-console
    console.log(message, ...optionalParams);
  }
}
