import BigNumber from "bignumber.js";
import * as dotenv from "dotenv";
dotenv.config();

import { NordnetBroker } from "../src";
import container from "./container";

(async () => {
    const api = container.get(NordnetBroker);
    const response = await api.buy({
        instrumentId: '16105612',
        price: new BigNumber(15),
        quantity: new BigNumber(2),
        accountId: '3'
    });
    console.log(response);
})();
