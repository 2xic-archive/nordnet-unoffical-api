export abstract class Logger {
  public abstract log(message?: unknown, ...optionalParams: unknown[]): void;
}
