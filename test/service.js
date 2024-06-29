const { Web3 } = require('web3');
const { ethers } = require('ethers');
const minimist = require('minimist');
const crypto = require('crypto');
const fs = require('fs');
const BN = require('bn.js');

// const helloworld = require('./contracts/helloworld.json');
const metaauth_otp = require('../build/contracts/MetaAuth_OTP.json');

const web3 = new Web3(new Web3.providers.HttpProvider('http://172.22.160.1:7545'));
const { abi, networks } = metaauth_otp;
const contractAddress = networks['5777'].address;
const contract = new web3.eth.Contract(abi, contractAddress);

web3.eth.handleRevert = true;
BN.prototype.toJSON = function() {
  return this.toString(10);
};

const args = minimist(process.argv.slice(2));
console.log(args)

const addr = {
  7: "0x3E20bec2679F668a324B33070C9F53F0ED61466a",
  8: "0xc52Da04D9a9a75E0DFA470CAd1ec50aDcAC7D614",
  9: "0x17732cC96579344d86196741B1E2c28d635dc681"
}

const sk = {
  7: "0x6d33ae5c48051cf67090cd4dd1097ef0fed5c94a5dec43e9f4f5f314d892c234",
  8: "0x2a834dae2b5ef4ce66429defb3923eb03a8f30ed5539881f998ce8a6dac35889",
  9: "0x0416c8d6004667e9ccda688896877691d901ce9f54c3dd4e3f8d0fd4004da45c"
}

const auth_wallet_name = `address_${args.wallet}_wallet.json`
const auth_wallet_info = JSON.parse(fs.readFileSync(auth_wallet_name, 'utf8'));

const account = web3.eth.accounts.privateKeyToAccount(sk[args.wallet])
// console.log(account.address);
// console.log(contract.methods)

const check = async (account) => {

  try {
    const res = await contract.methods.serviceProviders(account.address)
      .call({from: account.address})
    console.log(JSON.stringify(res, (k, v) => typeof v === 'bigint'?v.toString():v));

  } catch (error) {
    let errFlat = JSON.parse(JSON.stringify(error));
    console.error(error)
    console.error('Error:', errFlat);
    if (errFlat.cause && errFlat.cause.message) {
      console.error('Revert reason: ', errFlat.cause.message);
    } else {
      console.error("Revert reason not found in error data");
    }
  }

}

const register = async (account, auth_wallet_info) => {
  // console.log(auth_wallet_info.address);
  // console.log(account.address);
  try {
    const res = await contract.methods.registerServiceProvider(auth_wallet_info.address)
      .send({from: account.address, gas:"1000000"});

    contract.events.ServiceProviderRegistered({
      fromBlock: '0'
    }, (error, event) => {
      if (error) {
        console.error("Error listening to event ServiceProviderRegistered: ", error);
      } else {
        console.log("Event received: ", event);
      }
    })
    .on('data', event => {
      console.log("Event data:", event.event, " - ", JSON.stringify(event.returnValues));
    });

  } catch (error) {
    let errFlat = JSON.parse(JSON.stringify(error));
    // console.error('Error:', errFlat);
    if (errFlat.cause && errFlat.cause.message) {
      console.error('Revert reason: ', errFlat.cause.message);
    } else {
      console.error("Revert reason not found in error data");
    }
  }
  
  // console.log(res);
}

const openChallenge = async (account, auth_wallet_info) => {
  challenge = crypto.createHash('sha256').update(String(Date.now())+account.address+auth_wallet_info.address).digest('hex');
  // console.log(challenge);

  try {
    const challengeHash = ethers.keccak256(ethers.solidityPacked(["string"], [challenge]));
    const res = await contract.methods.openChallenge(challengeHash)
      .send({from: account.address, gas:"1000000"});

    const verificationLink = `https://172.22.173.204:3000/connectService?serviceAddress=${account.address}&challenge=${challenge}`;
    console.log("Verification Link below:");
    console.log("\n", verificationLink, "\n");

  } catch (error) {
    console.log(error)
    let errFlat = JSON.parse(JSON.stringify(error));
    // console.error('Error:', errFlat);
    if (errFlat.cause && errFlat.cause.message) {
      console.error('Revert reason: ', errFlat.cause.message);
    } else {
      console.error("Revert reason not found in error data");
    }
  }
}

const verifyOTP = async (user_pk, otp) => {
  try {
    const res = await contract.methods.verifyOTP(user_pk, otp)
      .send({from: account.address, gas:"1000000"});

    contract.events.OTPVerified({
      fromBlock: '0'
    }, (error, event) => {
      if (error) {
        console.error("Error listening to event ServiceProviderRegistered: ", error);
      } else {
        console.log("Event received: ", event);
      }
    })
    .on('data', event => {
      console.log("Event data:", event.event, " - ", JSON.stringify(event.returnValues));
    });

    contract.events.OTPAbuse({
      fromBlock: '0'
    }, (error, event) => {
      if (error) {
        console.error("Error listening to event ServiceProviderRegistered: ", error);
      } else {
        console.log("Event received: ", event);
      }
    })
    .on('data', event => {
      console.log("Event data:", event.event, " - ", JSON.stringify(event.returnValues));
    });


  } catch (error) {
    console.log(error)
    let errFlat = JSON.parse(JSON.stringify(error));
    // console.error('Error:', errFlat);
    if (errFlat.cause && errFlat.cause.message) {
      console.error('Revert reason: ', errFlat.cause.message);
    } else {
      console.error("Revert reason not found in error data");
    }
  }
}



if (args.mode=="register") {
  
  console.log(`Call register for wallet ${args.wallet}`);
  register(account, auth_wallet_info);

  check(account);

} else if (args.mode=="challenge") {
  console.log(`Call challenge for wallet ${args.wallet}`);

  openChallenge(account, auth_wallet_info);

} else if (args.mode=="verify") {
  console.log(`Call verify for wallet ${args.wallet}`);

  const userAddress = "0x1381830C9c1E161D9b952ef115d498e263D46ab3"
  verifyOTP(userAddress, args.otp);

} else {
  console.log(`Unknown mode ${args.mode}`);
}

// const address9WalletInfo = JSON.parse(fs.readFileSync(`test/address_9_wallet.json`, 'utf8'));
// const pk9 = address9WalletInfo.address;

// await instance.registerServiceProvider(pk9, {from: accounts[9]});
// const serviceProvider = await instance.serviceProviders(accounts[9]);
// console.log(serviceProvider);

// https://172.22.173.204:3000/connectService?serviceAddress=0xtest_address&challenge=12321