import { NextRequest, NextResponse } from 'next/server';
import { Configuration, ContractsApi } from '@curvegrid/multibaas-sdk';
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

// Load database
function loadDatabase() {
  if (!fs.existsSync(dbPath)) {
    return { vehicles: [] };
  }
  const data = fs.readFileSync(dbPath, 'utf8');
  return JSON.parse(data);
}

// Save database
function saveDatabase(data: any) {
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

export async function POST(
  request: NextRequest,
  { params }: { params: { serialHash: string } }
) {
  try {
    const { serialHash } = params;
    const body = await request.json();
    const { to, from } = body;

    if (!to || !from) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Load database
    const db = loadDatabase();
    const vehicleIndex = db.vehicles.findIndex((v: any) => v.serialHash === serialHash);

    if (vehicleIndex === -1) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    const vehicle = db.vehicles[vehicleIndex];

    // Verify current owner
    if (vehicle.currentOwner !== from) {
      return NextResponse.json(
        { error: 'Only the current owner can transfer the vehicle' },
        { status: 403 }
      );
    }

    // Call the smart contract to transfer ownership
    const payload = {
      args: [serialHash, to],
      contractOverride: true,
      from: from,
    };

    const response = await contractsApi.callContractFunction(
      chain,
      rideRecordsAddressAlias,
      rideRecordsContractLabel,
      'transferVehicle',
      payload
    );

    if (response.data.result.kind !== 'TransactionToSignResponse') {
      throw new Error('Failed to create transaction');
    }

    const txHash = response.data.result.tx.hash;

    // Update vehicle in database
    db.vehicles[vehicleIndex].currentOwner = to;
    
    // Add transfer event to history
    const transferEvent = {
      type: 'TRANSFER_COMPLETED',
      timestamp: new Date().toISOString(),
      actor: from,
      to: to,
      chain: {
        network: 'Base Sepolia',
        txHash
      }
    };

    db.vehicles[vehicleIndex].history.push(transferEvent);
    saveDatabase(db);

    return NextResponse.json({
      success: true,
      txHash,
      event: transferEvent
    });

  } catch (error) {
    console.error('Error transferring vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to transfer vehicle' },
      { status: 500 }
    );
  }
}
