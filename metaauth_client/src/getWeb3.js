// getWeb3.js
import Web3 from 'web3';
import detectEthereumProvider from '@metamask/detect-provider';

import helloworld from './contracts/helloworld.json';

const getWeb3 = () =>
  new Promise(async (resolve, reject) => {
    const provider = await detectEthereumProvider();

    if (provider) {
      const web3 = new Web3(provider);
      try {
        await provider.request({ method: 'eth_requestAccounts' });
        const accounts = await web3.eth.getAccounts();
        const networkId = await web3.eth.net.getId();

        // console.log(networkId);

        // 监听账户变化
        provider.on('accountsChanged', (accounts) => {
          console.log('Accounts changed:', accounts);
          if (accounts.length === 0) {
            console.log('Please connect to MetaMask.');
          } else {
            // 更新当前账户
            console.log('Current account:', accounts[0]);
          }
        });

        // 监听网络变化
        provider.on('chainChanged', (chainId) => {
          console.log('Network changed:', chainId);
          window.location.reload();
        });

        resolve({ web3, accounts, networkId });
      } catch (error) {
        reject(error);
      }
    } else {
      reject(new Error('Please install MetaMask!'));
    }
  });

// export default getWeb3;

const getContractInstance = async(web3) => {
  const networkId = await web3.eth.net.getId();
  const deployedNetwork = helloworld.networks[networkId];
  const instance = new web3.eth.Contract(
    helloworld.abi,
    deployedNetwork && deployedNetwork.address,
  );

  return instance;
}

export { getWeb3, getContractInstance };