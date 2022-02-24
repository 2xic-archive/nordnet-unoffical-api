import dayjs, { Dayjs } from "dayjs";
import { SessionReturn } from "fetch-session";
import { injectable } from "inversify";
import { HttpHeaderConstructor } from "./HttpHeaderConstructor";

@injectable()
export class HttpAuthenticate {
  private lastAuth: Dayjs | undefined = undefined;
  private lastNtag: string | undefined = undefined;

  constructor(private httpHeaderConstructor: HttpHeaderConstructor) {}

  public async getAuth({
    fetchSession,
  }: {
    fetchSession: SessionReturn;
  }): Promise<string> {
    if (!this.lastAuth || this.lastAuth.diff(dayjs(), "seconds") > 60 * 5) {
      await this.login({ fetchSession });
    }
    const ntag = this.lastNtag;
    if (!ntag) {
      throw new Error("Missing ntag");
    }

    return ntag;
  }

  private async login({ fetchSession }: { fetchSession: SessionReturn }) {
    if (!process.env.NORDNET || !process.env.NORDNET_LOG) {
      throw new Error("Missing enviroment variables");
    }

    await this.getBaseCookie({ fetchSession });
    const ntagRequest = await fetchSession.fetch(
      "https://www.nordnet.no/api/2/login",
      {
        headers: this.httpHeaderConstructor.getHeaders({
          headers: {
            "client-id": "NEXT",
          },
        }),
      }
    );

    await fetchSession.fetch(
      "https://classic.nordnet.no/api/2/login/anonymous",
      {
        method: "post",
        headers: this.httpHeaderConstructor.getHeaders({
          headers: {},
        }),
      }
    );
    if (!ntagRequest) {
      throw new Error("Empty response");
    }

    let ntag = ntagRequest.headers.get("ntag");

    const request = {
      username: process.env.NORDNET,
      password: process.env.NORDNET_LOG,
    };

    if (!ntag) {
      throw new Error("Missing ntag");
    }

    const response = await fetchSession.fetch(
      "https://www.nordnet.no/api/2/authentication/basic/login",
      {
        method: "post",
        body: JSON.stringify(request),
        headers: this.httpHeaderConstructor.getHeaders({
          headers: {
            ntag,
            Accept: "application/json",
            "content-type": "application/json",
            "sub-client-id": "NEXT",
            TE: "Trailers",
            "client-id": "NEXT",
          },
        }),
      }
    );
    if (!response) {
      throw new Error("Empty response");
    }

    ntag = response.headers.get("ntag");
    if (!ntag) {
      throw new Error("Missing updated ntag");
    }

    this.lastAuth = dayjs();
    this.lastNtag = ntag;

    return ntag;
  }

  private async getBaseCookie({
    fetchSession,
  }: {
    fetchSession: SessionReturn;
  }) {
    await fetchSession.fetch("https://www.nordnet.no/", {
      headers: this.httpHeaderConstructor.getHeaders({
        headers: {},
      }),
    });

    await fetchSession.fetch("https://www.nordnet.no/login", {
      headers: this.httpHeaderConstructor.getHeaders({
        headers: {},
      }),
    });
  }
}
