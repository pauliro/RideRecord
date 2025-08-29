import { ethers } from "hardhat";

async function main() {
  console.log("Deploying RideRecords contract...");

  const RideRecords = await ethers.getContractFactory("RideRecords");
  const rideRecords = await RideRecords.deploy();

  await rideRecords.waitForDeployment();

  const address = await rideRecords.getAddress();
  console.log("RideRecords deployed to:", address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
