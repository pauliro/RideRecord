import { NextRequest, NextResponse } from 'next/server';
import { Configuration, ContractsApi } from '@curvegrid/multibaas-sdk';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

// Initialize MultiBaas configuration
const mbBaseUrl = process.env.NEXT_PUBLIC_MULTIBAAS_DEPLOYMENT_URL || "";
const mbApiKey = process.env.NEXT_PUBLIC_MULTIBAAS_DAPP_USER_API_KEY || "";
const rideRecordsContractLabel = process.env.NEXT_PUBLIC_MULTIBAAS_RIDE_RECORDS_CONTRACT_LABEL || "ride_records";
const rideRecordsAddressAlias = process.env.NEXT_PUBLIC_MULTIBAAS_RIDE_RECORDS_ADDRESS_ALIAS || "ride_records";

const mbConfig = new Configuration({
  basePath: new URL("/api/v0", mbBaseUrl).toString(),
  accessToken: mbApiKey,
});

const contractsApi = new ContractsApi(mbConfig);
const chain = "base-sepolia";

// Database file path
const dbPath = path.join(process.cwd(), 'data', 'db.json');

// Ensure data directory exists
function ensureDataDirectory() {
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Load database
function loadDatabase() {
  ensureDataDirectory();
  if (!fs.existsSync(dbPath)) {
    return { vehicles: [] };
  }
  const data = fs.readFileSync(dbPath, 'utf8');
  return JSON.parse(data);
}

// Save database
function saveDatabase(data: any) {
  ensureDataDirectory();
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serialHash, vinMasked, make, model, year, odometer, ownerAddress } = body;

    if (!serialHash || !vinMasked || !make || !model || !year || !ownerAddress) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Call the smart contract to register the vehicle
    const payload = {
      args: [serialHash],
      contractOverride: true,
      from: ownerAddress,
    };

    const response = await contractsApi.callContractFunction(
      chain,
      rideRecordsAddressAlias,
      rideRecordsContractLabel,
      'registerVehicle',
      payload
    );

    if (response.data.result.kind !== 'TransactionToSignResponse') {
      // This could happen if MultiBaas returns a MethodCallResponse (read-only) instead of a transaction
      throw new Error('Failed to create transaction: Unexpected MultiBaas response kind');
    }

    const txHash = response.data.result.tx.hash;

    // Save vehicle data to database
    const db = loadDatabase();
    const vehicle = {
      id: ethers.randomBytes(16).toString('hex'),
      serialHash,
      vinMasked,
      make,
      model,
      year: parseInt(year),
      odometer: parseInt(odometer),
      currentOwner: ownerAddress,
      history: [
        {
          type: 'REGISTERED',
          timestamp: new Date().toISOString(),
          actor: ownerAddress,
          chain: {
            network: 'Base Sepolia',
            txHash
          }
        }
      ]
    };

    db.vehicles.push(vehicle);
    saveDatabase(db);

    return NextResponse.json({
      success: true,
      vehicle,
      txHash
    });

  } catch (error) {
    console.error('Error registering vehicle:', error);
    // Check if the error is from the MultiBaas API and contains an "invalid address" message
    if (error instanceof Error && error.message.includes("invalid address")) {
      return NextResponse.json(
        { error: 'Invalid owner address provided. Please ensure your wallet is connected and try again.' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to register vehicle' },
      { status: 500 }
    );
  }
}
