import BigNumber from "bignumber.js";
import { Container } from "inversify";
import { NordnetBroker } from ".";
import { TooLowBalance } from "./errors/TooLowBalance";
import { MockNordnetApi } from "./http-nordnet/MockNordnetApi";
import { NordnetApi } from "./http-nordnet/NordnetApi";

describe("NordnetBroker", () => {
  let container: Container;

  beforeEach(async () => {
    container = new Container({
      defaultScope: "Singleton",
      autoBindInjectable: true,
    });
    container.bind(NordnetApi).to(MockNordnetApi);
    container.bind(NordnetBroker).toSelf();
  });

  it("should throw an error if the account balance is low than dca amount", async () => {
    const nordnetApi = container.get(NordnetApi) as MockNordnetApi;
    nordnetApi.setBalanceResponse({
      balance: new BigNumber(0),
      stock: "NOK",
    });
    nordnetApi.setSearchResponse({
      lastPrice: new BigNumber(100),
      instrumentId: "1",
    });

    const nordnetBroker = container.get(NordnetBroker);
    await expect(
      async () =>
        await nordnetBroker.dca({
          accountId: "1",
          stock: "NBX.OL",
          amount: new BigNumber(100),
        })
    ).rejects.toBeInstanceOf(TooLowBalance);
  });

  it("should not throw an error if the account balance is higher than dca amount", async () => {
    const nordnetApi = container.get(NordnetApi) as MockNordnetApi;
    nordnetApi.setBalanceResponse({
      balance: new BigNumber(1000),
      stock: "NOK",
    });
    nordnetApi.setSearchResponse({
      lastPrice: new BigNumber(100),
      instrumentId: "1",
    });

    const nordnetBroker = container.get(NordnetBroker);
    await expect(
      async () =>
        await nordnetBroker.dca({
          accountId: "1",
          stock: "NBX.OL",
          amount: new BigNumber(100),
        })
    ).toBeTruthy();
  });
});
