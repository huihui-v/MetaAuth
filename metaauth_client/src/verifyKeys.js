import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // 假设使用了 React Router
import CryptoJS from 'crypto-js';
import {dataLength, ethers} from 'ethers';
import { Buffer } from 'buffer';
import { Button, TextField, Container, Typography, Snackbar, Alert } from '@mui/material';
// const { ecsign } = require("ethereumjs-util");

const VerifyKeysComponent = () => {
  const [password, setPassword] = useState('');
  const [wallet, setWallet] = useState(null);
  
  const [open, setOpen] = useState(false);
  const [alertType, setAlertType] = useState('success');
  const [message, setMessage] = useState('');
  
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
 
  // 假设这里是生成钱包的函数，需要根据实际情况替换成真实的生成钱包逻辑
  const generateWallet = async () => {
    try {
      

      const seedString = password;
      // const encryptionKey = CryptoJS.SHA256(seedString).toString();
      const encoder = new TextEncoder();
      const data = encoder.encode(seedString);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const encryptionKey = new Uint8Array(hashBuffer);
      
      const iv = new Uint8Array(16);
      window.crypto.getRandomValues(iv);

      // const iv = window.crypto.getRandomValues(16);

      const wallet = ethers.Wallet.createRandom();

      const encryptedPrivateKey = await encryptWithAES256CBC(encryptionKey, iv, wallet.privateKey);
      // const cipher = crypto.createCipheriv('aes-256-cbc', encryptionKey, iv);
      // let encryptedPrivateKey = cipher.update(wallet.privateKey, 'utf8', 'hex');
      // encryptedPrivateKey += cipher.final('hex');

      
      const walletInfo = {
        passwordHash: encryptionKey,
        encryptedPrivateKey: encryptedPrivateKey,
        publicKey: wallet.publicKey,
        address: wallet.address,
        iv: iv.toString('hex')
      };

      console.log(walletInfo)

      const sig = await generateSig("123", wallet.privateKey);
      console.log(sig);


      // localStorage.setItem('walletInfo', walletInfo)

      // navigate('/home');
    } catch (error) {
      console.error('生成钱包失败：', error);
    }
  };

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

        setAlertType('success');
        setMessage('Verification pass!');

        navigate('/home', { state: { ...wallet, seedString: seedString }});

      } else {
        setAlertType('error');
        setMessage('Operation failed!');
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
      Please input device key to verify your identity.
    </Typography>

    <Snackbar open={open} autoHideDuration={3000} onClose={handleClose}>
      <Alert onClose={handleClose} severity={alertType} sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>

    <TextField 
      label="Device key" 
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
      onClick={verifyWallet}
    >
      Verify Identity
    </Button>
    </Container>
  );
};

export default VerifyKeysComponent;
