import BigNumber from "bignumber.js";
import * as dotenv from "dotenv";
dotenv.config();

import { NordnetApi } from "../src";
import container from "./container";

(async () => {
  const api = container.get(NordnetApi);
  const payouts = await api.getDividensReport();

  // month -> currency = BigNumber
  const payoutByMonth: Record<string, Record<string, BigNumber>> = {};
  payouts.forEach((item) => {
    const yearMonth = item.date.format("YYYY-MM");
    if (!(yearMonth in payoutByMonth)) {
      payoutByMonth[yearMonth] = {};
    }
    const currency = item.currency;
    if (!(currency in payoutByMonth[yearMonth])) {
      payoutByMonth[yearMonth][currency] = new BigNumber(0);
    }
    payoutByMonth[yearMonth][currency] = payoutByMonth[yearMonth][
      currency
    ].plus(item.payout);
  });

  for (const [yearMonth, payouts] of Object.entries(payoutByMonth)) {
    console.log(yearMonth);
    Object.entries(payouts).forEach(([currency, payout]) => {
      console.log([currency, payout.toString()]);
    });
  }
})();
