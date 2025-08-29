import { NextRequest, NextResponse } from 'next/server';
import { Configuration, EventsApi } from '@curvegrid/multibaas-sdk';
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

const eventsApi = new EventsApi(mbConfig);
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

export async function GET(
  request: NextRequest,
  { params }: { params: { serialHash: string } }
) {
  try {
    const { serialHash } = params;

    // Load vehicle from database
    const db = loadDatabase();
    const vehicle = db.vehicles.find((v: any) => v.serialHash === serialHash);

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    // Fetch on-chain events from MultiBaas
    const onChainEvents = [];
    
    try {
      // Get VehicleRegistered events
      const registeredEvents = await eventsApi.listEvents(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        false,
        chain,
        rideRecordsAddressAlias,
        rideRecordsContractLabel,
        "VehicleRegistered(bytes32,address)",
        50
      );

      // Get VehicleTransferred events
      const transferredEvents = await eventsApi.listEvents(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        false,
        chain,
        rideRecordsAddressAlias,
        rideRecordsContractLabel,
        "VehicleTransferred(bytes32,address,address)",
        50
      );

      // Filter events for this specific vehicle
      const allEvents = [...(registeredEvents.data.result || []), ...(transferredEvents.data.result || [])];
      
      for (const event of allEvents) {
        if (event.args && event.args[0] === serialHash) {
          onChainEvents.push({
            type: event.eventName === 'VehicleRegistered' ? 'REGISTERED' : 'TRANSFERRED',
            timestamp: event.blockTimestamp,
            actor: event.args[1], // owner/from
            chain: {
              network: 'Base Sepolia',
              txHash: event.transactionHash,
              blockNumber: event.blockNumber
            },
            ...(event.eventName === 'VehicleTransferred' && {
              to: event.args[2] // to address
            })
          });
        }
      }
    } catch (error) {
      console.error('Error fetching on-chain events:', error);
      // Continue without on-chain events if there's an error
    }

    // Combine off-chain and on-chain events
    const allEvents = [...vehicle.history, ...onChainEvents];
    
    // Sort events by timestamp
    allEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Remove duplicates (off-chain events might duplicate on-chain ones)
    const uniqueEvents = allEvents.filter((event, index, self) => 
      index === self.findIndex(e => 
        e.type === event.type && 
        e.timestamp === event.timestamp &&
        e.actor === event.actor
      )
    );

    const vehicleWithHistory = {
      ...vehicle,
      history: uniqueEvents
    };

    return NextResponse.json(vehicleWithHistory);

  } catch (error) {
    console.error('Error fetching vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicle' },
      { status: 500 }
    );
  }
}
