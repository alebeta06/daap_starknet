"use client";

import { ConnectedAddress } from "~~/components/ConnectedAddress";
import { CounterDisplay } from "~~/components/CounterDisplay";
import { IncreaseCounter } from "~~/components/IncreaseCounter";
import { DecreaseCounter } from "~~/components/DecreaseCounter";
import { ResetCounter } from "~~/components/ResetCounter";
import { SetCounter } from "~~/components/SetCounter";
import { CounterEvents } from "~~/components/CounterEvents";
import { CounterStats } from "~~/components/CounterStats";
import { useScaffoldReadContract } from "~~/hooks/scaffold-stark";
import { useAccount } from "~~/hooks/useAccount";

const Home = () => {
  const { address: connectedAddress } = useAccount();
  
  // Get counter value to pass to DecreaseCounter for validation
  const { data: counterData } = useScaffoldReadContract({
    contractName: "CounterContract",
    functionName: "get_counter",
    watch: true,
  });

  // Get owner address
  const { data: ownerData } = useScaffoldReadContract({
    contractName: "CounterContract",
    functionName: "owner",
    watch: true,
  });

  const counter = counterData ? Number(counterData) : 0;
  const connectedAddressStr = connectedAddress ?? "";
  const ownerAddressStr = ownerData ? ownerData.toString() : "";

  return (
    <div className="flex items-center flex-col grow pt-10">
      <div className="px-5 w-full max-w-4xl">
        <h1 className="text-center mb-8">
          <span className="block text-2xl mb-2">Welcome to</span>
          <span className="block text-4xl font-bold">Counter dApp</span>
        </h1>
        <ConnectedAddress />

        {/* Counter Display */}
        <div className="mt-12 mb-8">
          <CounterDisplay />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 items-center justify-center mb-8 flex-wrap">
          <IncreaseCounter />
          <DecreaseCounter counter={counter} />
          <ResetCounter
            counter={counter}
            connectedAddress={connectedAddressStr}
            ownerAddress={ownerAddressStr}
          />
        </div>

        {/* Set Counter (Owner Only) */}
        {connectedAddressStr && ownerAddressStr && (
          <div className="mb-8">
            <SetCounter
              connectedAddress={connectedAddressStr}
              ownerAddress={ownerAddressStr}
            />
          </div>
        )}

        {/* Statistics */}
        <div className="mb-8">
          <CounterStats />
        </div>

        {/* Events Section */}
        <div className="mt-8">
          <CounterEvents />
        </div>
      </div>
    </div>
  );
};

export default Home;
