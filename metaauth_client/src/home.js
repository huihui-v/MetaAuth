import React, { useEffect, useState } from 'react';
import { useWeb3 } from './Web3Context';
import InputForm from './InputForm';
import { Navigate, useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom'; // 假设使用了 React Router
import OTPComponent from './OTPComponent';
import { Typography, Box } from '@mui/material';
// import { useState } from 'react';

const Home = () => {
  const { web3, contract } = useWeb3();
//   const message2 = "Hello";
//   const message = "Test";
  const [accounts, setAccounts] = useState(null);
  const [message,setMessage] = useState('');
  const [message2,setMessage2] = useState('');

  const navigate = useNavigate();
  const location = useLocation();

  // console.log("In home: ", location.state);
  const { walletInfo } = location.state;

  useEffect(() => {
    const init = async () => {
      // walletInfo = location.state;
      if (walletInfo === null) {
        navigate('/verifyKeys');
      }
    }
    
    init();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      navigate('/verifyKeys', { state: {} });
    }, 300000);
  }, []);

  useEffect(() => {
    const onWeb3Change = async () => {
      if (web3 && contract) {
        try {
          const accounts = await web3.eth.getAccounts();
          // console.log('Accounts:', accounts);
          setAccounts(accounts);

          // 使用合约实例调用函数
          // const response = await contract.methods.message().call();
          // console.log('Contract response:', response);

          setMessage("<message place init>");
          setMessage2("<message2 place init>");

        } catch (error) {
          console.error('Error calling contract function:', error);
        }
      }
    };

    onWeb3Change();
  }, [web3, contract]);
  
  const getMessage = async () => {
    // const accounts = await web3.eth.getAccounts();

    const msg = await contract.methods.message().call();
    setMessage(msg);
  }

  // const getMessageFromBackend = async () => {
  //   console.log("Post getMessageFromBackend");
  //   fetch('http://localhost:5000/api/hello')
  //     .then(res => res.json())
  //     .then(data => setMessage2(data.message))
  //     .catch(err => console.error("Error fetch data: ", err));
  // }

  // const updateMessage = async () => {
  //   // const accounts = await web3.eth.getAccounts();
  //   console.log(accounts)
  //   await contract.methods.updateMessage("New Message").send({ from: accounts[0] });
  //   const response = await contract.methods.message().call();
  //   setMessage(response);
  // };

  return (
    <div>
        {/* <div>
          <h1>My DApp</h1>
          <p>The stored message is: {message}</p>
          <button onClick={updateMessage}>Update Message</button>
          <button onClick={getMessage}>Get current Message</button>
        </div>
        <div>
            <p>The stored message from backend: {message2}</p>
            <button onClick={getMessageFromBackend}>Get msg from backend</button>
        </div>
        <InputForm /> */}
      <Typography variant="h4" component="h2" gutterBottom>
        Connected services
      </Typography>
      <Box border={1} borderColor="grey.300" p={2}>
        <OTPComponent address="test address 1" otpCode="123456" />
        <OTPComponent address="test address 2" otpCode="123456" />
        <OTPComponent address="test address 3" otpCode="123456" />
      </Box>
    </div>
  );
};

export default Home;
