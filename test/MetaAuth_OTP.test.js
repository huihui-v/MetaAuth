const metaAuth_OTP = artifacts.require("MetaAuth_OTP");
const fs = require('fs');
const crypto = require('crypto');
const { ethers } = require('ethers');
const { hashPersonalMessage, keccak256, ecsign, bufferToHex, ecrecover, pubToAddress, fromRpcSig } = require('ethereumjs-util');

// const EC = require("elliptic").ec;
// const ec = new EC("secp256k1");

const generateSig = (message, secretKey) => {
    const secretKeyBuffered = Buffer.from(secretKey.slice(2), 'hex');
    // console.log(secretKey)

    const message_keccak = ethers.keccak256(ethers.solidityPacked(["string"], [String(message)]));    
    const messageBuffer = Buffer.from(message_keccak.slice(2), 'hex');
    console.log("messageBuffer: ", bufferToHex(messageBuffer));


    const { v, r, s } = ecsign(messageBuffer, secretKeyBuffered);
    const signature = bufferToHex(Buffer.concat([r, s, Buffer.from([v])]));

    return signature;
}

// const verifySig = (message, sig) => {
//     const messageHash = hashPersonalMessage(Buffer.from(ethers.keccak256(ethers.solidityPacked(["string"], [String(message)]))));

//     parsedSig = fromRpcSig(sig);

//     const publicKey = ecrecover(messageHash, parsedSig.v, parsedSig.r, parsedSig.s);
//     const address = "0x"+pubToAddress(publicKey).toString('hex');
//     return address
// }


contract("MetaAuth_OTP", (accounts) => {
    it("register", async () => {
        const instance = await metaAuth_OTP.deployed();

        // // 解密私钥的示例
        // const encryptedWalletInfo = JSON.parse(fs.readFileSync(`${seedString}.json`, 'utf8'));
        // const decipher = crypto.createDecipheriv('aes-256-cbc', encryptionKey, Buffer.from(encryptedWalletInfo.iv, 'hex'));
        // let decryptedPrivateKey = decipher.update(encryptedWalletInfo.encryptedPrivateKey, 'hex', 'utf8');
        // decryptedPrivateKey += decipher.final('utf8');

        // // 从解密后的私钥创建钱包实例
        // const decryptedWallet = new ethers.Wallet(decryptedPrivateKey);

        // console.log('Decrypted Wallet Address:', decryptedWallet.address);

        const address1WalletInfo = JSON.parse(fs.readFileSync(`test/address_1_wallet.json`, 'utf8'));
        const pk1 = address1WalletInfo.address;
        
        await instance.registerUser(pk1, accounts[1], {from: accounts[0]});
        const user = await instance.users_pk_view(pk1);
        console.log(user);

        
        const address9WalletInfo = JSON.parse(fs.readFileSync(`test/address_9_wallet.json`, 'utf8'));
        const pk9 = address9WalletInfo.address;
        
        await instance.registerServiceProvider(pk9, {from: accounts[9]});
        const serviceProvider = await instance.serviceProviders(accounts[9]);
        console.log(serviceProvider);
    });

    it("connectService", async () => {
        const instance = await metaAuth_OTP.deployed();

        const address1WalletInfo = JSON.parse(fs.readFileSync(`test/address_1_wallet.json`, 'utf8'));
        const pk1 = address1WalletInfo.address;
        
        let user = await instance.users_pk_view(pk1);
        // console.log(user);

        
        // const address9WalletInfo = JSON.parse(fs.readFileSync(`address_9_wallet.json`, 'utf8'));
        // const pk9 = address9WalletInfo.address;
        
        let serviceProvider = await instance.serviceProviders(accounts[9]);
        // console.log(serviceProvider);

        const challenge = "12345678";
        const packedChallenge = ethers.solidityPacked(["string"], [challenge]);
        const challenge_hash = ethers.keccak256(packedChallenge);

        await instance.openChallenge(challenge_hash, {from: accounts[9]});
        serviceProvider = await instance.serviceProviders(accounts[9]);
        // console.log(serviceProvider);
        
        const encryptionKey = crypto.createHash('sha256').update('address_1_wallet').digest();
        const decipher = crypto.createDecipheriv('aes-256-cbc', encryptionKey, Buffer.from(address1WalletInfo.iv, 'hex'));
        let sk1 = decipher.update(address1WalletInfo.encryptedPrivateKey, 'hex', 'utf8');
        sk1 += decipher.final('utf8');
        const signature = generateSig(challenge, sk1);
        // console.log("sig: ", signature);

        // console.log(verifySig(challenge, signature));
        await instance.connectService(pk1, accounts[9], challenge, signature, {from: accounts[0]});
        let events = await instance.getPastEvents(
            "ServiceConnected",
            {fromBlock:0, toBlock:'latest'}
        );
        console.log(events);

        user = await instance.users_pk_view(pk1);
        console.log(user);

        let serviceInfo = await instance.getServiceInfo(pk1, accounts[9], {from: accounts[1]});
        console.log(serviceInfo)

    });

    it("generateOTP", async () => {
        const instance = await metaAuth_OTP.deployed();

        const address1WalletInfo = JSON.parse(fs.readFileSync(`test/address_1_wallet.json`, 'utf8'));
        const pk1 = address1WalletInfo.address;
        
        // let user = await instance.users_pk_view(pk1);
        // console.log(user);

        let salt = String(Math.floor(Math.random()*522));
        const encryptionKey = crypto.createHash('sha256').update('address_1_wallet').digest();
        const decipher = crypto.createDecipheriv('aes-256-cbc', encryptionKey, Buffer.from(address1WalletInfo.iv, 'hex'));
        let sk1 = decipher.update(address1WalletInfo.encryptedPrivateKey, 'hex', 'utf8');
        sk1 += decipher.final('utf8');
        const signature = generateSig(salt, sk1);
        console.log(signature);

        await instance.generateOTP(pk1, accounts[9], salt, signature, {from: accounts[0]});

        let events = await instance.getPastEvents(
            "OTPGenerated",
            {fromBlock:0, toBlock:'latest'}
        );
        console.log(events);

        let otpInfo = await instance.getOTPInfo(pk1, accounts[9], {from: accounts[1]});
        console.log(otpInfo);

    });

    it("verifyOTP", async () => {
        const instance = await metaAuth_OTP.deployed();

        const address1WalletInfo = JSON.parse(fs.readFileSync(`test/address_1_wallet.json`, 'utf8'));
        const pk1 = address1WalletInfo.address;

        let otpInfo = await instance.getOTPInfo(pk1, accounts[9], {from: accounts[1]});
        console.log(otpInfo);

        await instance.verifyOTP(pk1, otpInfo.otp, {from: accounts[9]});
        let events = await instance.getPastEvents(
            "OTPVerified",
            {fromBlock:0, toBlock:'latest'}
        );
        console.log(events);

        otpInfo = await instance.getOTPInfo(pk1, accounts[9], {from: accounts[1]});
        console.log(otpInfo);
    })
});