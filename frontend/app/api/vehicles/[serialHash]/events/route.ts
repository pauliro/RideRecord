import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Database file path
const dbPath = path.join(process.cwd(), 'data', 'db.json');
const uploadsDir = path.join(process.cwd(), 'uploads');

// Ensure uploads directory exists
function ensureUploadsDirectory() {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
}

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
    const formData = await request.formData();
    
    const description = formData.get('description') as string;
    const actor = formData.get('actor') as string;
    const evidenceFile = formData.get('evidence') as File | null;

    if (!description || !actor) {
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

    // Handle file upload if provided
    let evidenceUri = null;
    if (evidenceFile) {
      ensureUploadsDirectory();
      const fileName = `${Date.now()}-${evidenceFile.name}`;
      const filePath = path.join(uploadsDir, fileName);
      
      const bytes = await evidenceFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      fs.writeFileSync(filePath, buffer);
      
      evidenceUri = `/uploads/${fileName}`;
    }

    // Create maintenance event
    const maintenanceEvent = {
      type: 'MAINTENANCE',
      timestamp: new Date().toISOString(),
      actor,
      data: {
        notes: description,
        ...(evidenceUri && { evidenceUri })
      }
    };

    // Add event to vehicle history
    db.vehicles[vehicleIndex].history.push(maintenanceEvent);
    saveDatabase(db);

    return NextResponse.json({
      success: true,
      event: maintenanceEvent
    });

  } catch (error) {
    console.error('Error adding maintenance record:', error);
    return NextResponse.json(
      { error: 'Failed to add maintenance record' },
      { status: 500 }
    );
  }
}
