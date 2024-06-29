const Koa = require('koa');
const Router = require('koa-router');
const cors = require('@koa/cors');
const bodyParser = require('koa-bodyparser');
// const koaBody = require('koa-body');
const https = require('https');
const fs = require('fs');
const path = require('path');

const { Web3 } = require('web3');
const helloworld = require('./contracts/helloworld.json');
const metaauth_otp = require('./contracts/MetaAuth_OTP.json');

const logger = require("./logger");

const app = new Koa();
const router = new Router();

const web3 = new Web3(new Web3.providers.HttpProvider('http://172.22.160.1:7545'));
const { abi, networks } = metaauth_otp;
const contractAddress = networks['5777'].address;
const contract = new web3.eth.Contract(abi, contractAddress);

const contractOwnerSK = "0xbb61e2a7563a1dc7da78921c10cdc08eac811778014560f51e4b8ad6c015e9ad";
const account = web3.eth.accounts.privateKeyToAccount(contractOwnerSK);

app.use(cors());
app.use(bodyParser());
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  logger.info(`${ctx.method} ${ctx.url} - ${ms}ms`);
});

router.get('/api/hello', async (ctx) => {
    logger.info("/api/hello called!");

    // logger.info(web3);
    const msg = await contract.methods.message().call();

    ctx.body = {
      message: `Hello, the following message currently on helloworld contract is : ${msg}`
    };
});

router.post('/api/registerUser', async (ctx) => {
  const data = ctx.request.body;

  console.log(data);

  try {
    const res = await contract.methods.registerUser(data.metaauthAddress, data.userAddress, data.signature)
      .send({from: account.address, gas: "1000000"});

    ctx.body = {
      status: 'success',
      message: 'success call registerUser'
    };
    
  } catch (error) {
    console.log(error);
    let errFlat = JSON.parse(JSON.stringify(error));
    // console.error('Error:', errFlat);
    if (errFlat.cause && errFlat.cause.message) {
      console.error('Revert reason: ', errFlat.cause.message);
    } else {
      console.error("Revert reason not found in error data");
    }

    ctx.status = 500;
    ctx.body = {
      status: 'error',
      message: errFlat.cause.message || "No revert message from blockchain",
      error: error
    }
  }
});

router.post('/api/connectService', async (ctx) => {
  const data = ctx.request.body;

  console.log(data);

  try {
    const res = await contract.methods
      .connectService(data.metaauthAddress, data.serviceProviderAddress, data.challenge, data.signature)
      .send({from: account.address, gas: "1000000"});

    ctx.body = {
      status: 'success',
      message: 'success call connectService'
    };
    
  } catch (error) {
    console.log(error);
    let errFlat = JSON.parse(JSON.stringify(error));
    // console.error('Error:', errFlat);
    if (errFlat.cause && errFlat.cause.message) {
      console.error('Revert reason: ', errFlat.cause.message);
    } else {
      console.error("Revert reason not found in error data");
    }

    ctx.status = 500;
    ctx.body = {
      status: 'error',
      message: errFlat.cause.message || "No revert message from blockchain",
      error: error
    }
  }
});

router.post('/api/generateOTP', async (ctx) => {
  const data = ctx.request.body;

  console.log(data);

  try {
    const res = await contract.methods
      .generateOTP(data.metaauthAddress, data.serviceAddress, data.salt, data.signature)
      .send({from: account.address, gas: "1000000"});

    ctx.body = {
      status: 'success',
      message: 'success call connectService'
    };
    
  } catch (error) {
    console.log(error);
    let errFlat = JSON.parse(JSON.stringify(error));
    // console.error('Error:', errFlat);
    if (errFlat.cause && errFlat.cause.message) {
      console.error('Revert reason: ', errFlat.cause.message);
    } else {
      console.error("Revert reason not found in error data");
    }

    ctx.status = 500;
    ctx.body = {
      status: 'error',
      message: errFlat.cause.message || "No revert message from blockchain",
      error: error
    }
  }
});


app
  .use(router.routes())
  .use(router.allowedMethods());

const sslOptions = {
  key: fs.readFileSync(path.resolve(__dirname, "certs/server.key")),
  cert: fs.readFileSync(path.resolve(__dirname, "certs/server.cert")),
};

const PORT = 5000;

const httpsServer = https.createServer(sslOptions, app.callback());
httpsServer.listen(PORT, () => {
  logger.info("Start SSL server.");
  logger.info(`Server running on https://172.22.173.204:${PORT}`);
})

// app.listen(PORT, () => {
//     logger.info("Start");
//     logger.info(`Server running on http://172.22.173.204:${PORT}`);
// });
