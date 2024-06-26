// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract HelloWorld {
  string public message;

  // constructor() public {

  // }

  constructor(string memory initMessage)  {
    message = initMessage;
    // message = "Hello";
  }
  
  function updateMessage(string memory newMessage) public {
    message = newMessage;
  }
}
