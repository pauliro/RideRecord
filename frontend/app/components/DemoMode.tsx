"use client";
import React, { useState } from 'react';

interface DemoModeProps {
  onDemoComplete: (serialHash: string) => void;
}

const DemoMode: React.FC<DemoModeProps> = ({ onDemoComplete }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleStartDemo = async () => {
    setIsLoading(true);
    
    // Simulate demo data
    const demoVehicle = {
      id: "demo-vehicle-1",
      serialHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      vinMasked: "1234",
      make: "Toyota",
      model: "Corolla",
      year: 2020,
      odometer: 45000,
      currentOwner: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
      history: [
        {
          type: "REGISTERED",
          timestamp: "2024-01-15T10:00:00Z",
          actor: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
          chain: {
            network: "Base Sepolia",
            txHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
          }
        },
        {
          type: "MAINTENANCE",
          timestamp: "2024-02-20T14:30:00Z",
          actor: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
          data: {
            notes: "Oil change and tire rotation at 45,000 miles",
            evidenceUri: null
          }
        },
        {
          type: "TRANSFER_COMPLETED",
          timestamp: "2024-03-10T16:45:00Z",
          actor: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
          to: "0x8ba1f109551bD432803012645Hac136c772c3e",
          chain: {
            network: "Base Sepolia",
            txHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
          }
        }
      ]
    };

    // Simulate API delay
    setTimeout(() => {
      setIsLoading(false);
      onDemoComplete(demoVehicle.serialHash);
    }, 2000);
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Demo Mode</h2>
      <p className="text-gray-600 mb-6">
        Explore RideRecords with sample data. No wallet connection required.
      </p>
      
      <button
        onClick={handleStartDemo}
        disabled={isLoading}
        className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Loading Demo...' : 'Start Demo'}
      </button>
      
      <div className="mt-4 text-sm text-gray-500">
        <p>Demo includes:</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Sample vehicle registration</li>
          <li>Maintenance record</li>
          <li>Ownership transfer</li>
          <li>Blockchain transaction links</li>
        </ul>
      </div>
    </div>
  );
};

export default DemoMode;
