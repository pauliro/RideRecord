"use client";
import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import useRideRecords from '../hooks/useRideRecords';
import { useWaitForTransactionReceipt, useWriteContract } from 'wagmi';

interface VehicleRegistrationProps {
  onRegistrationComplete: (serialHash: string) => void;
}

const VehicleRegistration: React.FC<VehicleRegistrationProps> = ({ onRegistrationComplete }) => {
  const { address, isConnected } = useAccount();
  const { registerVehicle, hashVIN } = useRideRecords();
  const [formData, setFormData] = useState({
    vin: '',
    make: '',
    model: '',
    year: '',
    odometer: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!isConnected || !address) {
        throw new Error('Please connect your wallet first');
      }

      // Validate form data
      if (!formData.vin || !formData.make || !formData.model || !formData.year || !formData.odometer) {
        throw new Error('Please fill in all fields');
      }

      // Get transaction parameters
      const txParams = await registerVehicle(
        formData.vin,
        formData.make,
        formData.model,
        formData.year,
        formData.odometer
      );

      // Send transaction
      writeContract(txParams);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsLoading(false);
    }
  };

  // Handle successful transaction
  React.useEffect(() => {
    if (isSuccess && hash) {
      const serialHash = hashVIN(formData.vin);
      
      // Ensure address is available before making the fetch request
      if (!address) {
        setError('Wallet address not found. Please connect your wallet.');
        setIsLoading(false);
        return;
      }
      console.log('Sending ownerAddress to API:', address);

      // Save vehicle data to backend
      fetch('/api/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serialHash,
          vinMasked: formData.vin.slice(-4), // Show last 4 characters
          make: formData.make,
          model: formData.model,
          year: formData.year,
          odometer: formData.odometer,
          ownerAddress: address
        }),
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          onRegistrationComplete(serialHash);
          setFormData({ vin: '', make: '', model: '', year: '', odometer: '' });
        } else {
          setError('Failed to save vehicle data');
        }
      })
      .catch(err => {
        setError('Failed to save vehicle data');
      })
      .finally(() => {
        setIsLoading(false);
      });
    }
  }, [isSuccess, hash, formData, address, hashVIN, onRegistrationComplete]);

  if (!isConnected) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Register Vehicle</h2>
        <p className="text-gray-600">Please connect your wallet to register a vehicle.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Register Vehicle</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="vin" className="block text-sm font-medium text-gray-700 mb-1">
            VIN (Vehicle Identification Number)
          </label>
          <input
            type="text"
            id="vin"
            name="vin"
            value={formData.vin}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter VIN"
            required
          />
        </div>

        <div>
          <label htmlFor="make" className="block text-sm font-medium text-gray-700 mb-1">
            Make
          </label>
          <input
            type="text"
            id="make"
            name="make"
            value={formData.make}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Toyota"
            required
          />
        </div>

        <div>
          <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1">
            Model
          </label>
          <input
            type="text"
            id="model"
            name="model"
            value={formData.model}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Corolla"
            required
          />
        </div>

        <div>
          <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">
            Year
          </label>
          <input
            type="number"
            id="year"
            name="year"
            value={formData.year}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., 2020"
            min="1900"
            max={new Date().getFullYear() + 1}
            required
          />
        </div>

        <div>
          <label htmlFor="odometer" className="block text-sm font-medium text-gray-700 mb-1">
            Odometer (miles)
          </label>
          <input
            type="number"
            id="odometer"
            name="odometer"
            value={formData.odometer}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., 50000"
            min="0"
            required
          />
        </div>

        {error && (
          <div className="text-red-600 text-sm">{error}</div>
        )}

        <button
          type="submit"
          disabled={isLoading || isConfirming}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading || isConfirming ? 'Processing...' : 'Register Vehicle'}
        </button>
      </form>

      {isConfirming && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-blue-800 text-sm">
            Transaction confirmed! Saving vehicle data...
          </p>
        </div>
      )}
    </div>
  );
};

export default VehicleRegistration;
