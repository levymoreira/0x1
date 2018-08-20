import { DecodedLogEvent, ZeroEx } from '0x.js';
import { BigNumber } from '@0xproject/utils';
import * as Web3 from 'web3';

const TESTRPC_NETWORK_ID = 50;

// Provider pointing to local TestRPC on default port 8545
const provider = new Web3.providers.HttpProvider('http://localhost:8545');

// Instantiate 0x.js instance
const configs = {
    networkId: TESTRPC_NETWORK_ID,
};
const zeroEx = new ZeroEx(provider, configs);

// Number of decimals to use (for ETH and ZRX)
const DECIMALS = 18;

(async () => {
    // Addresses
    const WETH_ADDRESS = zeroEx.etherToken.getContractAddressIfExists(); // The wrapped ETH token contract
    const ZRX_ADDRESS = zeroEx.exchange.getZRXTokenAddress(); // The ZRX token contract
    // The Exchange.sol address (0x exchange smart contract)
    const EXCHANGE_ADDRESS = zeroEx.exchange.getContractAddress();

    console.log('WETH_ADDRESS', WETH_ADDRESS);
    console.log('ZRX_ADDRESS', ZRX_ADDRESS);
    console.log('EXCHANGE_ADDRESS', EXCHANGE_ADDRESS);

    // Getting list of accounts
    const accounts = await zeroEx.getAvailableAddressesAsync();
    console.log('accounts: ', accounts);

    // Set our addresses
    const [makerAddress, takerAddress] = accounts;
    console.log('makerAddress, takerAddress', makerAddress, takerAddress)

    // Unlimited allowances to 0x proxy contract for maker and taker
    const setMakerAllowTxHash = await zeroEx.token.setUnlimitedProxyAllowanceAsync(ZRX_ADDRESS, makerAddress);
    await zeroEx.awaitTransactionMinedAsync(setMakerAllowTxHash);

    const setTakerAllowTxHash = await zeroEx.token.setUnlimitedProxyAllowanceAsync(WETH_ADDRESS, takerAddress);
    await zeroEx.awaitTransactionMinedAsync(setTakerAllowTxHash);
    console.log('Taker allowance mined...');

    // Deposit WETH
    const ethAmount = new BigNumber(1);
    const ethToConvert = ZeroEx.toBaseUnitAmount(ethAmount, DECIMALS); // Number of ETH to convert to WETH
    const convertEthTxHash = await zeroEx.etherToken.depositAsync(WETH_ADDRESS, ethToConvert, takerAddress);
    await zeroEx.awaitTransactionMinedAsync(convertEthTxHash);
    console.log(`${ethAmount} ETH -> WETH conversion mined...`);

    // Creating an order
    const order = {
        maker: makerAddress,
        taker: ZeroEx.NULL_ADDRESS,
        feeRecipient: ZeroEx.NULL_ADDRESS,
        makerTokenAddress: ZRX_ADDRESS,
        takerTokenAddress: WETH_ADDRESS,
        exchangeContractAddress: EXCHANGE_ADDRESS,
        salt: ZeroEx.generatePseudoRandomSalt(),
        makerFee: new BigNumber(0),
        takerFee: new BigNumber(0),
        makerTokenAmount: ZeroEx.toBaseUnitAmount(new BigNumber(0.2), DECIMALS), // Base 18 decimals
        takerTokenAmount: ZeroEx.toBaseUnitAmount(new BigNumber(0.3), DECIMALS), // Base 18 decimals
        expirationUnixTimestampSec: new BigNumber(Date.now() + 3600000), // Valid for up to an hour
    };

    // Create orderHash
    const orderHash = ZeroEx.getOrderHashHex(order);

    // Signing orderHash -> ecSignature
    const shouldAddPersonalMessagePrefix = false;
    const ecSignature = await zeroEx.signOrderHashAsync(orderHash, makerAddress, shouldAddPersonalMessagePrefix);

    // Appending signature to order
    const signedOrder = {
        ...order,
        ecSignature,
    };

    // Verify that order is fillable
    await zeroEx.exchange.validateOrderFillableOrThrowAsync(signedOrder);

    // Try to fill order
    const shouldThrowOnInsufficientBalanceOrAllowance = true;
    const fillTakerTokenAmount = ZeroEx.toBaseUnitAmount(new BigNumber(0.1), DECIMALS);

    // Filling order
    const txHash = await zeroEx.exchange.fillOrderAsync(
        signedOrder,
        fillTakerTokenAmount,
        shouldThrowOnInsufficientBalanceOrAllowance,
        takerAddress,
    );

    // Transaction receipt
    const txReceipt = await zeroEx.awaitTransactionMinedAsync(txHash);
    console.log('FillOrder transaction receipt: ', txReceipt);

    const orders = await zeroEx.exchange.getOrdersInfoAsync([signedOrder]);
    console.log('Orders', orders);

})();




// Running migration: 1_initial_migration.js
//   Deploying Migrations...
//   ... 0x90b77b04b3391b394b957b8101fe274a2c959b18de4cebd1c1eab0bffd9f7c20
//   Migrations: 0x621b3a70b1924ef1ddb583abe90521522a3c3a8b
// Saving successful migration to network...
//   ... 0xf30407c7d5f1dd53102dc52914d10590aa53c9866a41debe7ce51476041406c6
// Saving artifacts...
// Running migration: 2_deploy_contracts.js
//   Deploying MyToken...
//   ... 0x5b33eec0edb08052579c85a15a8dd476bcd0a6fcf0066102a13de82f6b7c1287
//   MyToken: 0x8343df940607a27e6c07cb7df730a9ed5f10c08a
// Saving successful migration to network...
//   ... 0x597f689718d6690953d1f18521d6e1f353e909ada464349ef8c1ab1092a51491
// Saving artifacts...