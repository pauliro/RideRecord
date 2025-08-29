"use client";
import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import useRideRecords from '../hooks/useRideRecords';
import { useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import MaintenanceForm from './MaintenanceForm';

interface Vehicle {
  id: string;
  serialHash: string;
  vinMasked: string;
  make: string;
  model: string;
  year: number;
  odometer: number;
  currentOwner: string;
  history: any[];
}

interface VehicleDetailProps {
  serialHash: string;
  onBack: () => void;
}

const VehicleDetail: React.FC<VehicleDetailProps> = ({ serialHash, onBack }) => {
  const { address, isConnected } = useAccount();
  const { transferVehicle } = useRideRecords();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [transferTo, setTransferTo] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  const { writeContract, data: transferHash } = useWriteContract();
  const { isLoading: isConfirmingTransfer, isSuccess: isTransferSuccess } = useWaitForTransactionReceipt({
    hash: transferHash,
  });

  // Load vehicle data
  useEffect(() => {
    fetchVehicleData();
  }, [serialHash]);

  const fetchVehicleData = async () => {
    try {
      const response = await fetch(`/api/vehicles/${serialHash}`);
      if (response.ok) {
        const data = await response.json();
        setVehicle(data);
      } else {
        setError('Vehicle not found');
      }
    } catch (err) {
      setError('Failed to load vehicle data');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle transfer transaction
  useEffect(() => {
    if (isTransferSuccess && transferHash && vehicle) {
      // Update backend
      fetch(`/api/vehicles/${serialHash}/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: transferTo,
          from: address
        }),
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          fetchVehicleData(); // Refresh data
          setShowTransferForm(false);
          setTransferTo('');
        } else {
          setError('Failed to update transfer data');
        }
      })
      .catch(err => {
        setError('Failed to update transfer data');
      })
      .finally(() => {
        setIsTransferring(false);
      });
    }
  }, [isTransferSuccess, transferHash, serialHash, transferTo, address, vehicle]);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsTransferring(true);

    try {
      if (!isConnected || !address) {
        throw new Error('Please connect your wallet first');
      }

      if (!transferTo) {
        throw new Error('Please enter recipient address');
      }

      // Get transaction parameters
      const txParams = await transferVehicle(serialHash, transferTo);

      // Send transaction
      writeContract(txParams);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsTransferring(false);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'REGISTERED':
        return '🚗';
      case 'TRANSFER_COMPLETED':
      case 'TRANSFERRED':
        return '🔄';
      case 'MAINTENANCE':
        return '🔧';
      default:
        return '📝';
    }
  };

  const getEventTitle = (event: any) => {
    switch (event.type) {
      case 'REGISTERED':
        return 'Vehicle Registered';
      case 'TRANSFER_COMPLETED':
      case 'TRANSFERRED':
        return 'Ownership Transferred';
      case 'MAINTENANCE':
        return 'Maintenance Record';
      default:
        return event.type;
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
        <button
          onClick={onBack}
          className="mb-4 text-blue-600 hover:text-blue-800"
        >
          ← Back
        </button>
        <div className="text-red-600">{error || 'Vehicle not found'}</div>
      </div>
    );
  }

  const isOwner = isConnected && address === vehicle.currentOwner;

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
      <button
        onClick={onBack}
        className="mb-4 text-blue-600 hover:text-blue-800"
      >
        ← Back to Registration
      </button>

      {/* Vehicle Summary */}
      <div className="mb-8 p-6 bg-gray-50 rounded-lg">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          {vehicle.year} {vehicle.make} {vehicle.model}
        </h1>
        <p className="text-gray-600 mb-4">
          VIN: ...{vehicle.vinMasked} • {vehicle.odometer.toLocaleString()} miles
        </p>
        <p className="text-sm text-gray-500">
          Current Owner: {formatAddress(vehicle.currentOwner)}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="mb-8 flex gap-4">
        {isOwner && (
          <>
            <button
              onClick={() => setShowTransferForm(!showTransferForm)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Transfer Ownership
            </button>
                         <button
               onClick={() => setShowMaintenanceForm(!showMaintenanceForm)}
               className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
             >
               Add Maintenance
             </button>
          </>
        )}
      </div>

      {/* Transfer Form */}
      {showTransferForm && (
        <div className="mb-8 p-4 border border-gray-200 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Transfer Ownership</h3>
          <form onSubmit={handleTransfer} className="space-y-4">
            <div>
              <label htmlFor="transferTo" className="block text-sm font-medium text-gray-700 mb-1">
                Recipient Address
              </label>
              <input
                type="text"
                id="transferTo"
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0x..."
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isTransferring || isConfirmingTransfer}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isTransferring || isConfirmingTransfer ? 'Processing...' : 'Transfer'}
              </button>
              <button
                type="button"
                onClick={() => setShowTransferForm(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
                 </div>
       )}

       {/* Maintenance Form */}
       {showMaintenanceForm && (
         <div className="mb-8">
           <MaintenanceForm
             serialHash={serialHash}
             onMaintenanceAdded={() => {
               fetchVehicleData();
               setShowMaintenanceForm(false);
             }}
             onCancel={() => setShowMaintenanceForm(false)}
           />
         </div>
       )}

       {/* History Timeline */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Vehicle History</h2>
        <div className="space-y-4">
          {vehicle.history.map((event, index) => (
            <div key={index} className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg">
              <div className="text-2xl">{getEventIcon(event.type)}</div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800">
                  {getEventTitle(event)}
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  {formatDate(event.timestamp)}
                </p>
                
                {event.type === 'REGISTERED' && (
                  <p className="text-sm text-gray-700">
                    Registered by {formatAddress(event.actor)}
                  </p>
                )}
                
                {event.type === 'TRANSFER_COMPLETED' && (
                  <p className="text-sm text-gray-700">
                    Transferred from {formatAddress(event.actor)} to {formatAddress(event.to)}
                  </p>
                )}
                
                {event.type === 'MAINTENANCE' && (
                  <div>
                    <p className="text-sm text-gray-700 mb-2">
                      {event.data.notes}
                    </p>
                    {event.data.evidenceUri && (
                      <a
                        href={event.data.evidenceUri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        View Evidence →
                      </a>
                    )}
                  </div>
                )}

                {event.chain && (
                  <a
                    href={`https://sepolia.basescan.org/tx/${event.chain.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 text-blue-600 hover:text-blue-800 text-sm"
                  >
                    View on Block Explorer →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VehicleDetail;
