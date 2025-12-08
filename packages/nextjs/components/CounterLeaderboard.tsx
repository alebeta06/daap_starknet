"use client";

import { useScaffoldEventHistory } from "~~/hooks/scaffold-stark";
import { useMemo } from "react";
import { Address } from "./scaffold-stark";

type LeaderboardEntry = {
  address: string;
  totalInteractions: number;
  increases: number;
  decreases: number;
  resets: number;
  sets: number;
};

export const CounterLeaderboard = () => {
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

  const leaderboard = useMemo(() => {
    if (!events || events.length === 0) {
      return [];
    }

    // Group events by caller address
    const userStats = new Map<string, LeaderboardEntry>();

    events.forEach((event) => {
      const parsedArgs = event.parsedArgs || event.args || {};
      const caller = parsedArgs.caller?.toString();
      
      if (!caller) return;

      // Extract reason safely
      const extractReason = (reasonObj: any): string | undefined => {
        if (!reasonObj) return undefined;
        if (typeof reasonObj === "string") return reasonObj;
        if (typeof reasonObj === "object" && reasonObj.variant) {
          return reasonObj.variant;
        }
        if (typeof reasonObj === "object") {
          const enumKeys = ["Increase", "Decrease", "Reset", "Set"];
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

      if (!userStats.has(caller)) {
        userStats.set(caller, {
          address: caller,
          totalInteractions: 0,
          increases: 0,
          decreases: 0,
          resets: 0,
          sets: 0,
        });
      }

      const stats = userStats.get(caller)!;
      stats.totalInteractions++;

      switch (reason) {
        case "Increase":
          stats.increases++;
          break;
        case "Decrease":
          stats.decreases++;
          break;
        case "Reset":
          stats.resets++;
          break;
        case "Set":
          stats.sets++;
          break;
      }
    });

    // Convert to array and sort by total interactions (descending)
    return Array.from(userStats.values()).sort(
      (a, b) => b.totalInteractions - a.totalInteractions
    );
  }, [events]);

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl">
        <h3 className="text-xl font-bold mb-4">Top Contributors</h3>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="card bg-base-200 shadow-sm border border-base-300"
            >
              <div className="card-body p-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-base-300 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-base-300 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="w-full max-w-4xl">
        <h3 className="text-xl font-bold mb-4">Top Contributors</h3>
        <div className="alert alert-info">
          <span>No interactions yet. Be the first to interact with the counter!</span>
        </div>
      </div>
    );
  }

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return "🥇";
      case 1:
        return "🥈";
      case 2:
        return "🥉";
      default:
        return `#${index + 1}`;
    }
  };

  return (
    <div className="w-full max-w-4xl">
      <h3 className="text-xl font-bold mb-4">Top Contributors</h3>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {leaderboard.slice(0, 10).map((entry, index) => (
          <div
            key={entry.address}
            className="card bg-base-200 shadow-sm border border-base-300 hover:border-primary transition-colors"
          >
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="text-2xl font-bold w-12 text-center">
                    {getRankIcon(index)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Address address={entry.address} format="short" />
                    </div>
                    <div className="flex gap-4 text-xs text-base-content/60">
                      <span>↑ {entry.increases}</span>
                      <span>↓ {entry.decreases}</span>
                      <span>↻ {entry.resets}</span>
                      <span>= {entry.sets}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    {entry.totalInteractions}
                  </div>
                  <div className="text-xs text-base-content/60">
                    {entry.totalInteractions === 1 ? "interaction" : "interactions"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

