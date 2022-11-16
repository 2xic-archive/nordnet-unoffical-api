import dayjs from 'dayjs';
import * as dotenv from 'dotenv';
dotenv.config();

import { NordnetApi } from '../src';
import container from './container';

(async () => {
  const api = container.get(NordnetApi);
  const transactions = await api.getTransactionReport({
    accountId: '3',
    fromDate: dayjs('2022-01-01'),
    toDate: dayjs(),
  });

  console.log(JSON.stringify(transactions));
})();
