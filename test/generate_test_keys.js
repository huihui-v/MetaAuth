const fs = require('fs');
const crypto = require('crypto');
const { ethers } = require('ethers');

// 加密密钥和初始化向量
seedString = "address_9_wallet"

// const encryptionKey = crypto.randomBytes(32);
const encryptionKey = crypto.createHash('sha256').update(seedString).digest();
const iv = crypto.randomBytes(16);

// 生成随机钱包
const wallet = ethers.Wallet.createRandom();

// 加密私钥
const cipher = crypto.createCipheriv('aes-256-cbc', encryptionKey, iv);
let encryptedPrivateKey = cipher.update(wallet.privateKey, 'utf8', 'hex');
encryptedPrivateKey += cipher.final('hex');

// 保存加密后的私钥和其他钱包信息
const walletInfo = {
    encryptedPrivateKey: encryptedPrivateKey,
    publicKey: wallet.publicKey,
    address: wallet.address,
    iv: iv.toString('hex')
};

fs.writeFileSync(`${seedString}.json`, JSON.stringify(walletInfo, null, 2));

console.log(`Encrypted wallet information saved to ${seedString}.json`);

// 解密私钥的示例
const encryptedWalletInfo = JSON.parse(fs.readFileSync(`${seedString}.json`, 'utf8'));
const decipher = crypto.createDecipheriv('aes-256-cbc', encryptionKey, Buffer.from(encryptedWalletInfo.iv, 'hex'));
let decryptedPrivateKey = decipher.update(encryptedWalletInfo.encryptedPrivateKey, 'hex', 'utf8');
decryptedPrivateKey += decipher.final('utf8');

// 从解密后的私钥创建钱包实例
const decryptedWallet = new ethers.Wallet(decryptedPrivateKey);

console.log('Decrypted Wallet Address:', decryptedWallet.address);
