import * as dotenv from "dotenv";
dotenv.config();

import { NordnetApi, NordnetBroker } from "../src";
import container from "./container";

(async () => {
    const api = container.get(NordnetApi);
    const instruments = await api.getInstrumentInformation({
        instrumentId: '16105420',
    });
    console.log(instruments);
})();
