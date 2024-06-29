// import React from 'react';
// import { Box, , Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useWeb3 } from './Web3Context';
// import InputForm from './InputForm';
import { Navigate, useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom'; // 假设使用了 React Router
import { Typography, Box, CircularProgress, Button, Backdrop } from '@mui/material';

import { Buffer } from 'buffer';
import axios from 'axios';
import {dataLength, ethers} from 'ethers';
// import { useData } from './OTPDataContext';

const OTPComponent = ({ otpInfo }) => {
  const { web3, contract } = useWeb3();
  const [accounts, setAccounts] = useState(null);
  const [message,setMessage] = useState('');
  const [message2,setMessage2] = useState('');

  const [wallet, setWallet] = useState(null);

  const [OTPs, setOTPs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); 

  const [otpInfoData, setOTPInfoData] = useState(otpInfo);
  const [timeLeft, setTimeLeft] = useState(300);

  const location = useLocation();

  // const { data, addItem } = useData();

  useEffect(() => {
    const getWallet = async () => {
      setWallet(location.state);
    };
 
    getWallet();
  }, []);

  useEffect(() => {
    console.log(otpInfo);
    setOTPInfoData(otpInfo);
    console.log(Number(Date.now()));
    console.log(Number(otpInfoData.expirationTime));
    let timeleft = Number(otpInfoData.expirationTime)-Math.floor(Number(Date.now())/1000);
    timeleft = timeleft < 0 ? 0 : timeleft;
    timeleft = otpInfo.isUsed ? 0 : timeleft;
    setTimeLeft(timeleft);
  }, [otpInfo])

  useEffect(() => {
    let timer;
    if (timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
    }
    return () => clearInterval(timer); // 清除计时器
  }, [timeLeft]);

  const progress = (timeLeft / 300) * 100;

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

  const generateOTP = async () => {
    // console.log(data);
    setLoading(true);
    console.log(wallet);

    try {
      const seedString = wallet.seedString;
      const encoder = new TextEncoder();
      const data = encoder.encode(seedString);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const encryptionKey = new Uint8Array(hashBuffer);
      const iv_recover = new Uint8Array(wallet.iv.split(',').map(num=>parseInt(num, 10)));
      
      
      const salt = ethers.keccak256(ethers.solidityPacked(["string"], [String("522")+String(Date.now())+wallet.address]));
      const private_key = await decryptWithAES256CBC(encryptionKey, iv_recover, wallet.encryptedPrivateKey);
      const sig = await generateSig(salt, private_key);

      const accounts = await web3.eth.getAccounts();
      console.log(accounts);

      try {
        const userData = {
          metaauthAddress: wallet.address,
          serviceAddress: otpInfoData.serviceAddress,
          salt: salt,
          signature: sig
        }
        console.log(userData);

        const res = await axios.post('/api/generateOTP', userData, {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        contract.events.OTPGenerated({
          fromBlock: '0'
        }, (error, event) => {
          if (error) {
            console.error("Error listening to event ServiceProviderRegistered: ", error);
          } else {
            console.log("Event received: ", event);
          }
        })
        .on('data', async event => {
          console.log("Event data:", event.event, " - ", JSON.stringify(event.returnValues));
          const newOTP = await contract.methods.getOTPInfo(wallet.address, otpInfoData.serviceAddress)
            .call({from:accounts[0]});
          console.log(newOTP);
          const newOTPJson = JSON.parse(JSON.stringify(newOTP, (k, v) => typeof v === 'bigint'?v.toString():v))
          
          console.log(newOTPJson);
          setOTPInfoData({...newOTPJson, serviceAddress: otpInfoData.serviceAddress});

          let timeleft = Number(newOTPJson.expirationTime)-Math.floor(Number(Date.now())/1000);
          timeleft = timeleft < 0 ? 0 : timeleft;
          timeleft = newOTPJson.isUsed ? 0 : timeleft;

          setTimeLeft(timeleft);
        });

        

      } catch (error) {
        console.error("Error: ", error);
      }
    } catch (error) {
      console.error('生成OTP失败：', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      p={2}
      border={1}
      borderColor="grey.300"
      position="relative"
      sx={{ marginBottom: 2 }}
    >
      {/* 左上角显示地址 */}
      <Box position="absolute" top={8} left={8}>
        <Typography variant="body2" component="div">
          {otpInfoData.serviceAddress}
        </Typography>
      </Box>

      {/* 中间突出显示六位数字 */}
      <Box flex={1} display="flex" justifyContent="center" ml={2}>
        <Typography 
          variant="h3" 
          component="div" 
          textAlign="center"
          sx={{ 
            textDecoration: timeLeft <= 0 ? 'line-through' : 'none',
            color: timeLeft <= 0 ? 'grey': 'inherit',
          }}
        >
          {otpInfoData.otp}
        </Typography>
      </Box>

      {/* 倒计时显示 */}
      <Box display="flex" alignItems="center">
        <CircularProgress
          variant="determinate"
          value={progress}
          size={40}
          thickness={4}
          color="primary"
        />
        <Typography
          variant="h6"
          component="div"
          sx={{
            marginLeft: 1,
            color: '#000',
          }}
        >
          {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
        </Typography>
      </Box>

      {/* 右边显示按钮 */}
      <Button variant="contained" color="primary" onClick={generateOTP} disabled={loading||timeLeft>0}>
        更新OTP
      </Button>

      {loading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            zIndex: 1,
          }}
        >
          <CircularProgress color="primary" />
        </Box>
      )}
    </Box>
  );
};

export default OTPComponent;
