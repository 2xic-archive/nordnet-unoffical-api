import * as dotenv from "dotenv";
dotenv.config();

import { NordnetApi } from "../src";
import container from "./container";

(async () => {
  const api = container.get(NordnetApi);
  const payouts = await api.getDividendsReport();

  let lastMonth: string | undefined = undefined;
  payouts.forEach((item) => {
    const currentMonth = item.date.format('MM');
    if (lastMonth && lastMonth !==  currentMonth) {
      console.log('');
    }
    lastMonth = currentMonth;

    console.log(`${item.instrument} has a payout of ${item.payout} ${item.currency} on ${item.date.format('YYYY-MM-DD')}`)
  });
})();
