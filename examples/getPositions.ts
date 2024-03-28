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
    for(const accountId of accounts){
        const accountPositions = await api.getAllPositions({
            accountId,
        });
        positions.push(...accountPositions)
    }
    
    const fund = positions.filter((item) => item.instrumentGroupType === 'FND');
    const equity = positions.filter((item) => item.instrumentGroupType === 'EQ').map((item) => {
        if (item.currency === 'NOK' || item.currency == 'SEK') {
            return item;
        }
        item.acquiredPrice = item.acquiredPrice.multipliedBy(8)
        item.morningPrice = item.morningPrice.multipliedBy(8)
        return item;
    });

    /*
        Do I invest better than the funds ? 
        NOTE: THis only looks at the active positions
    */
    const equityReducedAcquiredTotal = equity.map((item) => item.acquiredPrice.multipliedBy(item.quantity)).reduce((a, b) => a.plus(b), new BigNumber(0));
    const equityReducedCurrentTotal = equity.map((item) => item.morningPrice.multipliedBy(item.quantity)).reduce((a, b) => a.plus(b), new BigNumber(0));
    const profitPercentage = (equityReducedCurrentTotal.dividedBy(equityReducedAcquiredTotal).multipliedBy(100).decimalPlaces(2).toString())
    console.log(`Equity profit percentage: ${profitPercentage}`)

    const fundReducedAcquiredTotal = fund.map((item) => item.acquiredPrice.multipliedBy(item.quantity)).reduce((a, b) => a.plus(b), new BigNumber(0));
    const fundReducedCurrentTotal = fund.map((item) => item.morningPrice.multipliedBy(item.quantity)).reduce((a, b) => a.plus(b), new BigNumber(0));

    const fundProfitPercentage = (fundReducedCurrentTotal.dividedBy(fundReducedAcquiredTotal).multipliedBy(100).decimalPlaces(2).toString())
    console.log(`Fund profit percentage: ${fundProfitPercentage}`)
})();
