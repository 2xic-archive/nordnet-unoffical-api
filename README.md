# nordnet-unofficial-api
**No warranty is given. No complaints will be answered. Use at your own risk.**


## Why ? 
Nordnet has no official api in Norway, and I was tired of waiting.

## Features
Since I needed the api to do DCA (dollar cost averaging), only basic "broker" support has been added.

It also has support for fetching upcoming dividends payouts.

I might implemented some more features in the future. Feel free to open a issue if you need a feature, I might add it.

## How ? 
Uses the old Nordnet login format with username, and password. This way there is no need to authenticate with BankId.

### Usage
To use the code create a `.env` file with 
```
NORDNET_USERNAME="YOUR_USERNAME"
NORDNET_PASSWORD="YOUR_PASSWORD"
```

There is an example in `examples/` folder. Since this code was part of a larger project, it was written with dependency injection in mind.

