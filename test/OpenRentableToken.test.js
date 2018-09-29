const { assertRevert } = require('./helpers/assertRevert');
const expectThrow = require('./helpers/utils.js').expectThrow;
const _ = require('lodash');

const BigNumber = web3.BigNumber;
const OpenRentableToken = artifacts.require('OpenRentableToken.sol');

require('chai')
  .use(require('chai-bignumber')(BigNumber))
  .should();

contract('OpenRentableToken', function (accounts) {
  const name = 'Non Fungible Token';
  const symbol = 'NFT';
  const firstTokenId = 100;
  const secondTokenId = 200;
  const nonExistentTokenId = 999;
  const creator = accounts[0];
  const otherUser = accounts[1];
  const anyone = accounts[9];
  const noAddress = '0x0000000000000000000000000000000000000000';
  const RENTAL_TIME_INTERVAL = 24*3600;
  const RENTAL_PRICE = 0;
  let t0 = new Date(), startTime = new Date(), endTime = new Date();
  startTime.setDate(t0.getDate() + 1);
  endTime.setDate(t0.getDate() + 8);
  startTime = Math.floor(startTime.getTime()/1000);
  endTime = Math.floor(endTime.getTime()/1000);
  t0 = Math.floor(t0.getTime()/1000);

  beforeEach(async function () {
    this.token = await OpenRentableToken.new(name, symbol, { from: creator });
  });

  describe('like an OpenRentableToken', function () {
    beforeEach(async function () {
      await this.token.mint(creator, firstTokenId, { from: creator });
      await this.token.mint(creator, secondTokenId, { from: creator });
    });

    describe('checkAvailable for the token', function () {
      it('returns true if available', async function () {
        (await this.token.checkAvailable(firstTokenId, startTime, endTime)).should.be.true;
      });

      it('returns false if reserved', async function () {
        await this.token.reserve(firstTokenId, startTime, endTime);
        (await this.token.checkAvailable(firstTokenId, startTime, endTime)).should.be.false;
      });
    });

    describe('reserve the token', function () {
      it('requires the startTime to be less than the endTime', async function () {
        await assertRevert(
          this.token.reserve(firstTokenId, startTime, t0)
        );
      });

      it('requires the startTime to be less than the currentTime', async function () {
        await assertRevert(
          this.token.reserve(firstTokenId, t0 - RENTAL_TIME_INTERVAL, endTime)
        );
      });

      it('returns false if reserved the whole time', async function () {
        await this.token.reserve(firstTokenId, startTime, endTime);
        await assertRevert(
          this.token.reserve(firstTokenId, startTime, endTime)
        );
      });

      it('fails if reserved during the startTime', async function () {
        await this.token.reserve(firstTokenId, startTime, startTime);
        await assertRevert(
          this.token.reserve(firstTokenId, startTime, endTime)
        );
      });

      it('fails if reserved during the endTime', async function () {
        await this.token.reserve(firstTokenId, endTime, endTime + RENTAL_TIME_INTERVAL);
        await assertRevert(
          this.token.reserve(firstTokenId, startTime, endTime)
        );
      });

      it('fails if reserved during the between time', async function () {
        await this.token.reserve(firstTokenId, startTime + RENTAL_TIME_INTERVAL, endTime - RENTAL_TIME_INTERVAL);
        await assertRevert(
          this.token.reserve(firstTokenId, startTime, endTime)
        );
      });

      it('correctly reserves for one day', async function () {
        await this.token.reserve(firstTokenId, startTime, startTime);
        (await this.token.checkAvailable(firstTokenId, startTime, startTime)).should.be.false;
      });

      it('correctly reserves for 60 days', async function () {
        await this.token.reserve(firstTokenId, startTime, startTime + (RENTAL_TIME_INTERVAL*60));
        (await this.token.checkAvailable(firstTokenId, startTime, startTime + (RENTAL_TIME_INTERVAL*60))).should.be.false;
      });
    });

    describe('getRenter the token', function () {
      it('correctly identifies renters', async function () {
        await this.token.reserve(firstTokenId, startTime, endTime, {from: creator});
        (await this.token.getRenter(firstTokenId, startTime)).should.equal(creator);
        (await this.token.getRenter(firstTokenId, endTime)).should.equal(creator);
        (await this.token.getRenter(firstTokenId, startTime - RENTAL_TIME_INTERVAL)).should.not.equal(creator);
        (await this.token.getRenter(firstTokenId, startTime - RENTAL_TIME_INTERVAL)).should.equal(noAddress);
        (await this.token.getRenter(firstTokenId, endTime + RENTAL_TIME_INTERVAL)).should.not.equal(creator);
        (await this.token.getRenter(firstTokenId, endTime + RENTAL_TIME_INTERVAL)).should.equal(noAddress);
      });
    });

    describe('setRentalTimeInterval for the token', function () {
      it('allows the token owner to change the interval', async function () {
        (await this.token.getRentalTimeInterval(firstTokenId)).toNumber().should.equal(RENTAL_TIME_INTERVAL);
        const NEW_RENTAL_TIME_INTERVAL = 3600*24*7;
        await this.token.setRentalTimeInterval(firstTokenId, NEW_RENTAL_TIME_INTERVAL, { from: creator });
        (await this.token.getRentalTimeInterval(firstTokenId)).toNumber().should.equal(NEW_RENTAL_TIME_INTERVAL);
      });

      it('does not allow a non-token owner to change the interval', async function () {
        (await this.token.getRentalTimeInterval(firstTokenId)).toNumber().should.equal(RENTAL_TIME_INTERVAL);
        const NEW_RENTAL_TIME_INTERVAL = 3600*24*7;
        await assertRevert(
          this.token.setRentalTimeInterval(firstTokenId, NEW_RENTAL_TIME_INTERVAL, { from: anyone })
        );
      });
    });

    describe('setRentalPrice for the token', function () {
      it('allows the token owner to change the price', async function () {
        (await this.token.getRentalPrice(firstTokenId)).toNumber().should.equal(RENTAL_PRICE);
        const NEW_RENTAL_PRICE = 1000000000000000000;
        await this.token.setRentalPrice(firstTokenId, NEW_RENTAL_PRICE, { from: creator });
        (await this.token.getRentalPrice(firstTokenId)).toNumber().should.equal(NEW_RENTAL_PRICE);
      });

      it('does not allow a non-token owner to change the price', async function () {
        (await this.token.getRentalPrice(firstTokenId)).toNumber().should.equal(RENTAL_PRICE);
        const NEW_RENTAL_PRICE = 1000000000000000000;
        await assertRevert(
          this.token.setRentalPrice(firstTokenId, NEW_RENTAL_PRICE, { from: anyone })
        );
      });
    });

    describe('rental price for the token', function () {
      it('allows reservations when rental price is 0', async function () {
        (await this.token.getRentalPrice(firstTokenId)).toNumber().should.equal(RENTAL_PRICE);
        await this.token.reserve(firstTokenId, startTime, endTime, {
          from: creator,
          value: new BigNumber(RENTAL_PRICE)
        });
        (await this.token.getRenter(firstTokenId, startTime)).should.equal(creator);
      });

      it('allows reservations when rental price is populated', async function () {
        const NEW_RENTAL_PRICE = 1000000000000000000;
        await this.token.setRentalPrice(firstTokenId, NEW_RENTAL_PRICE, { from: creator });
        (await this.token.getRentalPrice(firstTokenId)).toNumber().should.equal(NEW_RENTAL_PRICE);
        await this.token.reserve(firstTokenId, startTime, endTime, {
          from: creator,
          value: new BigNumber(NEW_RENTAL_PRICE)
        });
        (await this.token.getRenter(firstTokenId, startTime)).should.equal(creator);
      });

      it('rejects reservations when rental price is not met', async function () {
        const NEW_RENTAL_PRICE = 1000000000000000000;
        await this.token.setRentalPrice(firstTokenId, NEW_RENTAL_PRICE, { from: creator });
        (await this.token.getRentalPrice(firstTokenId)).toNumber().should.equal(NEW_RENTAL_PRICE);
        await assertRevert(
          this.token.reserve(firstTokenId, startTime, endTime, {
            from: creator,
            value: new BigNumber(0)
          })
        );
      });
    });

    describe('mintWithPrice function', function () {
      it('allows tokens to be minted with a price', async function () {
        const tokenId = 1;
        const NEW_RENTAL_PRICE = 1000000000000000000;
        await this.token.mintWithPrice(creator, tokenId, NEW_RENTAL_PRICE, { from: creator });
        (await this.token.getRentalPrice(tokenId)).toNumber().should.equal(NEW_RENTAL_PRICE);
      });
    });

    describe('cancelReservation function', function () {
      it('allows token owner to cancel reservation', async function () {
        await this.token.reserve(firstTokenId, startTime, endTime, {
          from: anyone,
          value: new BigNumber(RENTAL_PRICE)
        });
        (await this.token.getRenter(firstTokenId, startTime)).should.equal(anyone);

        await this.token.cancelReservation(firstTokenId, startTime, endTime, {
          from: creator
        });
        (await this.token.getRenter(firstTokenId, startTime)).should.equal(noAddress);
      });

      it('does not allow non-owners to cancel reservation', async function () {
        await this.token.reserve(firstTokenId, startTime, endTime, {
          from: anyone,
          value: new BigNumber(RENTAL_PRICE)
        });
        (await this.token.getRenter(firstTokenId, startTime)).should.equal(anyone);

        await assertRevert(
          this.token.cancelReservation(firstTokenId, startTime, endTime, {
            from: otherUser
          })
        );
      });

      it('cancels multiple reservations within that timeframe', async function () {
        await this.token.reserve(firstTokenId, startTime, startTime + (2 * RENTAL_TIME_INTERVAL), {
          from: anyone,
          value: new BigNumber(RENTAL_PRICE)
        });
        await this.token.reserve(firstTokenId, startTime + (3 * RENTAL_TIME_INTERVAL), endTime, {
          from: anyone,
          value: new BigNumber(RENTAL_PRICE)
        });
        (await this.token.getRenter(firstTokenId, startTime)).should.equal(anyone);
        (await this.token.getRenter(firstTokenId, startTime + (3 * RENTAL_TIME_INTERVAL))).should.equal(anyone);

        await this.token.cancelReservation(firstTokenId, startTime, endTime, {
          from: creator
        });
        (await this.token.getRenter(firstTokenId, startTime)).should.equal(noAddress);
        (await this.token.getRenter(firstTokenId, startTime + (3 * RENTAL_TIME_INTERVAL))).should.equal(noAddress);
      });

      it('does not allow cancellation for past reservations', async function () {
        await assertRevert(
          this.token.cancelReservation(firstTokenId, t0 - RENTAL_TIME_INTERVAL, endTime, {
            from: creator
          })
        );
      });
    });
  });

  describe('like a full ERC721', function () {
    beforeEach(async function () {
      await this.token.mint(creator, firstTokenId, { from: creator });
      await this.token.mint(creator, secondTokenId, { from: creator });
    });

    describe('mint', function () {
      const to = accounts[1];
      const tokenId = 3;

      beforeEach(async function () {
        await this.token.mint(to, tokenId);
      });

      it('adjusts owner tokens by index', async function () {
        (await this.token.tokenOfOwnerByIndex(to, 0)).toNumber().should.be.equal(tokenId);
      });

      it('adjusts all tokens list', async function () {
        (await this.token.tokenByIndex(2)).toNumber().should.be.equal(tokenId);
      });
    });

    describe('burn', function () {
      const tokenId = firstTokenId;
      const sender = creator;

      beforeEach(async function () {
        await this.token.burn(tokenId, { from: sender });
      });

      it('removes that token from the token list of the owner', async function () {
        (await this.token.tokenOfOwnerByIndex(sender, 0)).toNumber().should.be.equal(secondTokenId);
      });

      it('adjusts all tokens list', async function () {
        (await this.token.tokenByIndex(0)).toNumber().should.be.equal(secondTokenId);
      });

      it('burns all tokens', async function () {
        await this.token.burn(secondTokenId, { from: sender });
        (await this.token.totalSupply()).toNumber().should.be.equal(0);
        await assertRevert(this.token.tokenByIndex(0));
      });
    });

    describe('removeTokenFrom', function () {
      it('reverts if the correct owner is not passed', async function () {
        await assertRevert(
          this.token.removeTokenFrom(anyone, firstTokenId, { from: creator })
        );
      });

      context('once removed', function () {
        beforeEach(async function () {
          await this.token.removeTokenFrom(creator, firstTokenId, { from: creator });
        });

        it('has been removed', async function () {
          await assertRevert(this.token.tokenOfOwnerByIndex(creator, 1));
        });

        it('adjusts token list', async function () {
          (await this.token.tokenOfOwnerByIndex(creator, 0)).toNumber().should.be.equal(secondTokenId);
        });

        it('adjusts owner count', async function () {
          (await this.token.balanceOf(creator)).toNumber().should.be.equal(1);
        });

        it('does not adjust supply', async function () {
          (await this.token.totalSupply()).toNumber().should.be.equal(2);
        });
      });
    });

    describe('metadata', function () {
      const sampleUri = 'mock://mytoken';

      it('has a name', async function () {
        (await this.token.name()).should.be.equal(name);
      });

      it('has a symbol', async function () {
        (await this.token.symbol()).should.be.equal(symbol);
      });

      it('sets and returns metadata for a token id', async function () {
        await this.token.setTokenURI(firstTokenId, sampleUri);
        (await this.token.tokenURI(firstTokenId)).should.be.equal(sampleUri);
      });

      it('reverts when setting metadata for non existent token id', async function () {
        await assertRevert(this.token.setTokenURI(nonExistentTokenId, sampleUri));
      });

      it('can burn token with metadata', async function () {
        await this.token.setTokenURI(firstTokenId, sampleUri);
        await this.token.burn(firstTokenId);
        (await this.token.exists(firstTokenId)).should.be.false;
      });

      it('returns empty metadata for token', async function () {
        (await this.token.tokenURI(firstTokenId)).should.be.equal('');
      });

      it('reverts when querying metadata for non existent token id', async function () {
        await assertRevert(this.token.tokenURI(nonExistentTokenId));
      });
    });

    describe('totalSupply', function () {
      it('returns total token supply', async function () {
        (await this.token.totalSupply()).should.be.bignumber.equal(2);
      });
    });

    describe('tokenOfOwnerByIndex', function () {
      const owner = creator;
      const another = accounts[1];

      describe('when the given index is lower than the amount of tokens owned by the given address', function () {
        it('returns the token ID placed at the given index', async function () {
          (await this.token.tokenOfOwnerByIndex(owner, 0)).should.be.bignumber.equal(firstTokenId);
        });
      });

      describe('when the index is greater than or equal to the total tokens owned by the given address', function () {
        it('reverts', async function () {
          await assertRevert(this.token.tokenOfOwnerByIndex(owner, 2));
        });
      });

      describe('when the given address does not own any token', function () {
        it('reverts', async function () {
          await assertRevert(this.token.tokenOfOwnerByIndex(another, 0));
        });
      });

      describe('after transferring all tokens to another user', function () {
        beforeEach(async function () {
          await this.token.transferFrom(owner, another, firstTokenId, { from: owner });
          await this.token.transferFrom(owner, another, secondTokenId, { from: owner });
        });

        it('returns correct token IDs for target', async function () {
          (await this.token.balanceOf(another)).toNumber().should.be.equal(2);
          const tokensListed = await Promise.all(_.range(2).map(i => this.token.tokenOfOwnerByIndex(another, i)));
          tokensListed.map(t => t.toNumber()).should.have.members([firstTokenId, secondTokenId]);
        });

        it('returns empty collection for original owner', async function () {
          (await this.token.balanceOf(owner)).toNumber().should.be.equal(0);
          await assertRevert(this.token.tokenOfOwnerByIndex(owner, 0));
        });
      });
    });

    describe('tokenByIndex', function () {
      it('should return all tokens', async function () {
        const tokensListed = await Promise.all(_.range(2).map(i => this.token.tokenByIndex(i)));
        tokensListed.map(t => t.toNumber()).should.have.members([firstTokenId, secondTokenId]);
      });

      it('should revert if index is greater than supply', async function () {
        await assertRevert(this.token.tokenByIndex(2));
      });

      [firstTokenId, secondTokenId].forEach(function (tokenId) {
        it(`should return all tokens after burning token ${tokenId} and minting new tokens`, async function () {
          const owner = accounts[0];
          const newTokenId = 300;
          const anotherNewTokenId = 400;

          await this.token.burn(tokenId, { from: owner });
          await this.token.mint(owner, newTokenId, { from: owner });
          await this.token.mint(owner, anotherNewTokenId, { from: owner });

          (await this.token.totalSupply()).toNumber().should.be.equal(3);

          const tokensListed = await Promise.all(_.range(3).map(i => this.token.tokenByIndex(i)));
          const expectedTokens = _.filter(
            [firstTokenId, secondTokenId, newTokenId, anotherNewTokenId],
            x => (x !== tokenId)
          );
          tokensListed.map(t => t.toNumber()).should.have.members(expectedTokens);
        });
      });
    });
  });

});