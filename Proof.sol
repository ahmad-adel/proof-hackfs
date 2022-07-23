pragma solidity >=0.7.0 <0.9.0;

contract Proof {
    // event NewProfileIssuanceRequest(uint id, uint issuingAgent_id, address user, string encryptedData, string userEncryptedKey);
    // event NewProfileAccessRequest(uint id, uint profile_id, uint requestingAgent_id, string encryptedData, string agentEncryptedKey);

    address private proofAdmin = '';    // admin address

    struct Organization {
        string name;
        bool isOrganization;    // default: false
    }

    mapping(address => Organization) public organizationAgents;
    address[] public organizations;

    // User
    struct User {
        string name;
        bool isUser;    // default: false
        // ProfileIssuanceRequest[] issuance_requests;
        // ProfileAccessRequest[] access_requests;
    }
    mapping(address => User) public users;        // usage: agents[address]

    function registerUser(string calldata name) public payable {
        require( organizationAgents[msg.sender].isOrganization, "This address belongs to an agent.");
        require( !users[msg.sender].isUser, "This address is already registered as a user.");
        users[msg.sender].name = name;
    }

    function createOrganization(
        address agentAddress,
        string calldata organizationName
    ) public payable {

        require(msg.sender == proofAdmin, "Only the system admin can call this function.");
        Organization memory organization;
        organization.name = organizationName;

        organizationAgents[agentAddress] = organization;
        organizations.push(agentAddress);
    }



    // // ProfileIssuanceRequest
    // struct ProfileIssuanceRequest {
    //     uint id;
    //     address user;
    //     string data;
    //     string status;
    // }
    // // Profile[] public profiles;

    // // ProfileAccessRequest
    // struct ProfileAccessRequest {
    //     uint id;
    //     address user;
    //     Organization organization;
    //     string status;
    // }
    // // ProfileRequest[] public profileRequests;

}