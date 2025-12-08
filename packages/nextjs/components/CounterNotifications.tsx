"use client";

import { useScaffoldWatchContractEvent } from "~~/hooks/scaffold-stark";
import { useAccount } from "~~/hooks/useAccount";
import { notification } from "~~/utils/scaffold-stark/notification";
import { useEffect, useRef } from "react";
import { Address } from "./scaffold-stark";

type ChangeReason = "Increase" | "Decrease" | "Reset" | "Set";

// Helper to extract reason from parsed args
const extractReason = (reason: any): ChangeReason | undefined => {
  if (!reason) return undefined;
  if (typeof reason === "string") return reason as ChangeReason;
  if (typeof reason === "object" && reason.variant) {
    return reason.variant as ChangeReason;
  }
  if (typeof reason === "object") {
    // Handle Cairo enum format: { Increase: {}, Decrease: {}, Reset: {}, Set: {} }
    // Find which key has a truthy value (active variant)
    const enumKeys: ChangeReason[] = ["Increase", "Decrease", "Reset", "Set"];
    for (const key of enumKeys) {
      const value = reason[key];
      if (value !== undefined && value !== null) {
        if (typeof value === "object" && Object.keys(value).length === 0) {
          return key;
        }
        if (value !== false && value !== 0 && value !== "") {
          return key;
        }
      }
    }
  }
  return undefined;
};

const getReasonEmoji = (reason: ChangeReason): string => {
  switch (reason) {
    case "Increase":
      return "📈";
    case "Decrease":
      return "📉";
    case "Reset":
      return "🔄";
    case "Set":
      return "⚙️";
    default:
      return "📊";
  }
};

const getReasonColor = (reason: ChangeReason): "success" | "warning" | "error" | "info" => {
  switch (reason) {
    case "Increase":
      return "success";
    case "Decrease":
      return "warning";
    case "Reset":
      return "error";
    case "Set":
      return "info";
    default:
      return "info";
  }
};

export const CounterNotifications = () => {
  const { address: connectedAddress } = useAccount();
  const processedEventsRef = useRef<Set<string>>(new Set());

  useScaffoldWatchContractEvent({
    contractName: "CounterContract",
    eventName: "CounterChanged",
    onLogs: (logs) => {
      // Handle both array and single event object
      const eventsArray = Array.isArray(logs) ? logs : [logs];
      
      eventsArray.forEach((log) => {
        // Create unique ID for this event
        const eventId = `${log.log?.transaction_hash || ""}-${log.log?.event_index || ""}`;
        
        // Skip if we've already processed this event
        if (processedEventsRef.current.has(eventId)) {
          return;
        }
        processedEventsRef.current.add(eventId);

        // Extract event data
        const parsedArgs = log.parsedArgs || log.args || {};
        const reason = extractReason(parsedArgs.reason);
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

        // Skip if it's our own transaction (to avoid duplicate notifications)
        if (connectedAddress && caller?.toString().toLowerCase() === connectedAddress.toLowerCase()) {
          return;
        }

        // Ensure reason is a string before rendering
        if (reason && typeof reason === "string") {
          const emoji = getReasonEmoji(reason);
          const status = getReasonColor(reason);
          
          const callerAddress = caller?.toString() || "Unknown";
          const valueChange = 
            oldValue !== undefined && newValue !== undefined
              ? `${oldValue} → ${newValue}`
              : "counter changed";

          const notificationContent = (
            <div className="flex flex-col gap-1">
              <div className="font-semibold">
                {emoji} Counter {reason}
              </div>
              <div className="text-sm">
                {valueChange}
              </div>
              <div className="text-xs text-base-content/60">
                by <Address address={callerAddress} format="short" />
              </div>
            </div>
          );

          notification[status](notificationContent, {
            duration: 4000,
          });
        }
      });
    },
  });

  // Clean up old event IDs periodically to prevent memory leak
  useEffect(() => {
    const interval = setInterval(() => {
      if (processedEventsRef.current.size > 100) {
        processedEventsRef.current.clear();
      }
    }, 60000); // Clear every minute if too many events

    return () => clearInterval(interval);
  }, []);

  // This component doesn't render anything, it just handles notifications
  return null;
};

