import * as dotenv from 'dotenv';
dotenv.config();

import { NordnetApi, Position } from '../src';
import container from './container';
import BigNumber from 'bignumber.js';

(async () => {
    const api = container.get(NordnetApi);
    const accounts = [
        '1',
        '2',
        '3'
    ]
    const positions: Position[] = [];
    for (const accountId of accounts) {
        const accountPositions = await api.getAllPositions({
            accountId,
        });
        positions.push(...accountPositions)
    }
    const fund = await Promise.all(positions.filter((item) => item.instrumentGroupType === 'FND').map(async (item) => {
        const instruments = await api.getInstrumentInformation({
            instrumentId: item.instrumentId,
        })
        if (instruments && 'feeRate' in instruments) {
            return {
                ...item,
                feeRate: instruments.feeRate,
            }
        }
    })).then((a) => {
        return a.filter((item) => {
            return item?.feeRate !== undefined
        })
    });
    const maps = fund.sort((a, b) => {
        if (a?.feeRate && b?.feeRate){
            return a.feeRate.toNumber() - b.feeRate.toNumber()
        }
        return 0;
    })
    for (const i of maps) {
        console.log(`${i?.instrument}: ${i?.feeRate}%`)
    }
})();
