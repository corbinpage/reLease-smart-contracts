# reLease Smart Contracts
## Overview
The [reLease dApp](https://leasing.meridio.co/) allows anyone to rent a stylish, productive workspace for the day to work amongst a group of creative peers, with no subscription or lock in. Coworking spaces can monetize unused space by adding hot desks, conference rooms, or event space to the app and instantly get paid out in ETH when they are reserved.

The [Meridio](https://www.meridio.co/) team has open sourced the reLease smart contracts for the community to review, use, and build off. We'll be continuing to evolve the contracts over time, so check back for updates. Note that the contracts have **not been through an official security audit**, so they should not be used in Production.

## Smart Contracts
### OpenRentableToken
The OpenRentableToken is an ERC721 token representing a hot desk, conference room, or event space that can be rented by the day by any individual with an Ethereum wallet. Property owns mint new spaces and set the daily rental rate, which any renter reserve by paying in ETH up front.

## Usage 
### Testing
Truffle is a development environment, testing framework and asset pipeline for Ethereum, aiming to make life as an Ethereum developer easier. 
```bash
 npm install -g truffle
```

You can run truffle compile, truffle migrate and truffle test to compile your contracts, deploy those contracts to the network, and run their associated unit tests. [Ganache](https://truffleframework.com/docs/ganache/quickstart) is recommended for local blockchain development.

```bash
truffle compile
truffle migrate
truffle test
```

## Future Development
* Considering using a Treemap for storing reservations as [outlined here](https://medium.com/coinmonks/erc809-1201-tokenizing-non-fungible-access-abdc5018c49).
* Considering making each reservations their own ERC721 token.
* Support ERC20 and stablecoin payments.
* Support tenants renting by the hour, week, or month (not just day).
* Support tenants paying for the space after they've used it.
* Support tenants putting down a deposit to save the space.
* Support subletting.

## License
MIT