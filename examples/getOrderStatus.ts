import * as dotenv from "dotenv";
dotenv.config();

import { NordnetApi, NordnetBroker } from "../src";
import container from "./container";

(async () => {
    const api = container.get(NordnetBroker);
    const orders = await api.getAllOrders();
    console.log(orders);
})();
