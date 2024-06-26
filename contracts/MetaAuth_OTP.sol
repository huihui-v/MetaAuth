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
        string publicKey;
        bool isRegistered;
        mapping(address => OTPInfo) otps; // Keyed by service provider address
        mapping(address => ServiceInfo) serviceInfos;
    }

    struct ServiceProvider {
        address serviceProviderAddress;
        // string name;
        string publicKey;
        bool isRegistered;
        uint256 requestCount;
        uint256 lastRequestTime;
        mapping(bytes32 => uint256) challengeExpirationTime; 
    }

    // mapping(address => User) public users;
    mapping(string => User) public users_pk_view;
    mapping(address => bool) public registeredUsers;
    mapping(address => ServiceProvider) public serviceProviders;

    address contractOwner;

    constructor () {
        contractOwner = msg.sender;
    }

    // uint256 public = 10;

    event UserRegistered(address indexed userAddress);
    event ServiceProviderRegistered(address indexed serviceProviderAddress);

    event ServiceConnected(string publicKey, address indexed serviceProviderAddress, uint256 authorizeTime, string signature);
    event OTPGenerated(string publicKey, address indexed serviceProviderAddress);
    event OTPVerified(string publicKey, address indexed serviceProviderAddress, bool isValid);
    event OTPAbuse(string publicKey, address indexed serviceProviderAddress, string abuseCode);


    modifier onlyRegisteredUser(address addr) {
        require(registeredUsers[addr], "User not registered");
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

    function registerUser(string memory publicKey, address userAddress) external onlyOwner {
        // require(!users[msg.sender].isRegistered, "User already registered");
        require(!users_pk_view[publicKey].isRegistered, "User public key already registered");

        // User storage newUser = users[msg.sender];
        User storage newUser = users_pk_view[publicKey];
        newUser.userAddress = userAddress;
        newUser.publicKey = publicKey;

        newUser.isRegistered = true;
        registeredUsers[userAddress] = true;

        emit UserRegistered(msg.sender);
    }

    function getServiceInfo(string memory publicKey, address service) public view onlyRegisteredUser returns (ServiceInfo memory) {
        require(users_pk_view[publicKey].userAddress==msg.sender, "Only owner of this pk can read service info list.");        
        return users_pk_view[publicKey].serviceInfos[service];
    }

    function getOTPInfo(string memory publicKey, address service) public view onlyRegisteredUser returns (OTPInfo memory) {
        require(users_pk_view[publicKey].userAddress==msg.sender, "Only owner of this pk can read OTP list.");
        return users_pk_view[publicKey].otps[service];
    }


    // Register new service provider to contract
    function registerServiceProvider(string memory publicKey) external {
        require(!serviceProviders[msg.sender].isRegistered, "Service provider already registered");
        // serviceProviders[msg.sender] = ServiceProvider(msg.sender, publicKey, true, 0, block.timestamp);
        ServiceProvider storage newServiceProvider = serviceProviders[msg.sender];
        newServiceProvider.serviceProviderAddress = msg.sender;
        newServiceProvider.publicKey = publicKey;
        newServiceProvider.isRegistered = true;

        emit ServiceProviderRegistered(msg.sender);
    }


    // Opening challenge called by service
    function openChallenge(bytes32 challenge) external onlyRegisteredServiceProvider(msg.sender) {
        serviceProviders[msg.sender].challengeExpirationTime[challenge] = block.timestamp + 15 minutes;
    }

    // Register service called by user, emit event to tell service
    function connectService(string memory publicKey, address serviceProviderAddress, string memory challenge, string memory signature) external 
    onlyOwner onlyRegisteredUser(publicKey) onlyRegisteredServiceProvider(serviceProviderAddress) {
        ServiceInfo storage _serviceInfo = users_pk_view[publicKey].serviceInfos[serviceProviderAddress];

        require(serviceProviders[serviceProviderAddress].challengeExpirationTime[sha256(abi.encodePacked(challenge))]>block.timestamp, "No valid opening challenge on this service");

        require(_serviceInfo.isAuthorized==false||block.timestamp>_serviceInfo.expirationTime, "Connection is still valid");

        _serviceInfo.isAuthorized = true;
        _serviceInfo.authorizeTime = block.timestamp;
        _serviceInfo.expirationTime = block.timestamp + 180 days;

        emit ServiceConnected(publicKey, serviceProviderAddress, _serviceInfo.authorizeTime, signature);
    }


    // Generate new OTP called by user
    function generateOTP(string memory publicKey, address serviceProviderAddress, uint256 salt, string memory signature) public 
    onlyOwner onlyRegisteredUser(publicKey) onlyRegisteredServiceProvider(serviceProviderAddress) {
        // require(serviceProviders[serviceProviderAddress].isRegistered, "Service provider not registered");
        require(
            users_pk_view[publicKey].serviceInfos[serviceProviderAddress].isAuthorized || 
            users_pk_view[publicKey].serviceInfos[serviceProviderAddress].expirationTime < block.timestamp
            , "Service provider is not authorized or expired"
        );

        // Need user signature here to verify the otp generation call

        OTPInfo storage otpInfo = users_pk_view[publicKey].otps[serviceProviderAddress];

        require(block.timestamp > otpInfo.expirationTime || otpInfo.isUsed, "Existing OTP is still valid");

        uint256 otp = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, serviceProviderAddress, salt))) % 1000000; // 6-digit OTP
        otpInfo.otp = otp;
        otpInfo.expirationTime = block.timestamp + 5 minutes; // OTP valid for 5 minutes
        otpInfo.isUsed = false;

        emit OTPGenerated(publicKey, serviceProviderAddress);
    }

    // Verify OTP called by service provider
    function verifyOTP(string memory publicKey, uint256 otp) external 
    onlyOwner onlyRegisteredUser(publicKey) onlyRegisteredServiceProvider(msg.sender) {
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
