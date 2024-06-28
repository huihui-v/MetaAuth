// src/Web3Context.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getWeb3, getContractInstance } from './getWeb3';

const Web3Context = createContext();

export const Web3Provider = ({ children }) => {
    const [web3, setWeb3] = useState(null);
    const [contract, setContract] = useState(null);

    useEffect(() => {
        const init = async () => {
          try {
            const web3 = await getWeb3();
            setWeb3(web3.web3)
    
            const contractInstance = await getContractInstance(web3.web3);
            setContract(contractInstance);

            if (!web3.web3||!contractInstance) {
              return <div>Loading Web3, accounts, and contract...</div>;
            }

          } catch (error) {
            console.error("Error initializing web3 or contract:", error);
          }
        };
      
        init();
      
    }, []);

    return (
        <Web3Context.Provider value={{ web3, contract }}>
            {children}
        </Web3Context.Provider>
    );
};

export const useWeb3 = () => useContext(Web3Context);