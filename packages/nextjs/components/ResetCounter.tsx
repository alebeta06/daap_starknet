"use client";

import { useState } from "react";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-stark";
import { useScaffoldReadContract } from "~~/hooks/scaffold-stark";
import { useDeployedContractInfo } from "~~/hooks/scaffold-stark";
import useScaffoldStrkBalance from "~~/hooks/scaffold-stark/useScaffoldStrkBalance";
import { useAccount } from "~~/hooks/useAccount";
import { useReadContract } from "@starknet-react/core";
import { universalStrkAddress, strkAbi } from "~~/utils/Constants";
import { parseUnits } from "ethers";

type ResetCounterProps = {
  counter: number;
  connectedAddress: string;
  ownerAddress: string;
};

const REQUIRED_STRK = 1; // 1 STRK required for reset
const REQUIRED_STRK_IN_FRI = parseUnits(REQUIRED_STRK.toString(), 18);

export const ResetCounter = ({
  counter,
  connectedAddress,
  ownerAddress,
}: ResetCounterProps) => {
  const { address } = useAccount();
  const { data: deployedContractData } = useDeployedContractInfo("CounterContract");
  
  // Get user's STRK balance
  const { value: strkBalance, isLoading: balanceLoading } = useScaffoldStrkBalance({
    address: address,
  });

  // Get allowance for the contract
  const { data: allowance, isLoading: allowanceLoading } = useReadContract({
    functionName: "allowance",
    address: universalStrkAddress,
    abi: strkAbi as any,
    args: address && deployedContractData?.address 
      ? [address, deployedContractData.address] 
      : undefined,
    watch: true,
  });

  // Write hooks
  const { sendAsync: approveStrk, isPending: isApproving } = useScaffoldWriteContract({
    contractName: "Strk",
    functionName: "approve",
    args: deployedContractData?.address 
      ? [deployedContractData.address, REQUIRED_STRK_IN_FRI] 
      : undefined,
  });

  const { sendAsync: resetCounter, isPending: isResetting } = useScaffoldWriteContract({
    contractName: "CounterContract",
    functionName: "reset_counter",
  });

  const [needsApproval, setNeedsApproval] = useState(false);

  // Check if approval is needed
  const allowanceValue = allowance ? BigInt(allowance.toString()) : 0n;
  const hasEnoughAllowance = allowanceValue >= REQUIRED_STRK_IN_FRI;
  const hasEnoughBalance = strkBalance && strkBalance >= REQUIRED_STRK_IN_FRI;

  const handleApprove = async () => {
    if (!address || !deployedContractData) return;
    try {
      await approveStrk();
      setNeedsApproval(false);
    } catch (error) {
      console.error("Error approving STRK:", error);
    }
  };

  const handleReset = async () => {
    if (!address) return;
    try {
      await resetCounter();
    } catch (error) {
      console.error("Error resetting counter:", error);
    }
  };

  const isLoading = balanceLoading || allowanceLoading;
  const canReset = hasEnoughBalance && hasEnoughAllowance && !isLoading;

  if (isLoading) {
    return (
      <button className="btn btn-warning btn-lg" disabled>
        <span className="loading loading-spinner loading-sm"></span>
        Checking...
      </button>
    );
  }

  if (!hasEnoughBalance) {
    return (
      <div className="tooltip" data-tip="You need at least 1 STRK to reset the counter">
        <button className="btn btn-warning btn-lg" disabled>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          Reset (1 STRK)
        </button>
      </div>
    );
  }

  if (!hasEnoughAllowance) {
    return (
      <button
        className="btn btn-warning btn-lg"
        onClick={handleApprove}
        disabled={isApproving || !address}
      >
        {isApproving ? (
          <>
            <span className="loading loading-spinner loading-sm"></span>
            Approving...
          </>
        ) : (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            Approve 1 STRK
          </>
        )}
      </button>
    );
  }

  return (
    <button
      className="btn btn-warning btn-lg"
      onClick={handleReset}
      disabled={isResetting || !address || counter === 0}
      title={counter === 0 ? "Counter is already at 0" : "Reset counter (costs 1 STRK)"}
    >
      {isResetting ? (
        <>
          <span className="loading loading-spinner loading-sm"></span>
          Resetting...
        </>
      ) : (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
              clipRule="evenodd"
            />
          </svg>
          Reset (1 STRK)
        </>
      )}
    </button>
  );
};

