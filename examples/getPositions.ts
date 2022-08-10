import * as dotenv from 'dotenv';
dotenv.config();

import { NordnetApi } from '../src';
import container from './container';

(async () => {
    const api = container.get(NordnetApi);
    const mainPositions = await api.getAllPositions({
        accountId: '3',
    });
    const secondPositions = await api.getAllPositions({
        accountId: '2',
    });

    const positions = mainPositions.concat(secondPositions);

    const fund = positions.filter((item) => item.instrumentGroupType === 'FND');
    const equity = positions.filter((item) => item.instrumentGroupType === 'EQ').map((item) => {
        if (item.currency === 'NOK' || item.currency == 'SEK'){
            return item;
        }
        item.acquiredPrice = item.acquiredPrice.multipliedBy(8)
        item.morningPrice = item.morningPrice.multipliedBy(8)
        return item;
    });

    /*
        Do I invest better than the funds ? 
    */
    const equityReducedAcquiredTotal = equity.map((item) => item.acquiredPrice.multipliedBy(item.quantity)).reduce((a, b) => a.plus(b));
    const equityReducedCurrentTotal = equity.map((item) => item.morningPrice.multipliedBy(item.quantity)).reduce((a, b) => a.plus(b));
    console.log(equityReducedCurrentTotal.dividedBy(equityReducedAcquiredTotal).multipliedBy(100).toString())

    const fundReducedAcquiredTotal = fund.map((item) => item.acquiredPrice.multipliedBy(item.quantity)).reduce((a, b) => a.plus(b));
    const fundReducedCurrentTotal = fund.map((item) => item.morningPrice.multipliedBy(item.quantity)).reduce((a, b) => a.plus(b));

    console.log(fundReducedCurrentTotal.dividedBy(fundReducedAcquiredTotal).multipliedBy(100).toString())

    console.log(mainPositions.map((item) => item.instrumentId))
})();
