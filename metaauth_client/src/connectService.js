// ConnectServiceComponent.js
import React, { useState, useEffect } from 'react';
import { Container, TextField, Button, Typography, Snackbar, Alert } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom'
import { Buffer } from 'buffer';
import { useWeb3 } from './Web3Context';
import axios from 'axios';
import CryptoJS from 'crypto-js';
import {dataLength, ethers} from 'ethers';
import SelectInput from '@mui/material/Select/SelectInput';

function ConnectServiceComponent() {

  const { web3, contract } = useWeb3();
  
  const location = useLocation();
  const [password, setPassword] = useState('');
  const [wallet, setWallet] = useState(null);
  
  const [open, setOpen] = useState(false);
  const [alertType, setAlertType] = useState('success');
  const [message, setMessage] = useState('');

  const queryParams = new URLSearchParams(location.search);
  const serviceAddress = queryParams.get('serviceAddress');
  const challenge = queryParams.get('challenge');

  const navigate = useNavigate();

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

  // const handleInputChange = (event) => {
  //   setInputValue(event.target.value);
  // };

  // const handleConfirmClick = () => {
  //   alert(`Input value: ${inputValue}`);
  // };

  const generateSig = async (message, secretKey) => {
    const secretKeyBuffered = Buffer.from(secretKey.slice(2), 'hex');
    // console.log(secretKey)

    const message_keccak = ethers.keccak256(ethers.solidityPacked(["string"], [String(message)]));    
    const messageBuffer = Buffer.from(message_keccak.slice(2), 'hex');
    // console.log("messageBuffer: ", bufferToHex(messageBuffer));

    const account = new ethers.Wallet(secretKey);
    const signature2 = await account.signMessage(messageBuffer);
    // console.log(signature2);

    return signature2;
  }

  async function decryptWithAES256CBC(key, iv, encryptedBase64) {
    // 将 key 和 iv 直接作为 Uint8Array 使用
    const keyBuffer = await crypto.subtle.importKey(
      "raw", 
      key, 
      {name:"AES-CBC"}, 
      false, 
      ["decrypt"]
    );
    const ivBuffer = iv;
  
    // 将 Base64 字符串转换成 ArrayBuffer
    const encryptedArray = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
    const encryptedBuffer = encryptedArray.buffer;
  
    // 使用 AES-256-CBC 解密
    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-CBC', iv: ivBuffer },
        keyBuffer,
        encryptedBuffer
    );
  
    // 将解密后的 ArrayBuffer 转换成字符串
    const decoder = new TextDecoder();
    const decryptedMessage = decoder.decode(decrypted);
  
    return decryptedMessage;
  }

  const sleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };

  const verifyWallet = async () => {
    try {
      // const storedData = localStorage.getItem('walletInfo');
      // // console.log(storedData);
      // if (storedData === null) {
      //   navigate('/createKeys');
      // }
      // setWallet(JSON.parse(storedData));

      const seedString = password;
      // const encryptionKey = CryptoJS.SHA256(seedString).toString();
      const encoder = new TextEncoder();
      const data = encoder.encode(seedString);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const encryptionKey = new Uint8Array(hashBuffer);
      const passwordHash = btoa(String.fromCharCode(...encryptionKey));

      if (passwordHash === wallet.passwordHash) {
        // console.log({ ...wallet, seedString: seedString });

        try {
          const iv_recover = new Uint8Array(wallet.iv.split(',').map(num=>parseInt(num, 10)));
          
          const private_key = await decryptWithAES256CBC(encryptionKey, iv_recover, wallet.encryptedPrivateKey);
          console.log(private_key)
          const sig = await generateSig(challenge, private_key);

          const userData = {
            metaauthAddress: wallet.address,
            serviceProviderAddress: serviceAddress,
            challenge: challenge,
            signature: sig
          }
  
          const res = await axios.post('/api/connectService', userData, {
            headers: {
              'Content-Type': 'application/json'
            }
          });

          contract.events.ServiceConnected({
            fromBlock: '0'
          }, (error, event) => {
            if (error) {
              console.error("Error listening to event ServiceProviderRegistered: ", error);
            } else {
              console.log("Event received: ", event);
            }
          })
          .on('data', async event => {
            console.log("Event data:", event.event, " - ", JSON.stringify(event.returnValues, (k, v) => typeof v === 'bigint'?v.toString():v));
            const salt = ethers.keccak256(ethers.solidityPacked(["string"], [String("522")+String(Date.now())+wallet.address]));
            const sigOTP = await generateSig(salt, private_key);

            const accounts = await web3.eth.getAccounts();
            console.log(accounts);

            const userDataOTP = {
              metaauthAddress: wallet.address,
              serviceAddress: serviceAddress,
              salt: salt,
              signature: sigOTP
            }
            console.log(userData);

            await sleep(3000);
            
            navigate('/home', { state: { ...wallet, seedString: seedString }});

          });

          
  
          if (res.status === 200) {
            setAlertType('success');
            setMessage('Connect success!');
            // localStorage.setItem('walletInfo', JSON.stringify(walletInfo));
          }
  
          setOpen(true);
  
        } catch (error) {
          console.error("Error: ", error);
          setAlertType('error');
          setMessage("Unknown error: "+error.response.data.message);
  
          setOpen(true);
        }


        // setAlertType('success');
        // setMessage('Verification pass!');        
        // navigate('/home', { state: { ...wallet, seedString: seedString }});

      } else {
        setAlertType('error');
        setMessage('Verification failed!');
      }

      setOpen(true);

    } catch (err) {
      console.log('驗證身份失敗：', err);
    }
  }

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
  }

  return (
    <Container maxWidth="sm" style={{ marginTop: '50px', textAlign: 'center' }}>
      <Typography variant="h4" gutterBottom>
        Connect to Service: {serviceAddress}
      </Typography>
      <Typography variant="body1" gutterBottom>
        Challenge: {challenge}
      </Typography>

      <Snackbar open={open} autoHideDuration={3000} onClose={handleClose}>
        <Alert onClose={handleClose} severity={alertType} sx={{ width: '100%' }}>
          {message}
        </Alert>
      </Snackbar>

      <TextField
        label="Enter key to confirm" 
        variant="outlined" 
        type="password" 
        fullWidth
        value={password}
        margin="normal" 
        onChange={(e) => setPassword(e.target.value)}
        style={{ marginBottom: '20px' }}
      />
      <Button
        variant="contained"
        color="primary"
        onClick={verifyWallet}
      >
        Confirm
      </Button>
    </Container>
  );
}

export default ConnectServiceComponent;
