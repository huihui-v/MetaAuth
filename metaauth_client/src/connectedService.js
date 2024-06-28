import React, { useState, useEffect } from 'react';
import { useWeb3 } from './Web3Context';

// // 生成随机验证码的函数
// const generateOtp = () => {
//   return Math.floor(100000 + Math.random() * 900000).toString();
// };

const ConnectedService = () => {
  const [otp, setOtp] = useState('');
  const [expirationTime, setExpirationTime] = useState('');
  const { web3, contract } = useWeb3();

  // 生成新的验证码并设置有效期
  const refreshOtp = () => {
    const newOtp = generateOtp();
    const expiration = new Date();
    expiration.setMinutes(expiration.getMinutes() + 5); // 设置有效期为5分钟

    setOtp(newOtp);
    setExpirationTime(expiration.toLocaleTimeString());
  };

  // 初始化时生成验证码
  useEffect(() => {
    refreshOtp();
  }, []);

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: 'auto', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>Connected Service</h2>
      <div style={{ marginBottom: '15px' }}>
        <label htmlFor="otp">验证码 (OTP):</label>
        <input
          type="text"
          id="otp"
          value={otp}
          readOnly
          style={{ display: 'block', width: '100%', padding: '8px', marginTop: '5px' }}
        />
      </div>
      <div style={{ marginBottom: '15px' }}>
        <label htmlFor="expirationTime">有效期:</label>
        <input
          type="text"
          id="expirationTime"
          value={expirationTime}
          readOnly
          style={{ display: 'block', width: '100%', padding: '8px', marginTop: '5px' }}
        />
      </div>
      <button onClick={refreshOtp} style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
        刷新验证码
      </button>
    </div>
  );
};

export default ConnectedService;
