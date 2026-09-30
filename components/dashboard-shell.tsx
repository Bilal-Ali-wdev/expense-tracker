"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type SettingsState = {
  petrolPrice: number;
  mileageWithoutAC: number;
  mileageWithAC: number;
  commissionPercentage: number;
};

type RideRecord = {
  id: string;
  createdAt: string;
  pickupDistance: number;
  customerDistance: number;
  extraDistance: number;
  totalDistance: number;
  acUsed: boolean;
  mileageUsed: number;
  petrolPriceAtRide: number;
  fuelUsed: number;
  fuelCost: number;
  ridePrice: number;
  tip: number;
  commissionPercentageAtRide: number;
  commissionAmount: number;
  parking: number;
  toll: number;
  otherExpense: number;
  totalOtherExpenses: number;
  grossRevenue: number;
  netProfit: number;
};

const defaultSettings: SettingsState = {
  petrolPrice: 300,
  mileageWithoutAC: 22,
  mileageWithAC: 17,
  commissionPercentage: 10,
};

function getStorageKeys(username: string) {
  return {
    settings: `indrive-settings-${username}`,
    rides: `indrive-rides-${username}`,
  };
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function calculateTotalDistance(
  pickupDistance: number,
  customerDistance: number,
  extraDistance: number,
) {
  return pickupDistance + customerDistance + extraDistance;
}

function calculateFuelUsed(totalDistance: number, mileage: number) {
  return mileage > 0 ? totalDistance / mileage : 0;
}

function calculateFuelCost(fuelUsed: number, petrolPrice: number) {
  return fuelUsed * petrolPrice;
}

function calculateCommission(ridePrice: number, commissionPercentage: number) {
  return (ridePrice * commissionPercentage) / 100;
}

function calculateNetProfit(
  ridePrice: number,
  tip: number,
  commissionAmount: number,
  fuelCost: number,
  parking: number,
  toll: number,
  otherExpense: number,
) {
  return (
    ridePrice +
    tip -
    commissionAmount -
    fuelCost -
    parking -
    toll -
    otherExpense
  );
}

export function DashboardShell({
  user,
}: {
  user: { username: string; displayName: string };
}) {
  const router = useRouter();
  const storageKeys = getStorageKeys(user.username);
  const [section, setSection] = useState<
    "overview" | "add" | "history" | "settings"
  >("overview");
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [rides, setRides] = useState<RideRecord[]>([]);
  const [saveStatus, setSaveStatus] = useState("");
  const [request, setRequest] = useState({
    pickupDistance: "1.6",
    customerDistance: "13.2",
    extraDistance: "5",
    acUsed: true,
    ridePrice: "890",
    tip: "50",
    parking: "50",
    toll: "0",
    otherExpense: "0",
  });

  useEffect(() => {
    const savedSettings = localStorage.getItem(storageKeys.settings);
    const savedRides = localStorage.getItem(storageKeys.rides);

    if (savedSettings) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
      } catch {
        setSettings(defaultSettings);
      }
    } else {
      setSettings(defaultSettings);
    }

    if (savedRides) {
      try {
        setRides(JSON.parse(savedRides));
      } catch {
        setRides([]);
      }
    } else {
      setRides([]);
    }
  }, [user.username, storageKeys.settings, storageKeys.rides]);

  const totals = useMemo(() => {
    const totalRides = rides.length;
    const totalRevenue = rides.reduce((sum, ride) => sum + ride.ridePrice, 0);
    const totalTips = rides.reduce((sum, ride) => sum + ride.tip, 0);
    const totalCommission = rides.reduce(
      (sum, ride) => sum + ride.commissionAmount,
      0,
    );
    const totalFuel = rides.reduce((sum, ride) => sum + ride.fuelCost, 0);
    const totalOtherExpenses = rides.reduce(
      (sum, ride) => sum + ride.totalOtherExpenses,
      0,
    );
    const totalDistance = rides.reduce(
      (sum, ride) => sum + ride.totalDistance,
      0,
    );
    const totalFuelUsed = rides.reduce((sum, ride) => sum + ride.fuelUsed, 0);
    const totalProfit = rides.reduce((sum, ride) => sum + ride.netProfit, 0);

    return {
      totalRides,
      totalRevenue,
      totalTips,
      totalCommission,
      totalFuel,
      totalOtherExpenses,
      totalDistance,
      totalFuelUsed,
      totalProfit,
    };
  }, [rides]);

  const summary = useMemo(() => {
    const pickupDistance = Number(request.pickupDistance || 0);
    const customerDistance = Number(request.customerDistance || 0);
    const extraDistance = Number(request.extraDistance || 0);
    const ridePrice = Number(request.ridePrice || 0);
    const tip = Number(request.tip || 0);
    const parking = Number(request.parking || 0);
    const toll = Number(request.toll || 0);
    const otherExpense = Number(request.otherExpense || 0);
    const mileage = request.acUsed
      ? settings.mileageWithAC
      : settings.mileageWithoutAC;

    const totalDistance = calculateTotalDistance(
      pickupDistance,
      customerDistance,
      extraDistance,
    );
    const fuelUsed = calculateFuelUsed(totalDistance, mileage);
    const fuelCost = calculateFuelCost(fuelUsed, settings.petrolPrice);
    const commissionAmount = calculateCommission(
      ridePrice,
      settings.commissionPercentage,
    );
    const netProfit = calculateNetProfit(
      ridePrice,
      tip,
      commissionAmount,
      fuelCost,
      parking,
      toll,
      otherExpense,
    );

    return {
      pickupDistance,
      customerDistance,
      extraDistance,
      totalDistance,
      mileage,
      fuelUsed,
      fuelCost,
      commissionAmount,
      grossRevenue: ridePrice + tip,
      netProfit,
      parking,
      toll,
      otherExpense,
      totalOtherExpenses: parking + toll + otherExpense,
    };
  }, [request, settings]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.refresh();
  };

  const handleSaveSettings = () => {
    localStorage.setItem(storageKeys.settings, JSON.stringify(settings));
    setSaveStatus("Settings saved");
    window.setTimeout(() => setSaveStatus(""), 1500);
  };

  const handleSaveRide = () => {
    const newRide: RideRecord = {
      id: `${Date.now()}`,
      createdAt: new Date().toISOString(),
      pickupDistance: summary.pickupDistance,
      customerDistance: summary.customerDistance,
      extraDistance: summary.extraDistance,
      totalDistance: summary.totalDistance,
      acUsed: request.acUsed,
      mileageUsed: summary.mileage,
      petrolPriceAtRide: settings.petrolPrice,
      fuelUsed: summary.fuelUsed,
      fuelCost: summary.fuelCost,
      ridePrice: Number(request.ridePrice || 0),
      tip: Number(request.tip || 0),
      commissionPercentageAtRide: settings.commissionPercentage,
      commissionAmount: summary.commissionAmount,
      parking: summary.parking,
      toll: summary.toll,
      otherExpense: summary.otherExpense,
      totalOtherExpenses: summary.totalOtherExpenses,
      grossRevenue: summary.grossRevenue,
      netProfit: summary.netProfit,
    };

    const updatedRides = [newRide, ...rides];
    setRides(updatedRides);
    localStorage.setItem(storageKeys.rides, JSON.stringify(updatedRides));
    setSection("history");
  };

  const renderOverview = () => (
    <>
      <div className="mb-5 overflow-hidden rounded-[30px] border border-white/10 bg-[#d5ff4e] p-5 text-[#101812] shadow-xl shadow-black/20">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] opacity-60">
              Today at a glance
            </p>
            <p className="mt-3 text-4xl font-black tracking-[-0.06em]">
              Rs. {roundMoney(totals.totalProfit)}
            </p>
            <p className="mt-1 text-sm font-semibold opacity-65">
              Net profit this cycle
            </p>
          </div>
          <div className="rounded-2xl bg-[#101812]/10 px-3 py-2 text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] opacity-60">
              Rides
            </p>
            <p className="mt-1 text-2xl font-black">{totals.totalRides}</p>
          </div>
        </div>
        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[#101812]/10">
          <div className="h-full w-2/3 rounded-full bg-[#101812]/70" />
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-3xl border border-[#b8d2c4] bg-[#edf6f0] p-4 shadow-sm shadow-[#8faf9f]/20">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#5b786c]">
            Revenue
          </p>
          <p className="mt-3 text-xl font-bold text-[#17312a]">
            Rs. {roundMoney(totals.totalRevenue)}
          </p>
          <p className="mt-1 text-xs text-[#668176]">Gross earnings</p>
        </div>
        <div className="rounded-3xl border border-[#b8d2c4] bg-[#edf6f0] p-4 shadow-sm shadow-[#8faf9f]/20">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#5b786c]">
            Distance
          </p>
          <p className="mt-3 text-xl font-bold text-[#17312a]">
            {totals.totalDistance.toFixed(1)} km
          </p>
          <p className="mt-1 text-xs text-[#668176]">Total driven</p>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 text-sm text-[#17312a]">
        <div className="rounded-2xl border border-[#b8d2c4] bg-[#c8ded2] p-3">
          <div className="text-[#5b786c]">Tips</div>
          <div className="mt-1 font-semibold">
            Rs. {roundMoney(totals.totalTips)}
          </div>
        </div>
        <div className="rounded-2xl border border-[#b8d2c4] bg-[#c8ded2] p-3">
          <div className="text-[#5b786c]">Commission</div>
          <div className="mt-1 font-semibold">
            Rs. {roundMoney(totals.totalCommission)}
          </div>
        </div>
        <div className="rounded-2xl border border-[#b8d2c4] bg-[#c8ded2] p-3">
          <div className="text-[#5b786c]">Fuel</div>
          <div className="mt-1 font-semibold">
            Rs. {roundMoney(totals.totalFuel)}
          </div>
        </div>
        <div className="rounded-2xl border border-[#b8d2c4] bg-[#c8ded2] p-3">
          <div className="text-[#5b786c]">Fuel used</div>
          <div className="mt-1 font-semibold">
            {totals.totalFuelUsed.toFixed(2)} L
          </div>
        </div>
      </div>
    </>
  );

  const renderAddRide = () => (
    <div className="space-y-4 rounded-[30px] border border-white/10 bg-[#111d1a]/90 p-4 shadow-xl shadow-black/10">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Add Ride</h2>
        <span className="rounded-full bg-[#d5ff4e]/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#d5ff4e]">
          Live calc
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1 text-sm text-slate-300">
          <span>Pickup</span>
          <input
            type="number"
            step="0.1"
            min="0"
            value={request.pickupDistance}
            onChange={(event) =>
              setRequest((current) => ({
                ...current,
                pickupDistance: event.target.value,
              }))
            }
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-white outline-none ring-0 focus:border-[#d5ff4e]"
          />
        </label>
        <label className="space-y-1 text-sm text-slate-300">
          <span>Customer trip</span>
          <input
            type="number"
            step="0.1"
            min="0"
            value={request.customerDistance}
            onChange={(event) =>
              setRequest((current) => ({
                ...current,
                customerDistance: event.target.value,
              }))
            }
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-white outline-none ring-0 focus:border-[#d5ff4e]"
          />
        </label>
        <label className="space-y-1 text-sm text-slate-300">
          <span>Extra distance</span>
          <input
            type="number"
            step="0.1"
            min="0"
            value={request.extraDistance}
            onChange={(event) =>
              setRequest((current) => ({
                ...current,
                extraDistance: event.target.value,
              }))
            }
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-white outline-none ring-0 focus:border-[#d5ff4e]"
          />
        </label>
        <label className="space-y-1 text-sm text-slate-300">
          <span>Ride price</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={request.ridePrice}
            onChange={(event) =>
              setRequest((current) => ({
                ...current,
                ridePrice: event.target.value,
              }))
            }
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-white outline-none ring-0 focus:border-[#d5ff4e]"
          />
        </label>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
        <div className="mb-2 text-sm text-slate-300">AC status</div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() =>
              setRequest((current) => ({ ...current, acUsed: true }))
            }
            className={`flex-1 rounded-2xl border px-3 py-2 text-sm font-medium ${
              request.acUsed
                ? "border-[#d5ff4e] bg-[#d5ff4e]/10 text-[#d5ff4e]"
                : "border-white/10 bg-white/5 text-white/55"
            }`}
          >
            AC ON
          </button>
          <button
            type="button"
            onClick={() =>
              setRequest((current) => ({ ...current, acUsed: false }))
            }
            className={`flex-1 rounded-2xl border px-3 py-2 text-sm font-medium ${
              !request.acUsed
                ? "border-[#d5ff4e] bg-[#d5ff4e]/10 text-[#d5ff4e]"
                : "border-white/10 bg-white/5 text-white/55"
            }`}
          >
            AC OFF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1 text-sm text-slate-300">
          <span>Tip</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={request.tip}
            onChange={(event) =>
              setRequest((current) => ({ ...current, tip: event.target.value }))
            }
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none ring-0"
          />
        </label>
        <label className="space-y-1 text-sm text-slate-300">
          <span>Parking</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={request.parking}
            onChange={(event) =>
              setRequest((current) => ({
                ...current,
                parking: event.target.value,
              }))
            }
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none ring-0"
          />
        </label>
        <label className="space-y-1 text-sm text-slate-300">
          <span>Toll</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={request.toll}
            onChange={(event) =>
              setRequest((current) => ({
                ...current,
                toll: event.target.value,
              }))
            }
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none ring-0"
          />
        </label>
        <label className="space-y-1 text-sm text-slate-300">
          <span>Other</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={request.otherExpense}
            onChange={(event) =>
              setRequest((current) => ({
                ...current,
                otherExpense: event.target.value,
              }))
            }
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none ring-0"
          />
        </label>
      </div>

      <div className="rounded-2xl border border-[#d5ff4e]/20 bg-[#d5ff4e]/5 p-3">
        <div className="mb-2 text-sm font-medium text-[#d5ff4e]">
          Ride Summary
        </div>
        <div className="space-y-2 text-sm text-slate-200">
          <div className="flex items-center justify-between">
            <span>Total distance</span>
            <strong>{summary.totalDistance.toFixed(1)} km</strong>
          </div>
          <div className="flex items-center justify-between">
            <span>Fuel used</span>
            <strong>{summary.fuelUsed.toFixed(3)} L</strong>
          </div>
          <div className="flex items-center justify-between">
            <span>Fuel cost</span>
            <strong>Rs. {roundMoney(summary.fuelCost)}</strong>
          </div>
          <div className="flex items-center justify-between">
            <span>Commission</span>
            <strong>Rs. {roundMoney(summary.commissionAmount)}</strong>
          </div>
          <div className="flex items-center justify-between">
            <span>Net profit</span>
            <strong className="text-[#d5ff4e]">
              Rs. {roundMoney(summary.netProfit)}
            </strong>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSaveRide}
        className="w-full rounded-2xl bg-[#d5ff4e] px-4 py-3 text-base font-black text-[#101812] transition hover:bg-[#e2ff82]"
      >
        Save Ride
      </button>
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-3 rounded-[30px] border border-white/10 bg-[#111d1a]/90 p-4 shadow-xl shadow-black/10">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Ride History</h2>
        <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">
          {rides.length}
        </span>
      </div>

      {rides.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 p-4 text-sm text-slate-300">
          No rides saved yet.
        </div>
      ) : (
        rides.map((ride) => (
          <div
            key={ride.id}
            className="rounded-2xl border border-white/10 bg-black/20 p-3"
          >
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>{new Date(ride.createdAt).toLocaleDateString()}</span>
              <span className="font-semibold text-[#d5ff4e]">
                Rs. {roundMoney(ride.netProfit)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm text-slate-200">
              <span>Ride price</span>
              <strong>Rs. {roundMoney(ride.ridePrice)}</strong>
            </div>
            <div className="mt-1 flex items-center justify-between text-sm text-slate-200">
              <span>Distance</span>
              <strong>{ride.totalDistance.toFixed(1)} km</strong>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-4 rounded-[30px] border border-white/10 bg-[#111d1a]/90 p-4 shadow-xl shadow-black/10">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Settings</h2>
        <button
          type="button"
          onClick={handleSaveSettings}
          className="rounded-full bg-[#d5ff4e] px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#101812]"
        >
          Save
        </button>
      </div>

      {saveStatus ? (
        <div className="rounded-xl border border-[#d5ff4e]/40 bg-[#d5ff4e]/10 px-3 py-2 text-sm text-[#d5ff4e]">
          {saveStatus}
        </div>
      ) : null}

      <div className="space-y-3">
        <label className="block text-sm text-slate-300">
          <span className="mb-1 block">Petrol price (Rs/L)</span>
          <input
            type="number"
            step="1"
            min="0"
            value={settings.petrolPrice}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                petrolPrice: Number(event.target.value) || 0,
              }))
            }
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          />
        </label>
        <label className="block text-sm text-slate-300">
          <span className="mb-1 block">Mileage without AC</span>
          <input
            type="number"
            step="0.1"
            min="0"
            value={settings.mileageWithoutAC}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                mileageWithoutAC: Number(event.target.value) || 0,
              }))
            }
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          />
        </label>
        <label className="block text-sm text-slate-300">
          <span className="mb-1 block">Mileage with AC</span>
          <input
            type="number"
            step="0.1"
            min="0"
            value={settings.mileageWithAC}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                mileageWithAC: Number(event.target.value) || 0,
              }))
            }
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          />
        </label>
        <label className="block text-sm text-slate-300">
          <span className="mb-1 block">InDrive commission %</span>
          <input
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={settings.commissionPercentage}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                commissionPercentage: Number(event.target.value) || 0,
              }))
            }
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          />
        </label>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen px-4 py-5 text-[#17312a] sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between border-b border-[#a8c6b6] pb-5">
          <div className="flex items-center gap-3">
            <img
              src="/indrive-favicon.png"
              alt="InDrive"
              className="h-12 w-12 rounded-2xl object-cover shadow-lg shadow-black/20"
            />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#56756a]">
                InDrive tracker
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-[-0.05em] text-[#17312a]">
                Hey, {user.displayName}
              </h1>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full border border-[#9fbdad] bg-[#edf6f0]/70 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#49675b] transition hover:border-[#6d9782] hover:text-[#17312a]"
          >
            Logout
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
          <div>
            <div className="mb-5 flex items-end justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#5b786c]">
                  Your workspace
                </p>
                <h2 className="mt-1 text-3xl font-black tracking-[-0.05em] text-[#17312a]">
                  {section === "overview"
                    ? "Daily overview"
                    : section === "add"
                      ? "Log a ride"
                      : section === "history"
                        ? "Ride history"
                        : "Preferences"}
                </h2>
              </div>
              <span className="hidden rounded-full border border-[#b8d2c4] bg-[#edf6f0] px-3 py-1 text-xs text-[#668176] sm:block">
                {user.username}
              </span>
            </div>
            {section === "overview" && renderOverview()}
            {section === "add" && renderAddRide()}
            {section === "history" && renderHistory()}
            {section === "settings" && renderSettings()}
          </div>

          <nav className="rounded-[30px] border border-white/10 bg-[#111d1a]/90 p-2 shadow-xl shadow-black/10 lg:sticky lg:top-6">
            <div className="mb-2 flex items-center justify-between px-3 py-2">
              <h2 className="text-sm font-bold text-white">Quick actions</h2>
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/30">
                Menu
              </span>
            </div>

            <button
              type="button"
              onClick={() => setSection("overview")}
              className={`w-full rounded-2xl px-3 py-3 text-left text-sm font-semibold transition ${
                section === "overview"
                  ? "bg-[#d5ff4e] text-[#101812]"
                  : "text-white/55 hover:bg-white/5 hover:text-white"
              }`}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setSection("add")}
              className={`w-full rounded-2xl px-3 py-3 text-left text-sm font-semibold transition ${
                section === "add"
                  ? "bg-[#d5ff4e] text-[#101812]"
                  : "text-white/55 hover:bg-white/5 hover:text-white"
              }`}
            >
              Add Ride
            </button>
            <button
              type="button"
              onClick={() => setSection("history")}
              className={`w-full rounded-2xl px-3 py-3 text-left text-sm font-semibold transition ${
                section === "history"
                  ? "bg-[#d5ff4e] text-[#101812]"
                  : "text-white/55 hover:bg-white/5 hover:text-white"
              }`}
            >
              Ride History
            </button>
            <button
              type="button"
              onClick={() => setSection("settings")}
              className={`w-full rounded-2xl px-3 py-3 text-left text-sm font-semibold transition ${
                section === "settings"
                  ? "bg-[#d5ff4e] text-[#101812]"
                  : "text-white/55 hover:bg-white/5 hover:text-white"
              }`}
            >
              Settings
            </button>
          </nav>
        </div>
      </div>
    </main>
  );
}
