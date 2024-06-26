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
        bool isHanging;
        bool isAuthorized;
        bool isBaned;
        uint256 requestTime;
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
    }

    mapping(address => User) public users;
    mapping(address => ServiceProvider) public serviceProviders;

    // uint256 public = 10;

    event UserRegistered(address indexed userAddress);
    event ServiceProviderRegistered(address indexed serviceProviderAddress);
    event OTPGenerated(address indexed userAddress, address indexed serviceProviderAddress);
    event OTPVerified(address indexed userAddress, address indexed serviceProviderAddress, bool isValid);
    event OTPAbuse(address indexed userAddress, address indexed serviceProviderAddress, string abuseCode);
    event ServiceConnectionRequested(address indexed userAddress, address indexed serviceProviderAddress);
    event ServiceConnectionResolved(address indexed userAddress, address indexed serviceProviderAddress, bool auth, bool ban);

    modifier onlyRegisteredUser() {
        require(users[msg.sender].isRegistered, "User not registered");
        _;
    }

    modifier onlyRegisteredServiceProvider() {
        require(serviceProviders[msg.sender].isRegistered, "Service provider not registered");
        _;
    }

    function registerUser(string memory publicKey) external {
        require(!users[msg.sender].isRegistered, "User already registered");

        User storage newUser = users[msg.sender];
        newUser.userAddress = msg.sender;
        newUser.publicKey = publicKey;

        newUser.isRegistered = true;

        emit UserRegistered(msg.sender);
    }

    function getServiceInfo(address service) public view returns (ServiceInfo memory) {
        return users[msg.sender].serviceInfos[service];
    }

    function getOTPInfo(address service) public view returns (OTPInfo memory) {
        return users[msg.sender].otps[service];
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

    // Request to serve a user
    function requestServiceConnection(address userAddress) external onlyRegisteredServiceProvider {
        require(users[userAddress].isRegistered, "User not registered");

        ServiceInfo storage _serviceInfo = users[userAddress].serviceInfos[msg.sender];
        
        require(_serviceInfo.isBaned==false, "The service had been banned by the user");
        require(_serviceInfo.isAuthorized==false || block.timestamp > _serviceInfo.expirationTime, "A valid auth exists");
        require(_serviceInfo.isHanging==false || block.timestamp > _serviceInfo.expirationTime, "A valid request is still hanging");
        // require(_serviceInfo.)

        
        _serviceInfo.isHanging = true;
        _serviceInfo.isAuthorized = false;
        _serviceInfo.isBaned = false;
        _serviceInfo.requestTime = block.timestamp;
        _serviceInfo.expirationTime = block.timestamp + 5 minutes;

        emit ServiceConnectionRequested(userAddress, msg.sender);
    }

    // Respond to auth the service, refuse the connection or ban the service
    function respondServiceConnection(address serviceProviderAddress, bool auth, bool ban) external onlyRegisteredUser {
        require(serviceProviders[serviceProviderAddress].isRegistered, "Service provider not registered");
        
        ServiceInfo storage _serviceInfo = users[msg.sender].serviceInfos[serviceProviderAddress];

        require(_serviceInfo.isHanging==true && block.timestamp<_serviceInfo.expirationTime, "No valid request is hanging");
        
        _serviceInfo.isHanging = false;
        if (auth) {
            _serviceInfo.isAuthorized = true;
            _serviceInfo.expirationTime = block.timestamp + 365 days;
        } else {
            if (ban) { _serviceInfo.isBaned = true; }
        }

        emit ServiceConnectionResolved(msg.sender, serviceProviderAddress, auth, ban);
    }


    // Generate new OTP called by user
    function generateOTP(address serviceProviderAddress, uint256 salt) public onlyRegisteredUser {
        require(serviceProviders[serviceProviderAddress].isRegistered, "Service provider not registered");
        require(
            users[msg.sender].serviceInfos[serviceProviderAddress].isAuthorized || 
            users[msg.sender].serviceInfos[serviceProviderAddress].expirationTime < block.timestamp
            , "Service provider is not authorized or expired"
        );

        OTPInfo storage otpInfo = users[msg.sender].otps[serviceProviderAddress];

        require(block.timestamp > otpInfo.expirationTime || otpInfo.isUsed, "Existing OTP is still valid");

        uint256 otp = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, serviceProviderAddress, salt))) % 1000000; // 6-digit OTP
        otpInfo.otp = otp;
        otpInfo.expirationTime = block.timestamp + 5 minutes; // OTP valid for 5 minutes
        otpInfo.isUsed = false;

        emit OTPGenerated(msg.sender, serviceProviderAddress);
    }

    // Verify OTP called by service provider
    function verifyOTP(address userAddress, uint256 otp) external onlyRegisteredServiceProvider {
        require(users[userAddress].isRegistered, "User not registered");
        require(
            users[userAddress].serviceInfos[msg.sender].isAuthorized || 
            users[userAddress].serviceInfos[msg.sender].expirationTime < block.timestamp
            , "Service provider is not authorized or expired"
        );


        OTPInfo storage otpInfo = users[userAddress].otps[msg.sender];

        if (block.timestamp > otpInfo.expirationTime || otpInfo.isUsed) {
            emit OTPAbuse(userAddress, msg.sender, "UNAUTHORIZED_TRY");
        } else if (otpInfo.otp != otp) {
            otpInfo.isUsed = true;
            emit OTPAbuse(userAddress, msg.sender, "WRONG_ANSWER");
        } else {
            otpInfo.isUsed = true;
            emit OTPVerified(userAddress, msg.sender, true);
        }

    }
}
