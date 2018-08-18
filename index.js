const ZeroEx = require('0x.js');

const provider = new Web3.providers.HttpProvider('http://localhost:8545');

console.log(JSON.stringify(ZeroEx))
ZeroEx
    .getAvailableAddressesAsync()
    .then(function(availableAddresses) {
        console.log(availableAddresses);
    })
    .catch(function(error) {
        console.log('Caught error: ', error);
    });