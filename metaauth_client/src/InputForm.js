import React, { useState } from 'react';
import { useWeb3 } from './Web3Context';

const InputForm = () => {
    const [inputValue, setInputValue] = useState('');
    const [message, setMessage] = useState('');
    const { web3, contract } = useWeb3();

    const handleInputChange = (e) => {
        setInputValue(e.target.value);
    };

    const handleSubmit = async(e) => {
        e.preventDefault();
        console.log('Input value:', inputValue);
        // 在这里处理输入值，例如调用合约函数
        const accounts = await web3.eth.getAccounts();
        await contract.methods.updateMessage(inputValue).send({ from: accounts[0] });
        const response = await contract.methods.message().call();

        setMessage(response);

    };

    return (
        <div>
            <p>{message}</p>
            <form onSubmit={handleSubmit}>
                <label>
                    输入更新的内容：
                    <input
                        type="text"
                        value={inputValue}
                        onChange={handleInputChange}
                    />
                </label>
                <button type="submit">提交</button>
            </form>
        </div>
    );
};

export default InputForm;
