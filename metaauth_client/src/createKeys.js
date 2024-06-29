import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // 假设使用了 React Router
import CryptoJS from 'crypto-js';
import {dataLength, ethers} from 'ethers';
import { Buffer } from 'buffer';
import { Button, TextField, Container, Typography, Snackbar, Alert } from '@mui/material';
import { useWeb3 } from './Web3Context';
import axios from 'axios';
// const { ecsign } = require("ethereumjs-util");

const CreateKeysComponent = () => {
  const { web3, contract } = useWeb3();
  const [password, setPassword] = useState('');
  
  const [open, setOpen] = useState(false);
  const [alertType, setAlertType] = useState('success');
  const [message, setMessage] = useState('');
  
  const navigate = useNavigate();

  // console.log(web3.eth.getAccounts());

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

  async function encryptWithAES256CBC(key, iv, message) {
    // 将 key 和 iv 直接作为 Uint8Array 使用
    const keyBuffer = await crypto.subtle.importKey(
      "raw", 
      key, 
      {name:"AES-CBC"}, 
      false, 
      ["encrypt"]
    );
    const ivBuffer = iv;

    // 将明文转换成 ArrayBuffer
    const encoder = new TextEncoder();
    const data = encoder.encode(message);

    // 使用 AES-256-CBC 加密
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-CBC', iv: ivBuffer },
        keyBuffer,
        data
    );

    // 将加密后的 ArrayBuffer 转换成 Base64 字符串
    const encryptedArray = new Uint8Array(encrypted);
    const encryptedBase64 = btoa(String.fromCharCode(...encryptedArray));

    return encryptedBase64;
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

  // 假设这里是生成钱包的函数，需要根据实际情况替换成真实的生成钱包逻辑
  const generateWallet = async () => {
    try {
      
      const seedString = password;
      // const encryptionKey = CryptoJS.SHA256(seedString).toString();
      const encoder = new TextEncoder();
      const data = encoder.encode(seedString);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const encryptionKey = new Uint8Array(hashBuffer);
      const passwordHash = btoa(String.fromCharCode(...encryptionKey));
      
      const iv = new Uint8Array(16);
      window.crypto.getRandomValues(iv);

      // const iv = window.crypto.getRandomValues(16);

      const wallet = ethers.Wallet.createRandom();

      const encryptedPrivateKey = await encryptWithAES256CBC(encryptionKey, iv, wallet.privateKey);
      // const cipher = crypto.createCipheriv('aes-256-cbc', encryptionKey, iv);
      // let encryptedPrivateKey = cipher.update(wallet.privateKey, 'utf8', 'hex');
      // encryptedPrivateKey += cipher.final('hex');

      
      const walletInfo = {
        passwordHash: passwordHash,
        encryptedPrivateKey: encryptedPrivateKey,
        publicKey: wallet.publicKey,
        address: wallet.address,
        iv: iv.toString('hex')
      };

      console.log(walletInfo)

      // const sig = await generateSig("123", wallet.privateKey);
      // console.log(sig);

      const accounts = await web3.eth.getAccounts();
      console.log(accounts);

      const sig = await generateSig("522", wallet.privateKey);
      
      // const iv_recover = new Uint8Array(walletInfo.iv.split(',').map(num=>parseInt(num, 10)));
      // console.log(iv.toString('hex'));
      // console.log(iv_recover);

      // console.log(await decryptWithAES256CBC(encryptionKey, iv_recover, encryptedPrivateKey));
      // console.log(wallet.privateKey);

      try {
        const userData = {
          metaauthAddress: walletInfo.address,
          userAddress: accounts[0],
          signature: sig
        }

        const res = await axios.post('/api/registerUser', userData, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log(res.data);

        if (res.status === 200) {
          setAlertType('success');
          setMessage('Generate success!');
          localStorage.setItem('walletInfo', JSON.stringify(walletInfo));
          navigate('/home', { state: { ...walletInfo, seedString: seedString }});
        }

        setOpen(true);

      } catch (error) {
        setAlertType('error');
        setMessage("Unknown error: "+error.response.data.message);
        console.error("Error: ", error);

        setOpen(true);
      }

      // localStorage.setItem('walletInfo', JSON.stringify(walletInfo));

      // navigate('/home', { state: { ...walletInfo, seedString: seedString }});
    } catch (error) {
      console.error('生成钱包失败：', error);
    }
  };

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
  };

  return (
    // <div>
    //   <h2>生成身份</h2>
    //   <label>
    //     密碼：
    //     <input
    //       type="password"
    //       value={password}
    //       onChange={(e) => setPassword(e.target.value)}
    //       placeholder="请输入密码"
    //     />
    //   </label>
    //   <br />
    //   <button onClick={generateWallet}>生成身份</button>
    // </div>

    <Container maxWidth="sm">
    <Typography variant="h4" component="h1" gutterBottom>
      生成身份
    </Typography>
    <Snackbar open={open} autoHideDuration={3000} onClose={handleClose}>
      <Alert onClose={handleClose} severity={alertType} sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>

    <TextField 
      label="輸入密碼" 
      variant="outlined" 
      type="password" 
      fullWidth 
      margin="normal" 
      value={password}
      onChange={(e) => setPassword(e.target.value)}
    />
    <Button 
      variant="contained" 
      color="primary" 
      fullWidth 
      onClick={generateWallet}
    >
      生成身份
    </Button>
    </Container>
  );
};

export default CreateKeysComponent;
