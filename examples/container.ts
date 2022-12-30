import { Container } from 'inversify';
import {
  FetchSession,
  HttpAuthenticate,
  HttpHeaderConstructor,
  HttpNordnetApi,
  NordnetApi,
  NordnetBroker,
  Logger,
  SilentLogger
} from '../src/';

const container = new Container({
  defaultScope: 'Singleton',
});

container.bind(NordnetBroker).toSelf();
container.bind(NordnetApi).to(HttpNordnetApi);
container.bind(HttpAuthenticate).toSelf();
container.bind(HttpHeaderConstructor).toSelf();
container.bind(FetchSession).toSelf();
container.bind(Logger).to(SilentLogger)

export default container;
