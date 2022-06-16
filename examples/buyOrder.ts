import BigNumber from "bignumber.js";
import * as dotenv from "dotenv";
dotenv.config();

import { NordnetApi, NordnetBroker } from "../src";
import container from "./container";

(async () => {
    const api = container.get(NordnetBroker);
    await api.buy({
        stock: 'NEL',
        price: new BigNumber(10),
        quantity: new BigNumber(2),
        accountId: '3'
    });
})();
