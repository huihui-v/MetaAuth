import React, { useEffect, useState } from 'react';
import { getWeb3, getContractInstance } from './getWeb3';
// import helloworld from './contracts/helloworld.json';
import { Web3Provider, useWeb3 } from './Web3Context';
// import {  } from './Web3Context'; 
import Home from './home';

const App = () => {
  // const [web3, setWeb3] = useState(null);
  // // const [accounts, setAccounts] = useState(null);
  // const [contract, setContract] = useState(null);
  // const [message, setMessage] = useState('');
  // const [message2, setMessage2] = useState('');

  // const { web3, contract } = useWeb3();

  // console.log(web3);

  // if (!web3||!contract) {
  //   return <div>Loading Web3, accounts, and contract...</div>;
  // }

  return (
    <Web3Provider>
      <Home />
    </Web3Provider>
  );
}

export default App;
