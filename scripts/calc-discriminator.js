const crypto = require('crypto');

// Anchor discriminator is sha256("account:Multisig")[0..8]
const hash = crypto.createHash('sha256');
hash.update('account:Multisig');
const discriminator = hash.digest().slice(0, 8);

console.log('Expected Anchor discriminator for Multisig:');
console.log('Hex:', discriminator.toString('hex'));
console.log('Bytes:', Array.from(discriminator));
console.log('');

// Check initialize discriminator
const hash2 = crypto.createHash('sha256');
hash2.update('global:initialize');
const initDisc = hash2.digest().slice(0, 8);

console.log('Initialize instruction discriminator:');
console.log('Hex:', initDisc.toString('hex'));
console.log('Bytes:', Array.from(initDisc));
