import { injectable } from 'inversify';
import { Logger } from './Logger';

@injectable()
export class SilentLogger implements Logger {
  public log(): void {
    // Pass
  }
}
