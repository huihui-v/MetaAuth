import React, { useEffect, useState } from 'react';
import { useWeb3 } from './Web3Context';
import InputForm from './InputForm';
import { Navigate, useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom'; // 假设使用了 React Router
import OTPComponent from './OTPComponent';
import { Typography, Box, CircularProgress } from '@mui/material';
// import { DataProvider, useData } from './OTPDataContext';
// import { useState } from 'react';

const Home = () => {
  const { web3, contract } = useWeb3();
//   const message2 = "Hello";
//   const message = "Test";
  const [accounts, setAccounts] = useState(null);
  const [message,setMessage] = useState('');
  const [message2,setMessage2] = useState('');

  const [wallet, setWallet] = useState(null);

  const [OTPs, setOTPs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); 
  const sampleOTPInfo = {
    serviceAddress: 'test sample address',
    otp: '123456',
    isUsed: false,
    expirationTime: 0
  };

  // const { data, addItem } = useData();

  const navigate = useNavigate();
  const location = useLocation();

  // console.log("In home: ", location.state);
  // const { walletInfo } = location.state;

  useEffect(() => {
    const getWallet = async () => {
      const storedData = localStorage.getItem('walletInfo');
      // console.log(storedData);
      if (storedData === null) {
        navigate('/createKeys');
      } else {
        // console.log(JSON.parse(storedData));
        setWallet(JSON.parse(storedData));
      }
    };
 
    getWallet();
  }, []);

  // useEffect(() => {
  //   const init = async () => {
  //     // walletInfo = location.state;
  //     if (walletInfo === null) {
  //       navigate('/verifyKeys');
  //     }
  //   }
    
  //   init();
  // }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      navigate('/verifyKeys', { state: {} });
    }, 600000);
  }, []);

  useEffect(() => {
    const onWeb3Change = async () => {

      setLoading(true);
      setError(null);

      if (web3 && contract && wallet) {
        try {
          const accounts = await web3.eth.getAccounts();
          console.log('Accounts:', accounts);
          setAccounts(accounts);

          const user_info = await contract.methods.users_pk_view(wallet.address)
            .call({from:accounts[0]});

          const connectedServices = await contract.methods.getConnectedServices(wallet.address)
            .call({from:accounts[0]});

          console.log(user_info);
          const results = [];
          for (const serviceAddress of connectedServices) {
            const otpInfo = await contract.methods
              .getOTPInfo(wallet.address, serviceAddress)
              .call({from:accounts[0]});
            // console.log(otpInfo);
            results.push({...JSON.parse(JSON.stringify(otpInfo, (k, v) => typeof v === 'bigint'?v.toString():v)), serviceAddress: serviceAddress, key: serviceAddress});
          }
          console.log(results);
          setOTPs(results);

        } catch (error) {
          console.error('Error calling contract function:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    onWeb3Change();
  }, [web3, contract, wallet]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  // useEffect(() => {
  //   const init_services = async () => {
  //     const accounts = await web3.eth.getAccounts();
  //     console.log(accounts);

  //     const user_info = await contract.methods.users_pk_view(wallet.address)
  //       .call({from:accounts[0]});
  //   };

  //   init_services();
  // }, []);

  
  // const getMessage = async () => {
  //   // const accounts = await web3.eth.getAccounts();

  //   const msg = await contract.methods.message().call();
  //   setMessage(msg);
  // }

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
      <Typography variant="body2" component="div">
          {wallet.address}
      </Typography>
      <Box border={1} borderColor="grey.300" p={2}>
        <ul>
          <OTPComponent otpInfo={sampleOTPInfo} />
          {OTPs.map(otp => (
              <OTPComponent otpInfo={otp} />
          ))}
        </ul>
        {/* <OTPComponent address="test address 2" otpCode="123456" />
        <OTPComponent address="test address 3" otpCode="123456" /> */}
      </Box>
    </div>
  );
};

export default Home;
