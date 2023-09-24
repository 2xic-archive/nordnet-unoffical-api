import BigNumber from 'bignumber.js';
import dayjs from 'dayjs';
import * as dotenv from 'dotenv';
dotenv.config();

import { NordnetApi, Transaction } from '../src';
import container from './container';

const api = container.get(NordnetApi);


function consoleLogRedColor(string: string){
    console.log('\x1b[31m%s\x1b[0m', string);
}

function consoleLogGreenColor(string: string){
    console.log('\x1b[32m%s\x1b[0m', string);
}

function colorPrint(string: string, value: BigNumber){
    if (value.isLessThan(0)){
        consoleLogRedColor(string);
    } else {
        consoleLogGreenColor(string);
    }
}

async function getAccountTransactions({ accountId }: { accountId: string }) {
    const allTransactions: Transaction[] = [];
    const limit = 250;
    let offset = 0;
    let hasTransactions = true;
    while (hasTransactions) {
        const transactions = await api.getTransactionReport({
            accountId,
            fromDate: dayjs('2018-01-01'),
            toDate: dayjs(),
            limit,
            offset,
        });

        if (transactions.length >= limit) {
            allTransactions.push(...transactions);
        } else {
            allTransactions.push(...transactions);
            hasTransactions = false;
        }

        await new Promise<void>((resolve) => setTimeout(resolve, 500))
        offset += limit;
    }

    return allTransactions;
}

async function getMarketPrice({ instrumentId }: { instrumentId: string }) {
    return api.getInstrumentInformation({
        instrumentId
    }).then((item) => {
        const lastPrice = item?.price.lastPrice;
        if (lastPrice){
            return {
                lastPrice,
                currency: item.currency
            };
        }
    })
}

function adjustCurrency({currency, value}: {value: BigNumber; currency: string}){
    let adjustmentConstant = 1;
    if (currency === 'USD') {
        adjustmentConstant = 8;
    }
    return value.multipliedBy(adjustmentConstant);
}


(async () => {
    let transactions: Transaction[] = [];
    // Replace with your account ids
    for (const accountId of ['1', '2', '3']) {
        const results = await getAccountTransactions({
            accountId
        });
        transactions.push(...(results))
    }
    transactions = transactions.sort((a, b) => a.settled?.isBefore(b.settled) ? -1 : 1);

    const deposited = transactions.filter((item) => item && item.transaction && item.transaction?.id && ['#IAG', '#INB'].includes(item.transaction?.id)).map((a) => a.totalAmount).reduce((a, b): BigNumber => a.plus(b), new BigNumber(0))
    const dividends = transactions.filter((item) => item && item.transaction && item.transaction?.id === 'UD').map((a) => a.totalAmount).reduce((a, b): BigNumber => a.plus(b), new BigNumber(0));
    const instruments: Partial<Record<string, {
        quantity: BigNumber;
        price: BigNumber;
    }[]>> = {};
    const instrumentsPnL: Record<string, BigNumber> = {};
    const instrument2InstrumentId: Record<string, string> = {};
    const instrument2Currency: Record<string, string> = {};
    // Standard FIFO PnL
    transactions.forEach((item) => {
        const instrumentPriceAdjusted = item.instrumentPrice;
        if (item.instrument){
            instrument2Currency[item.instrument.symbol] = item.currency;
        }
        // Buy transaction
        if (item.transaction?.id === 'K' && item.instrument?.symbol) {
            if (!instruments[item.instrument?.symbol]) {
                instruments[item.instrument?.symbol] = [];
            }
            instruments[item.instrument?.symbol]?.push({
                price: instrumentPriceAdjusted,
                quantity: item.quantity
            });
            instrumentsPnL[item.instrument.symbol] = new BigNumber(0);
            instrument2InstrumentId[item.instrument.symbol] = item.instrument.id;
        } 
        // Sell transaction
        else if (item.transaction?.id === 'S' && item.instrument?.symbol) {
            let quantityBalance: BigNumber = item.quantity;
            while (instruments[item.instrument.symbol]?.length && quantityBalance.isGreaterThan(0)) {
                const buyTransactionAmount = instruments[item.instrument.symbol];
                if (!buyTransactionAmount) {
                    throw new Error(`Found no buy transaction ${item.instrument.symbol}`)
                }
                const buy = buyTransactionAmount[0];
                const { price, quantity } = buy;
                const hasUnspentTransaction = quantity.isGreaterThan(0);
                if (hasUnspentTransaction) {
                    const delta = BigNumber.min(quantity, quantityBalance);
                    // I want the profits in a single currency
                    instrumentsPnL[item.instrument.symbol] = adjustCurrency({
                        value: instrumentsPnL[item.instrument.symbol].plus(delta.multipliedBy(instrumentPriceAdjusted.minus(price))),
                        currency: item.currency,
                    });
                    quantityBalance = quantityBalance.minus(delta);
                    buyTransactionAmount[0].quantity = buy.quantity.minus(delta);
                } else {
                    instruments[item.instrument.symbol]?.shift();
                }
            }
        }
    })

    console.log({
        deposited: deposited.toString(),
        dividends: dividends.toString(),
    })
    let sum = new BigNumber(0);
    let unrealized = new BigNumber(0);
    const output: Array<[string[], BigNumber]> = [];
    for (const [instrument, PnL] of Object.entries(instrumentsPnL)) {
        const holdingQuantity = instruments[instrument]?.map((item) => item.quantity)?.reduce((a, b) => a?.plus(b), new BigNumber(0));
        const outputLines: string[] = [
        ]
        if (!PnL.isZero()){
            outputLines.push(`${instrument} ${PnL.toString()} (Holding quantity ${holdingQuantity})`)
        }
        let positionPnL = PnL;
        sum = sum.plus(PnL);
        if (holdingQuantity?.isGreaterThan(0) && instrument2InstrumentId[instrument]) {
            const marketPrice = await getMarketPrice({
                instrumentId: instrument2InstrumentId[instrument]
            })
            const instrumentTransactions = instruments[instrument];
            if (marketPrice && instrumentTransactions) {
                const avgBuyPrice = instrumentTransactions.map((item) => item.price).reduce((a, b) => a.plus(b), new BigNumber(0)).dividedBy(instrumentTransactions.length)
                const delta = adjustCurrency({
                    value: instrumentTransactions.map((item) => (marketPrice.lastPrice.minus(item.price)).times(item.quantity)).reduce((a, b) => a?.plus(b), new BigNumber(0)),
                    currency: marketPrice.currency
                });
                unrealized = unrealized.plus(delta);
                outputLines.push(`(Unrealized) ${instrument} ${delta} (buy avg ${avgBuyPrice}, price now ${marketPrice.lastPrice}, holding ${holdingQuantity})`)
                positionPnL = positionPnL.plus(delta);
            }
        }
        output.push([outputLines, positionPnL])
    }

    for(const i of output.sort((a, b) => a[1].isLessThan(b[1]) ? -1 : 1)) {
        for(const j of i[0]){
            colorPrint(j, i[1])
        }
    }

    console.log('');
    console.log(`Trading profits ${sum.toString()}`);
    console.log(`Unrealized profits ${unrealized}`)
})();

