"use client";

import { useScaffoldEventHistory } from "~~/hooks/scaffold-stark";
import { useScaffoldReadContract } from "~~/hooks/scaffold-stark";
import { useMemo } from "react";

export const CounterAnalytics = () => {
  const { data: counterData } = useScaffoldReadContract({
    contractName: "CounterContract",
    functionName: "get_counter",
    watch: true,
  });

  const {
    data: events,
    isLoading,
  } = useScaffoldEventHistory({
    contractName: "CounterContract",
    eventName: "CounterChanged",
    fromBlock: 0n,
    watch: true,
    blockData: false,
    transactionData: false,
    receiptData: false,
  });

  const analytics = useMemo(() => {
    if (!events || events.length === 0) {
      return {
        totalChanges: 0,
        increases: 0,
        decreases: 0,
        resets: 0,
        sets: 0,
        increasePercentage: 0,
        decreasePercentage: 0,
        resetPercentage: 0,
        setPercentage: 0,
        averagePerUser: 0,
        uniqueUsers: 0,
        counterEvolution: [] as { value: number; index: number }[],
      };
    }

    let increases = 0;
    let decreases = 0;
    let resets = 0;
    let sets = 0;
    const uniqueUsers = new Set<string>();
    const counterEvolution: { value: number; index: number }[] = [];

    // Process events in chronological order to track counter evolution
    const sortedEvents = [...events].reverse(); // Reverse to get chronological order
    let currentValue = 0;

    sortedEvents.forEach((event, index) => {
      const parsedArgs = event.parsedArgs || event.args || {};
      const caller = parsedArgs.caller?.toString();
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

      if (caller) uniqueUsers.add(caller);

      // Extract reason safely
      const extractReason = (reasonObj: any): string | undefined => {
        if (!reasonObj) return undefined;
        if (typeof reasonObj === "string") return reasonObj;
        if (typeof reasonObj === "object" && reasonObj.variant) {
          return reasonObj.variant;
        }
        if (typeof reasonObj === "object") {
          const enumKeys = ["Increase", "Decrease", "Reset", "Set"];
          
          // First, check all keys to see which ones exist
          const existingKeys = enumKeys.filter(key => reasonObj.hasOwnProperty(key));
          
          // If only one key exists, that's the active variant
          if (existingKeys.length === 1) {
            return existingKeys[0];
          }
          
          // Otherwise, find the key with a truthy value (active variant)
          for (const key of enumKeys) {
            const value = reasonObj[key];
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

      const reason = extractReason(parsedArgs.reason);

      switch (reason) {
        case "Increase":
          increases++;
          currentValue = typeof newValue === "number" ? newValue : currentValue + 1;
          break;
        case "Decrease":
          decreases++;
          currentValue = typeof newValue === "number" ? newValue : currentValue - 1;
          break;
        case "Reset":
          resets++;
          currentValue = 0;
          break;
        case "Set":
          sets++;
          currentValue = typeof newValue === "number" ? newValue : currentValue;
          break;
        default:
          // If reason is undefined, try to infer from value changes
          if (typeof oldValue === "number" && typeof newValue === "number") {
            // Check if it's a Set operation (value changed but not by +1, -1, or to 0)
            const isIncrease = newValue === oldValue + 1;
            const isDecrease = newValue === oldValue - 1;
            const isReset = newValue === 0 && oldValue !== 0;
            const isSet = !isIncrease && !isDecrease && !isReset && newValue !== oldValue;
            
            if (isSet) {
              sets++;
              currentValue = newValue;
            } else if (isIncrease) {
              increases++;
              currentValue = newValue;
            } else if (isDecrease) {
              decreases++;
              currentValue = newValue;
            } else if (isReset) {
              resets++;
              currentValue = 0;
            }
          }
          break;
      }

      // Track counter value at this point
      if (typeof newValue === "number") {
        counterEvolution.push({ value: newValue, index });
      } else {
        counterEvolution.push({ value: currentValue, index });
      }
    });

    const totalChanges = events.length;
    const total = increases + decreases + resets + sets;

    return {
      totalChanges,
      increases,
      decreases,
      resets,
      sets,
      increasePercentage: total > 0 ? (increases / total) * 100 : 0,
      decreasePercentage: total > 0 ? (decreases / total) * 100 : 0,
      resetPercentage: total > 0 ? (resets / total) * 100 : 0,
      setPercentage: total > 0 ? (sets / total) * 100 : 0,
      averagePerUser: uniqueUsers.size > 0 ? totalChanges / uniqueUsers.size : 0,
      uniqueUsers: uniqueUsers.size,
      counterEvolution: counterEvolution.slice(-20), // Last 20 data points
    };
  }, [events]);

  const currentCounter = counterData ? Number(counterData) : 0;

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl">
        <h3 className="text-xl font-bold mb-4">Counter Analytics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card bg-base-200 shadow-sm border border-base-300">
              <div className="card-body p-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-base-300 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-base-300 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl">
      <h3 className="text-xl font-bold mb-4">Counter Analytics</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Current Counter Value */}
        <div className="card bg-base-200 shadow-lg border border-primary">
          <div className="card-body p-6">
            <div className="text-sm text-base-content/60 mb-2">Current Value</div>
            <div className="text-4xl font-bold text-primary">{currentCounter}</div>
          </div>
        </div>

        {/* Average Interactions per User */}
        <div className="card bg-base-200 shadow-lg border border-base-300">
          <div className="card-body p-6">
            <div className="text-sm text-base-content/60 mb-2">Avg per User</div>
            <div className="text-4xl font-bold">
              {analytics.averagePerUser.toFixed(1)}
            </div>
            <div className="text-xs text-base-content/60 mt-1">
              {analytics.uniqueUsers} unique {analytics.uniqueUsers === 1 ? "user" : "users"}
            </div>
          </div>
        </div>
      </div>

      {/* Distribution Chart */}
      <div className="card bg-base-200 shadow-lg border border-base-300 mb-6">
        <div className="card-body p-6">
          <h4 className="text-lg font-semibold mb-4">Action Distribution</h4>
          
          <div className="space-y-4">
            {/* Increase */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-success">↑ Increases</span>
                <span className="font-semibold">
                  {analytics.increases} ({analytics.increasePercentage.toFixed(1)}%)
                </span>
              </div>
              <progress
                className="progress progress-success w-full"
                value={analytics.increasePercentage}
                max="100"
              ></progress>
            </div>

            {/* Decrease */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-warning">↓ Decreases</span>
                <span className="font-semibold">
                  {analytics.decreases} ({analytics.decreasePercentage.toFixed(1)}%)
                </span>
              </div>
              <progress
                className="progress progress-warning w-full"
                value={analytics.decreasePercentage}
                max="100"
              ></progress>
            </div>

            {/* Reset */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-error">↻ Resets</span>
                <span className="font-semibold">
                  {analytics.resets} ({analytics.resetPercentage.toFixed(1)}%)
                </span>
              </div>
              <progress
                className="progress progress-error w-full"
                value={analytics.resetPercentage}
                max="100"
              ></progress>
            </div>

            {/* Set */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-info">= Sets</span>
                <span className="font-semibold">
                  {analytics.sets} ({analytics.setPercentage.toFixed(1)}%)
                </span>
              </div>
              <progress
                className="progress progress-info w-full"
                value={analytics.setPercentage}
                max="100"
              ></progress>
            </div>
          </div>
        </div>
      </div>

      {/* Counter Evolution (Simple visualization) */}
      {analytics.counterEvolution.length > 0 && (
        <div className="card bg-base-200 shadow-lg border border-base-300">
          <div className="card-body p-6">
            <h4 className="text-lg font-semibold mb-4">Counter Evolution (Last 20 Changes)</h4>
            <div className="flex items-end gap-1 h-32 overflow-x-auto pb-2">
              {analytics.counterEvolution.map((point, index) => {
                const maxValue = Math.max(...analytics.counterEvolution.map((p) => p.value), 1);
                const height = (point.value / maxValue) * 100;
                return (
                  <div
                    key={index}
                    className="flex-1 min-w-[8px] bg-primary rounded-t hover:bg-primary-focus transition-colors"
                    style={{ height: `${Math.max(height, 5)}%` }}
                    title={`Value: ${point.value}`}
                  ></div>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-base-content/60 mt-2">
              <span>Oldest</span>
              <span>Newest</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

