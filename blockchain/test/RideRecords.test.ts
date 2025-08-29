import { expect } from "chai";
import { ethers } from "hardhat";
import { RideRecords } from "../typechain-types";

describe("RideRecords", function () {
  let rideRecords: RideRecords;
  let owner: any;
  let addr1: any;
  let addr2: any;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    const RideRecordsFactory = await ethers.getContractFactory("RideRecords");
    rideRecords = await RideRecordsFactory.deploy();
  });

  describe("Vehicle Registration", function () {
    it("Should register a new vehicle", async function () {
      const vin = "1HGBH41JXMN109186";
      const serialHash = ethers.keccak256(ethers.toUtf8Bytes(vin));
      
      await expect(rideRecords.registerVehicle(serialHash))
        .to.emit(rideRecords, "VehicleRegistered")
        .withArgs(serialHash, owner.address);
      
      expect(await rideRecords.getVehicleOwner(serialHash)).to.equal(owner.address);
    });

    it("Should not allow registering the same vehicle twice", async function () {
      const vin = "1HGBH41JXMN109186";
      const serialHash = ethers.keccak256(ethers.toUtf8Bytes(vin));
      
      await rideRecords.registerVehicle(serialHash);
      
      await expect(rideRecords.registerVehicle(serialHash))
        .to.be.revertedWith("Vehicle already registered");
    });
  });

  describe("Vehicle Transfer", function () {
    beforeEach(async function () {
      const vin = "1HGBH41JXMN109186";
      const serialHash = ethers.keccak256(ethers.toUtf8Bytes(vin));
      await rideRecords.registerVehicle(serialHash);
    });

    it("Should transfer vehicle ownership", async function () {
      const vin = "1HGBH41JXMN109186";
      const serialHash = ethers.keccak256(ethers.toUtf8Bytes(vin));
      
      await expect(rideRecords.transferVehicle(serialHash, addr1.address))
        .to.emit(rideRecords, "VehicleTransferred")
        .withArgs(serialHash, owner.address, addr1.address);
      
      expect(await rideRecords.getVehicleOwner(serialHash)).to.equal(addr1.address);
    });

    it("Should not allow non-owner to transfer", async function () {
      const vin = "1HGBH41JXMN109186";
      const serialHash = ethers.keccak256(ethers.toUtf8Bytes(vin));
      
      await expect(rideRecords.connect(addr1).transferVehicle(serialHash, addr2.address))
        .to.be.revertedWith("Only owner can transfer");
    });

    it("Should not allow transfer to zero address", async function () {
      const vin = "1HGBH41JXMN109186";
      const serialHash = ethers.keccak256(ethers.toUtf8Bytes(vin));
      
      await expect(rideRecords.transferVehicle(serialHash, ethers.ZeroAddress))
        .to.be.revertedWith("Cannot transfer to zero address");
    });
  });

  describe("Vehicle Owner", function () {
    it("Should return zero address for unregistered vehicle", async function () {
      const vin = "1HGBH41JXMN109186";
      const serialHash = ethers.keccak256(ethers.toUtf8Bytes(vin));
      
      expect(await rideRecords.getVehicleOwner(serialHash)).to.equal(ethers.ZeroAddress);
    });
  });
});
