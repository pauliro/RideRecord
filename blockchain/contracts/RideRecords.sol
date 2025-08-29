// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract RideRecords {
    // Mapping from the hashed vehicle serial number to its current owner
    mapping(bytes32 => address) public vehicleOwners;

    // Event for when a new vehicle is registered
    event VehicleRegistered(
        bytes32 indexed serialHash,
        address indexed owner
    );

    // Event for when a vehicle is transferred
    event VehicleTransferred(
        bytes32 indexed serialHash,
        address indexed from,
        address indexed to
    );

    /**
     * @notice Registers a new vehicle, anchoring it on-chain.
     * @param serialHash The keccak256 hash of the vehicle's VIN/serial number.
     */
    function registerVehicle(bytes32 serialHash) public {
        require(vehicleOwners[serialHash] == address(0), "Vehicle already registered");
        vehicleOwners[serialHash] = msg.sender;
        emit VehicleRegistered(serialHash, msg.sender);
    }

    /**
     * @notice Transfers ownership of a vehicle to a new address.
     * @param serialHash The keccak256 hash of the vehicle's VIN/serial number.
     * @param to The address of the new owner.
     */
    function transferVehicle(bytes32 serialHash, address to) public {
        require(vehicleOwners[serialHash] == msg.sender, "Only owner can transfer");
        require(to != address(0), "Cannot transfer to zero address");
        
        address from = msg.sender;
        vehicleOwners[serialHash] = to;
        emit VehicleTransferred(serialHash, from, to);
    }

    /**
     * @notice Gets the current owner of a vehicle.
     * @param serialHash The keccak256 hash of the vehicle's VIN/serial number.
     * @return The address of the current owner.
     */
    function getVehicleOwner(bytes32 serialHash) public view returns (address) {
        return vehicleOwners[serialHash];
    }
}
