const metaAuth_OTP = artifacts.require("MetaAuth_OTP");
const fs = require('fs');
const crypto = require('crypto');
const { ethers } = require('ethers');

// const EC = require("elliptic").ec;
// const ec = new EC("secp256k1");


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
        const pk1 = address1WalletInfo.publicKey;
        
        await instance.registerUser(pk1, accounts[1], {from: accounts[0]});
        const user = await instance.users_pk_view(pk1);
        console.log(user);

        
        const address9WalletInfo = JSON.parse(fs.readFileSync(`test/address_9_wallet.json`, 'utf8'));
        const pk9 = address9WalletInfo.publicKey;
        
        await instance.registerServiceProvider(pk9, {from: accounts[9]});
        const serviceProvider = await instance.serviceProviders(accounts[9]);
        console.log(serviceProvider);
        

        // await instance.registerUser("test user public key", { from: accounts[1] });
        // await instance.registerServiceProvider("test service provider public key", { from: accounts[9]} );

        // const user = await instance.users(accounts[1]);
        // const service = await instance.serviceProviders(accounts[9]);

        // console.log(user);
        // console.log(service);

        // // user not registered
        // console.log("#User not registered case:")
        // // await instance.requestServiceConnection(accounts[2], { from: accounts[9] });
        // // succ
        // console.log("#Success case:")
        // await instance.requestServiceConnection(accounts[1], { from: accounts[9] });

        // serviceInfo = await instance.getServiceInfo(accounts[9], { from: accounts[1] });
        // console.log(serviceInfo);

        // // already hanging
        // console.log("#Already hanging case:")
        // // await instance.requestServiceConnection(accounts[1], { from: accounts[9] });

        // // service not registered
        // console.log("#Service not registered case:")
        // // await instance.respondServiceConnection(accounts[0], true, false, { from: accounts[1] });
        // // agree
        // console.log("#Success case:")
        // await instance.respondServiceConnection(accounts[9], true, false, { from: accounts[1] });

        // serviceInfo = await instance.getServiceInfo(accounts[9], { from: accounts[1] });
        // console.log(serviceInfo);

        // // no hanging request
        // console.log("#No hanging request case:")
        // // await instance.respondServiceConnection(accounts[9], true, false, { from: accounts[1] });

        // // already valid auth
        // console.log("#Already valid auth case:")
        // // await instance.requestServiceConnection(accounts[1], { from: accounts[9] });


        // // await instance.authorizeServiceProvider(accounts[9], { from: accounts[1]});

        // // const auth = await instance.getAuthorizedServiceProvider(accounts[1], accounts[9]);
        // // console.log("auth: ", auth);

        // serviceInfo = await instance.getServiceInfo(accounts[9], { from: accounts[1] });
        // console.log(serviceInfo);


        // console.log("Gen otp 1")
        // salt1 =  Math.floor(Math.random()*522)
        // console.log("Salt 1 ", salt1)
        // await instance.generateOTP(accounts[9], salt1, { from: accounts[1] });
        // const otpInfo = await instance.getOTPInfo(accounts[9], {from:accounts[1]});
        // console.log(otpInfo);
        // console.log(await instance.getOTPInfo(accounts[9], {from:accounts[1]}));

        // console.log("#Succ use otp")
        // await instance.verifyOTP(accounts[1], otpInfo.otp, {from: accounts[9]});
        // console.log(await instance.getOTPInfo(accounts[9], {from:accounts[1]}));

        // console.log("#UNAUTHORIZED_TRY")
        // await instance.verifyOTP(accounts[1], otpInfo.otp, {from:accounts[9]});
        // console.log(await instance.getOTPInfo(accounts[9], {from:accounts[1]}));

        // console.log("Gen otp 2")
        // salt2 =  Math.floor(Math.random()*522)
        // console.log("Salt 2 ", salt2)
        // await instance.generateOTP(accounts[9], salt2, { from: accounts[1] });
        // const otpInfo2 = await instance.getOTPInfo(accounts[9], {from:accounts[1]});
        // console.log(otpInfo2);
        // console.log("#WRONG ANSWER")
        // await instance.verifyOTP(accounts[1], otpInfo.otp, {from:accounts[9]});
        // console.log(await instance.getOTPInfo(accounts[9], {from:accounts[1]}));
    
        // let events = await instance.getPastEvents(
        //     "OTPVerified",
        //     {fromBlock:0, toBlock:'latest'}
        // );
        // console.log(events);

    });

    it("connectService", async () => {
        const instance = await metaAuth_OTP.deployed();

        const address1WalletInfo = JSON.parse(fs.readFileSync(`test/address_1_wallet.json`, 'utf8'));
        const pk1 = address1WalletInfo.publicKey;
        
        let user = await instance.users_pk_view(pk1);
        console.log(user);

        
        // const address9WalletInfo = JSON.parse(fs.readFileSync(`address_9_wallet.json`, 'utf8'));
        // const pk9 = address9WalletInfo.publicKey;
        
        let serviceProvider = await instance.serviceProviders(accounts[9]);
        console.log(serviceProvider);

        const challenge = "12345678";
        const packedChallenge = ethers.solidityPacked(["string"], [challenge]);
        // console.log(packedChallenge);
        const challenge_hash = ethers.keccak256(packedChallenge);
        // console.log(challenge_hash);

        await instance.openChallenge(challenge_hash, {from: accounts[9]});
        serviceProvider = await instance.serviceProviders(accounts[9]);
        console.log(serviceProvider);
        
        await instance.connectService(pk1, accounts[9], challenge, "no signature now", {from: accounts[0]});
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
        const pk1 = address1WalletInfo.publicKey;
        
        // let user = await instance.users_pk_view(pk1);
        // console.log(user);

        let salt = Math.floor(Math.random()*522);
        await instance.generateOTP(pk1, accounts[9], salt, "no signature now", {from: accounts[0]});
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
        const pk1 = address1WalletInfo.publicKey;

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