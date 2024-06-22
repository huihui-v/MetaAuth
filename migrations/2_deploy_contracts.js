// const helloworld = artifacts.require("HelloWorld")

// module.exports = function(deployer) {
//     deployer.deploy(helloworld, "Hello web3 world!");
// };

const metaAuth_OTP = artifacts.require("MetaAuth_OTP");

module.exports = function(deployer) {
    deployer.deploy(metaAuth_OTP);
};