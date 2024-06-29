// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract MetaAuth_OTP {
    using ECDSA for bytes32;

    struct OTPInfo {
        uint256 otp; // 8 digits of numbers and letters
        uint256 expirationTime; 
        bool isUsed;
    }

    struct ServiceInfo {
        bool isAuthorized;
        uint256 authorizeTime;
        uint256 expirationTime;
    }

    struct User {
        address userAddress;
        address publicKey;
        bool isRegistered;
        mapping(address => OTPInfo) otps; // Keyed by service provider address
        mapping(address => ServiceInfo) serviceInfos;
    }

    struct ServiceProvider {
        address serviceProviderAddress;
        // string name;
        address publicKey;
        bool isRegistered;
        uint256 requestCount;
        uint256 lastRequestTime;
        mapping(bytes32 => uint256) challengeExpirationTime; 
    }

    // mapping(address => User) public users;
    mapping(address => User) public users_pk_view;
    mapping(address => bool) public registeredUsers;
    mapping(address => ServiceProvider) public serviceProviders;

    address contractOwner;

    constructor () {
        contractOwner = msg.sender;
    }

    // uint256 public = 10;

    event UserRegistered(address indexed userAddress);
    event ServiceProviderRegistered(address indexed serviceProviderAddress);

    event ServiceConnected(address indexed publicKey, address indexed serviceProviderAddress, uint256 authorizeTime, string challenge);
    event OTPGenerated(address indexed publicKey, address indexed serviceProviderAddress);
    event OTPVerified(address indexed publicKey, address indexed serviceProviderAddress, bool isValid);
    event OTPAbuse(address indexed publicKey, address indexed serviceProviderAddress, string abuseCode);

    event LogRecovery(address publicKey);
    event LogBytes32(bytes32 data);
    event LogString(string data);

    modifier onlyRegisteredUser() {
        require(registeredUsers[msg.sender], "User not registered");
        _;
    }

    modifier onlyRegisteredUserPk(address publicKey) {
        require(users_pk_view[publicKey].isRegistered, "User PK not registered");
        _;
    }

    modifier onlyRegisteredServiceProvider(address addr) {
        require(serviceProviders[addr].isRegistered, "Service provider not registered");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender==contractOwner, "Caller required to be contract owner");
        _;
    }

    function registerUser(address publicKey, address userAddress, bytes memory signature) external onlyOwner {
        // require(!users[msg.sender].isRegistered, "User already registered");
        require(verifySignature("522", signature, publicKey), "User signature not match");
        require(!users_pk_view[publicKey].isRegistered, "User public key already registered");
        require(!registeredUsers[userAddress], "User wallet address already registered");

        // User storage newUser = users[msg.sender];
        User storage newUser = users_pk_view[publicKey];
        newUser.userAddress = userAddress;
        newUser.publicKey = publicKey;

        newUser.isRegistered = true;
        registeredUsers[userAddress] = true;

        emit UserRegistered(msg.sender);
    }

    function getServiceInfo(address publicKey, address service) public view onlyRegisteredUserPk(publicKey) onlyRegisteredUser returns (ServiceInfo memory) {
        require(users_pk_view[publicKey].userAddress==msg.sender, "Only owner of this pk can read service info list.");        
        return users_pk_view[publicKey].serviceInfos[service];
    }

    function getOTPInfo(address publicKey, address service) public view onlyRegisteredUserPk(publicKey) onlyRegisteredUser returns (OTPInfo memory) {
        require(users_pk_view[publicKey].userAddress==msg.sender, "Only owner of this pk can read OTP list.");
        return users_pk_view[publicKey].otps[service];
    }


    // Register new service provider to contract
    function registerServiceProvider(address publicKey) external {
        require(!serviceProviders[msg.sender].isRegistered, "Service provider already registered");
        // serviceProviders[msg.sender] = ServiceProvider(msg.sender, publicKey, true, 0, block.timestamp);
        ServiceProvider storage newServiceProvider = serviceProviders[msg.sender];
        newServiceProvider.serviceProviderAddress = msg.sender;
        newServiceProvider.publicKey = publicKey;
        newServiceProvider.isRegistered = true;

        emit ServiceProviderRegistered(msg.sender);
    }


    // Opening challenge called by service
    function openChallenge(bytes32 challenge_hash) external onlyRegisteredServiceProvider(msg.sender) {
        serviceProviders[msg.sender].challengeExpirationTime[challenge_hash] = block.timestamp + 15 minutes;
    }


    // Verify signature
    // function verifySignature(string memory message, bytes memory sig, address pk) public pure returns (bool) {
    //     require(sig.length == 65, "Invalid signature length");

    //     bytes32 messageHash = keccak256(abi.encodePacked(message));

    //     bytes32 r; 
    //     bytes32 s; 
    //     uint8 v;
        
    //     assembly {
    //         r := mload(add(sig, 32))
    //         s := mload(add(sig, 64))
    //         v := byte(0, mload(add(sig, 96)))
    //     }

    //     address recoveredSigner = ecrecover(messageHash, v, r, s);

    //     return recoveredSigner==pk;
    // }
    function verifySignature(string memory message, bytes memory sig, address pk) public pure returns (bool) {
        require(sig.length == 65, "Invalid signature length");

        // string memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 messageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32",
            keccak256(abi.encodePacked(message)))
        );

        bytes32 r; 
        bytes32 s; 
        uint8 v;
        
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }

        address recoveredSigner = ecrecover(messageHash, v, r, s);

        return recoveredSigner==pk;
    }

    // Register service called by user, emit event to tell service
    function connectService(address publicKey, address serviceProviderAddress, string memory challenge, bytes memory signature) external 
    onlyOwner onlyRegisteredUserPk(publicKey) onlyRegisteredServiceProvider(serviceProviderAddress) {
        // Need user signature here to verify the connect service call
        require(verifySignature(challenge, signature, publicKey), "User signature not match");
        ServiceInfo storage _serviceInfo = users_pk_view[publicKey].serviceInfos[serviceProviderAddress];

        require(serviceProviders[serviceProviderAddress].challengeExpirationTime[keccak256(abi.encodePacked(challenge))]>block.timestamp, "No valid opening challenge on this service");

        require(_serviceInfo.isAuthorized==false||block.timestamp>_serviceInfo.expirationTime, "Connection is still valid");

        _serviceInfo.isAuthorized = true;
        _serviceInfo.authorizeTime = block.timestamp;
        _serviceInfo.expirationTime = block.timestamp + 180 days;

        emit ServiceConnected(publicKey, serviceProviderAddress, _serviceInfo.authorizeTime, challenge);
    }


    // Generate new OTP called by user
    function generateOTP(address publicKey, address serviceProviderAddress, string memory salt, bytes memory signature) public 
    onlyOwner onlyRegisteredUserPk(publicKey) onlyRegisteredServiceProvider(serviceProviderAddress) {
        // require(serviceProviders[serviceProviderAddress].isRegistered, "Service provider not registered");
        require(
            users_pk_view[publicKey].serviceInfos[serviceProviderAddress].isAuthorized || 
            users_pk_view[publicKey].serviceInfos[serviceProviderAddress].expirationTime < block.timestamp
            , "Service provider is not authorized or expired"
        );

        // Need user signature here to verify the otp generation call
        require(verifySignature(salt, signature, publicKey), "User signature not match");

        OTPInfo storage otpInfo = users_pk_view[publicKey].otps[serviceProviderAddress];

        require(block.timestamp > otpInfo.expirationTime || otpInfo.isUsed, "Existing OTP is still valid");

        uint256 otp = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, serviceProviderAddress, salt))) % 1000000; // 6-digit OTP
        otpInfo.otp = otp;
        otpInfo.expirationTime = block.timestamp + 5 minutes; // OTP valid for 5 minutes
        otpInfo.isUsed = false;

        emit OTPGenerated(publicKey, serviceProviderAddress);
    }

    // Verify OTP called by service provider
    function verifyOTP(address publicKey, uint256 otp) external 
    onlyRegisteredUserPk(publicKey) onlyRegisteredServiceProvider(msg.sender) {
        // require(users[userAddress].isRegistered, "User not registered");
        require(
            users_pk_view[publicKey].serviceInfos[msg.sender].isAuthorized || 
            users_pk_view[publicKey].serviceInfos[msg.sender].expirationTime > block.timestamp
            , "Service provider is not authorized or expired"
        );


        OTPInfo storage otpInfo = users_pk_view[publicKey].otps[msg.sender];

        if (block.timestamp > otpInfo.expirationTime || otpInfo.isUsed) {
            emit OTPAbuse(publicKey, msg.sender, "UNAUTHORIZED_TRY");
        } else if (otpInfo.otp != otp) {
            otpInfo.isUsed = true;
            emit OTPAbuse(publicKey, msg.sender, "WRONG_ANSWER");
        } else {
            otpInfo.isUsed = true;
            emit OTPVerified(publicKey, msg.sender, true);
        }

    }
}
