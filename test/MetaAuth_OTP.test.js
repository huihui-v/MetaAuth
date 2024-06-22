const metaAuth_OTP = artifacts.require("MetaAuth_OTP");
// const EC = require("elliptic").ec;
// const ec = new EC("secp256k1");


contract("MetaAuth_OTP", (accounts) => {
    it("register and auth", async () => {
        const instance = await metaAuth_OTP.deployed();

        await instance.registerUser("test user public key", { from: accounts[1] });
        await instance.registerServiceProvider("test service provider public key", { from: accounts[9]} );

        const user = await instance.users(accounts[1]);
        const service = await instance.serviceProviders(accounts[9]);

        console.log(user);
        console.log(service);

        // user not registered
        console.log("#User not registered case:")
        // await instance.requestServiceConnection(accounts[2], { from: accounts[9] });
        // succ
        console.log("#Success case:")
        await instance.requestServiceConnection(accounts[1], { from: accounts[9] });

        serviceInfo = await instance.getServiceInfo(accounts[9], { from: accounts[1] });
        console.log(serviceInfo);

        // already hanging
        console.log("#Already hanging case:")
        // await instance.requestServiceConnection(accounts[1], { from: accounts[9] });

        // service not registered
        console.log("#Service not registered case:")
        // await instance.respondServiceConnection(accounts[0], true, false, { from: accounts[1] });
        // agree
        console.log("#Success case:")
        await instance.respondServiceConnection(accounts[9], true, false, { from: accounts[1] });

        serviceInfo = await instance.getServiceInfo(accounts[9], { from: accounts[1] });
        console.log(serviceInfo);

        // no hanging request
        console.log("#No hanging request case:")
        // await instance.respondServiceConnection(accounts[9], true, false, { from: accounts[1] });

        // already valid auth
        console.log("#Already valid auth case:")
        // await instance.requestServiceConnection(accounts[1], { from: accounts[9] });


        // await instance.authorizeServiceProvider(accounts[9], { from: accounts[1]});

        // const auth = await instance.getAuthorizedServiceProvider(accounts[1], accounts[9]);
        // console.log("auth: ", auth);

        serviceInfo = await instance.getServiceInfo(accounts[9], { from: accounts[1] });
        console.log(serviceInfo);

        
        // await instance.registerServiceProvider("test service provider public key 8", { from: accounts[8]} );
        // await instance.registerServiceProvider("test service provider public key 7", { from: accounts[7]} );

        
        // await instance.requestServiceConnection(accounts[1], { from: accounts[8] });
        // await instance.respondServiceConnection(accounts[8], false, false, { from: accounts[1] });
        // await instance.requestServiceConnection(accounts[1], { from: accounts[8] });

        
        // await instance.requestServiceConnection(accounts[1], { from: accounts[7] });
        // await instance.respondServiceConnection(accounts[7], false, true, { from: accounts[1] });
        // await instance.requestServiceConnection(accounts[1], { from: accounts[7] });



        console.log("Gen otp 1")
        salt1 =  Math.floor(Math.random()*522)
        console.log("Salt 1 ", salt1)
        await instance.generateOTP(accounts[9], salt1, { from: accounts[1] });
        const otpInfo = await instance.getOTPInfo(accounts[9], {from:accounts[1]});
        console.log(otpInfo);
        console.log(await instance.getOTPInfo(accounts[9], {from:accounts[1]}));

        console.log("#Succ use otp")
        await instance.verifyOTP(accounts[1], otpInfo.otp, {from: accounts[9]});
        console.log(await instance.getOTPInfo(accounts[9], {from:accounts[1]}));

        console.log("#UNAUTHORIZED_TRY")
        await instance.verifyOTP(accounts[1], otpInfo.otp, {from:accounts[9]});
        console.log(await instance.getOTPInfo(accounts[9], {from:accounts[1]}));

        console.log("Gen otp 2")
        salt2 =  Math.floor(Math.random()*522)
        console.log("Salt 2 ", salt2)
        await instance.generateOTP(accounts[9], salt2, { from: accounts[1] });
        const otpInfo2 = await instance.getOTPInfo(accounts[9], {from:accounts[1]});
        console.log(otpInfo2);
        console.log("#WRONG ANSWER")
        await instance.verifyOTP(accounts[1], otpInfo.otp, {from:accounts[9]});
        console.log(await instance.getOTPInfo(accounts[9], {from:accounts[1]}));
    
        let events = await instance.getPastEvents(
            "OTPVerified",
            {fromBlock:0, toBlock:'latest'}
        );
        console.log(events);

    });
});