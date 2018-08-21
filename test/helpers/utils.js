module.exports = {
  isEVMException: err => {
    return err.toString().includes('revert');
  },
  expectThrow: async promise => {
    try {
      await promise;
    } catch (error) {
      const VMExeception = error.message.search('VM Exception') >= 0;
      const invalidJump = error.message.search('invalid JUMP') >= 0;
      const invalidOpcode = error.message.search('invalid opcode') >= 0;
      const outOfGas = error.message.search('out of gas') >= 0;
      assert(VMExeception || invalidJump || invalidOpcode || outOfGas, 'Expected throw, got \'' + error + '\' instead');
      return;
    }
    assert.fail('Expected throw not received');
  },
  adjustBalance: balance => {
    const fee = .03; // represents hardcoded 3% fee from UnitTrust contract
    return Math.floor(balance * (1 - fee));
  },
};
