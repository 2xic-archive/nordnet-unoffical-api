import { Container } from 'inversify';
import {
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

export default container;
