const Koa = require('koa');
const Router = require('koa-router');
const cors = require('@koa/cors');
const bodyParser = require('koa-bodyparser');

const { Web3 } = require('web3');
const helloworld = require('./contracts/helloworld.json');

const logger = require("./logger");

const app = new Koa();
const router = new Router();

const web3 = new Web3(new Web3.providers.HttpProvider('http://172.22.160.1:7545'));
const { abi, networks } = helloworld;
const contractAddress = networks['5777'].address;
const contract = new web3.eth.Contract(abi, contractAddress);

app.use(cors());
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  logger.info(`${ctx.method} ${ctx.url} - ${ms}ms`);
});
app.use(bodyParser());

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

  logger.info("Received data:", data);

  ctx.body = {
    status: 'success',
    receivedData: data
  };
});

app
  .use(router.routes())
  .use(router.allowedMethods());

const PORT = 5000;
app.listen(PORT, () => {
    logger.info("Start");
    logger.info(`Server running on http://localhost:${PORT}`);
});
