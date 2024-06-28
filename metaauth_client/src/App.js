import React, { useEffect, useState } from 'react';
import { getWeb3, getContractInstance } from './getWeb3';
// import helloworld from './contracts/helloworld.json';
import { Web3Provider, useWeb3 } from './Web3Context';
import { BrowserRouter as Router, Route, Routes, Switch, Navigate } from 'react-router-dom';
// import {  } from './Web3Context'; 
import Home from './home';
import CreateKeysComponent from './createKeys';
import VerifyKeysComponent from './verifyKeys';

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
      <Router>
        <Routes>
          <Route path='/verifyKeys' element={<VerifyKeysComponent />} />
          <Route path='/createKeys' element={<CreateKeysComponent />} />
          <Route path="/home" element={<Home />} />
          <Route path="*" element={<Navigate to="/verifyKeys" />} />
        {/* <Home /> */}
        </Routes>
      </Router>
    </Web3Provider>
  );
}

export default App;
