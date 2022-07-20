import BigNumber from "bignumber.js";
import * as dotenv from "dotenv";
dotenv.config();

import { NordnetBroker } from "../src";
import container from "./container";

(async () => {
    const api = container.get(NordnetBroker);
    const orders = await api.changeOrder({
        orderId: '368513033',
        amount: new BigNumber(6.1),
    });
    console.log(orders);
})();
import { Log, Prisma, PrismaClient, StopBreaks } from "@prisma/client";
import exitHook from "exit-hook";
import { injectable } from "inversify";
import { Create, DbConnection, QueryOptions, Update, Where } from "./DbConnection";

@injectable()
export class PrismaConnection implements DbConnection {
    private prisma: PrismaClient;

    private isConnected: boolean = false;

    public connect() {
        this.prisma = new PrismaClient();
        exitHook(() => {
            this.prisma.$disconnect();
        });
    }

    public get connection(): PrismaClient {
        if (!this.isConnected) {
            this.connect();
            this.isConnected = true;
        } else if (!this.prisma) {
            throw new Error('Not connected to database');
        }
        return this.prisma;
    }

    public get stopBreaks(): QueryOptions<StopBreaks> {
        const options = this.connection.stopBreaks;
        return this.createQueryOptions<StopBreaks>(options);
    }


    public get log(): QueryOptions<Log> {
        const options = this.connection.log;
        return this.createQueryOptions<Log>(options as any);
    }

    private createQueryOptions<T extends { id: number }>(options: WhereOptions<T>): QueryOptions<T> {
        return {
            ...options,
            save: (item) => {
                if ('id' in item) {
                    return options.update({
                        where: {
                            id: item.id,
                        },
                        data: {
                            ...item
                        }
                    })
                } else {
                    return options.create({
                        data: {
                            ...item,
                        }
                    })
                }
            },
        };
    }
}

interface WhereOptions<T extends { id: number }> {
    findMany: (options?: {
        where?: Where<T>
    }) => Promise<T[]>;

    update: (options: {
        where: {
            id: number;
        };
        data: Update<T>
    }) => Promise<T>, create: (options: { data: Create<T> }) => Promise<T>
}
