"use client";
import type { PostMethodArgs, MethodCallResponse, TransactionToSignResponse } from "@curvegrid/multibaas-sdk";
import type { SendTransactionParameters } from "@wagmi/core";
import { Configuration, ContractsApi } from "@curvegrid/multibaas-sdk";
import { useAccount } from "wagmi";
import { useCallback, useMemo } from "react";
import { ethers } from "ethers";

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

interface RideRecordsHook {
  registerVehicle: (vin: string, make: string, model: string, year: string, odometer: string) => Promise<SendTransactionParameters>;
  transferVehicle: (serialHash: string, to: string) => Promise<SendTransactionParameters>;
  getVehicleOwner: (serialHash: string) => Promise<string | null>;
  hashVIN: (vin: string) => string;
}

const useRideRecords = (): RideRecordsHook => {
  const mbBaseUrl = process.env.NEXT_PUBLIC_MULTIBAAS_DEPLOYMENT_URL || "";
  const mbApiKey = process.env.NEXT_PUBLIC_MULTIBAAS_DAPP_USER_API_KEY || "";
  const rideRecordsContractLabel = process.env.NEXT_PUBLIC_MULTIBAAS_RIDE_RECORDS_CONTRACT_LABEL || "ride_records";
  const rideRecordsAddressAlias = process.env.NEXT_PUBLIC_MULTIBAAS_RIDE_RECORDS_ADDRESS_ALIAS || "ride_records";

  const chain = "base-sepolia";

  // Memoize mbConfig
  const mbConfig = useMemo(() => {
    return new Configuration({
      basePath: new URL("/api/v0", mbBaseUrl).toString(),
      accessToken: mbApiKey,
    });
  }, [mbBaseUrl, mbApiKey]);

  // Memoize Api
  const contractsApi = useMemo(() => new ContractsApi(mbConfig), [mbConfig]);

  const { address, isConnected } = useAccount();

  const callContractFunction = useCallback(
    async (methodName: string, args: PostMethodArgs['args'] = []): Promise<MethodCallResponse['output'] | TransactionToSignResponse['tx']> => {
      const payload: PostMethodArgs = {
        args,
        contractOverride: true,
        ...(isConnected && address ? { from: address } : {}),
      };

      const response = await contractsApi.callContractFunction(
        chain,
        rideRecordsAddressAlias,
        rideRecordsContractLabel,
        methodName,
        payload
      );

      if (response.data.result.kind === "MethodCallResponse") {
        return response.data.result.output;
      } else if (response.data.result.kind === "TransactionToSignResponse") {
        return response.data.result.tx;
      } else {
        throw new Error(`Unexpected response type: ${response.data.result.kind}`);
      }
    },
    [contractsApi, chain, rideRecordsAddressAlias, rideRecordsContractLabel, isConnected, address]
  );

  const registerVehicle = useCallback(async (
    vin: string, 
    make: string, 
    model: string, 
    year: string, 
    odometer: string
  ): Promise<SendTransactionParameters> => {
    const serialHash = ethers.keccak256(ethers.toUtf8Bytes(vin));
    return await callContractFunction("registerVehicle", [serialHash]);
  }, [callContractFunction]);

  const transferVehicle = useCallback(async (serialHash: string, to: string): Promise<SendTransactionParameters> => {
    return await callContractFunction("transferVehicle", [serialHash, to]);
  }, [callContractFunction]);

  const getVehicleOwner = useCallback(async (serialHash: string): Promise<string | null> => {
    try {
      const result = await callContractFunction("getVehicleOwner", [serialHash]);
      return result as string;
    } catch (err) {
      console.error("Error getting vehicle owner:", err);
      return null;
    }
  }, [callContractFunction]);

  const hashVIN = useCallback((vin: string): string => {
    return ethers.keccak256(ethers.toUtf8Bytes(vin));
  }, []);

  return {
    registerVehicle,
    transferVehicle,
    getVehicleOwner,
    hashVIN,
  };
};

export default useRideRecords;
