import BigNumber from "bignumber.js";
import * as dotenv from "dotenv";
dotenv.config();

import { NordnetApi, NordnetBroker } from "../src";
import container from "./container";

(async () => {
    const api = container.get(NordnetBroker);
    const orders = await api.changeOrder({
        orderId: '368513033',
        amount: new BigNumber(6.1),
    });
    console.log(orders);
})();
