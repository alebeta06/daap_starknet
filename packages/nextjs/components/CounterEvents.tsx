"use client";

import { useScaffoldEventHistory } from "~~/hooks/scaffold-stark";
import { useDeployedContractInfo } from "~~/hooks/scaffold-stark";
import { Address } from "~~/components/scaffold-stark";
import { useEffect, useState } from "react";

type ChangeReason = "Increase" | "Decrease" | "Reset" | "Set";

// Helper to extract reason from parsed args (handles both string and object formats)
const extractReason = (reason: any): ChangeReason | undefined => {
  if (!reason) return undefined;
  
  // If it's already a string, return it
  if (typeof reason === "string") {
    return reason as ChangeReason;
  }
  
  // Handle enum format: { Increase: {} } or { variant: "Increase" }
  if (typeof reason === "object") {
    // Check for variant property first
    if (reason.variant && typeof reason.variant === "string") {
      return reason.variant as ChangeReason;
    }
    
    // Handle Cairo enum format: { Increase: {}, Decrease: {}, Reset: {}, Set: {} }
    // In Cairo enums, the active variant is the one with a truthy value
    // We need to find which key has a non-undefined, non-null value
    const enumKeys: ChangeReason[] = ["Increase", "Decrease", "Reset", "Set"];
    
    // First, try to find a key with a truthy value (active variant)
    for (const key of enumKeys) {
      const value = reason[key];
      // Check if the value exists and is not null/undefined
      // For Cairo enums, active variant might be {} or a value
      if (value !== undefined && value !== null) {
        // If it's an empty object {}, that's still the active variant
        if (typeof value === "object" && Object.keys(value).length === 0) {
          return key;
        }
        // If it has any value, it's the active variant
        if (value !== false && value !== 0 && value !== "") {
          return key;
        }
      }
    }
    
    // Fallback: if all keys exist but we need to find the active one
    // Check if it's a CairoCustomEnum-like structure
    const keys = Object.keys(reason);
    if (keys.length > 0) {
      // Find the first key that matches our enum keys
      const validKey = keys.find((key) => enumKeys.includes(key as ChangeReason));
      if (validKey) {
        return validKey as ChangeReason;
      }
    }
  }
  
  return undefined;
};

const getReasonColor = (reason: ChangeReason): string => {
  switch (reason) {
    case "Increase":
      return "badge-success";
    case "Decrease":
      return "badge-warning";
    case "Reset":
      return "badge-error";
    case "Set":
      return "badge-info";
    default:
      return "badge-neutral";
  }
};

const getReasonIcon = (reason: ChangeReason): string => {
  switch (reason) {
    case "Increase":
      return "↑";
    case "Decrease":
      return "↓";
    case "Reset":
      return "↻";
    case "Set":
      return "=";
    default:
      return "•";
  }
};

export const CounterEvents = () => {
  const { data: deployedContractData } = useDeployedContractInfo("CounterContract");
  const [fromBlock, setFromBlock] = useState<bigint>(0n);

  // Start from block 0 to get all events
  // The hook will handle fetching efficiently
  useEffect(() => {
    if (deployedContractData) {
      // Start from the beginning to see all events
      setFromBlock(0n);
    }
  }, [deployedContractData]);

  const {
    data: events,
    isLoading,
    error,
  } = useScaffoldEventHistory({
    contractName: "CounterContract",
    eventName: "CounterChanged",
    fromBlock: fromBlock as bigint,
    watch: true,
    blockData: false,
    transactionData: false,
    receiptData: false,
  });

  if (error) {
    return (
      <div className="alert alert-error">
        <span>Error loading events: {error.message}</span>
      </div>
    );
  }

  // Show only the last 10 events
  const recentEvents = events?.slice(-10) || [];

  return (
    <div className="w-full max-w-2xl">
      <h3 className="text-xl font-bold mb-4">Recent Counter Changes</h3>
      {isLoading && events === undefined ? (
        <div className="flex justify-center py-8">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : recentEvents.length === 0 ? (
        <div className="alert alert-info">
          <span>No events yet. Start interacting with the counter!</span>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {recentEvents.map((event, index) => {
            // Handle different possible formats of parsed args
            const parsedArgs = event.parsedArgs || event.args || {};
            
            // Safely extract reason - ensure it's never an object
            let reason: ChangeReason | undefined;
            try {
              reason = extractReason(parsedArgs.reason);
              // Double check: if reason is still an object, don't use it
              if (reason && typeof reason !== "string") {
                console.warn("Reason is not a string:", reason);
                reason = undefined;
              }
            } catch (error) {
              console.warn("Error extracting reason:", error);
              reason = undefined;
            }
            
            const caller = parsedArgs.caller;
            // Safely extract numeric values
            const oldValue = typeof parsedArgs.old_value === "number" 
              ? parsedArgs.old_value 
              : typeof parsedArgs.old_value === "bigint"
              ? Number(parsedArgs.old_value)
              : undefined;
            const newValue = typeof parsedArgs.new_value === "number"
              ? parsedArgs.new_value
              : typeof parsedArgs.new_value === "bigint"
              ? Number(parsedArgs.new_value)
              : undefined;

            return (
              <div
                key={`${event.log?.transaction_hash || index}-${event.log?.event_index || index}`}
                className="card bg-base-200 shadow-sm border border-base-300"
              >
                <div className="card-body p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {reason && typeof reason === "string" && (
                        <span
                          className={`badge ${getReasonColor(reason)} badge-lg`}
                        >
                          {getReasonIcon(reason)} {reason}
                        </span>
                      )}
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">
                          {oldValue !== undefined && newValue !== undefined
                            ? `${oldValue} → ${newValue}`
                            : "Counter changed"}
                        </span>
                        {caller && (
                          <span className="text-xs text-base-content/60">
                            by <Address address={caller.toString()} format="short" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

