import { Container } from 'inversify';
import {
  FetchSession,
  HttpAuthenticate,
  HttpHeaderConstructor,
  HttpNordnetApi,
  NordnetApi,
  NordnetBroker,
} from '../src/';

const container = new Container({
  defaultScope: 'Singleton',
});

container.bind(NordnetBroker).toSelf();
container.bind(NordnetApi).to(HttpNordnetApi);
container.bind(HttpAuthenticate).toSelf();
container.bind(HttpHeaderConstructor).toSelf();
container.bind(FetchSession).toSelf();

export default container;
