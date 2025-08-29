"use client";

import React, { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import VehicleRegistration from "./components/VehicleRegistration";
import VehicleDetail from "./components/VehicleDetail";
import DemoMode from "./components/DemoMode";

const Home: React.FC = () => {
  const { isConnected } = useAccount();
  const [currentView, setCurrentView] = useState<'welcome' | 'registration' | 'detail'>('welcome');
  const [currentVehicleHash, setCurrentVehicleHash] = useState<string>('');

  const handleRegistrationComplete = (serialHash: string) => {
    setCurrentVehicleHash(serialHash);
    setCurrentView('detail');
  };

  const handleBackToRegistration = () => {
    setCurrentView('registration');
    setCurrentVehicleHash('');
  };

  const handleDemoComplete = (serialHash: string) => {
    setCurrentVehicleHash(serialHash);
    setCurrentView('detail');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="navbar bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="app-title text-2xl font-bold text-gray-800">
              RideRecords
            </h1>
            <ConnectButton />
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'welcome' ? (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Carfax on-chain for LATAM
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-12">
                Create a permanent, tamper-evident history for your vehicle on the blockchain. 
                Reduce fraud and boost trust in P2P transactions.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <h3 className="text-2xl font-semibold mb-4 text-gray-800">Connect Wallet</h3>
                <p className="text-gray-600 mb-6">
                  Register your vehicle and manage its history on the blockchain.
                </p>
                <button
                  onClick={() => setCurrentView('registration')}
                  className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700"
                >
                  Get Started
                </button>
              </div>
              
              <div className="text-center">
                <h3 className="text-2xl font-semibold mb-4 text-gray-800">Try Demo</h3>
                <p className="text-gray-600 mb-6">
                  Explore the app with sample data without connecting a wallet.
                </p>
                <DemoMode onDemoComplete={handleDemoComplete} />
              </div>
            </div>
          </div>
        ) : currentView === 'registration' ? (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Register Your Vehicle
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Create a permanent, tamper-evident history for your vehicle on the blockchain.
              </p>
            </div>
            <VehicleRegistration onRegistrationComplete={handleRegistrationComplete} />
          </div>
        ) : (
          <VehicleDetail 
            serialHash={currentVehicleHash} 
            onBack={() => setCurrentView('welcome')} 
          />
        )}
      </div>
    </div>
  );
};

export default Home;
