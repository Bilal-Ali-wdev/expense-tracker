"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type SettingsState = {
  carName: string;
  carModel: string;
  petrolPrice: number;
  mileageWithoutAC: number;
  mileageWithAC: number;
  commissionPercentage: number;
};

type RideRecord = {
  id: string;
  createdAt: string;
  deletedAt?: string | null;
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

type CarRecord = {
  id: string;
  name: string;
  model: string;
  imageUrl: string;
  mileageWithoutAC: number;
  mileageWithAC: number;
  createdAt: string;
};

const defaultSettings: SettingsState = {
  carName: "My car",
  carModel: "",
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
  const [editingRideId, setEditingRideId] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<RideRecord | null>(
    null,
  );
  const [recoverCandidate, setRecoverCandidate] = useState<RideRecord | null>(
    null,
  );
  const [showPetrolPrompt, setShowPetrolPrompt] = useState(false);
  const [petrolPromptValue, setPetrolPromptValue] = useState(
    String(defaultSettings.petrolPrice),
  );
  const [cars, setCars] = useState<CarRecord[]>([]);
  const [settingsTab, setSettingsTab] = useState<
    "fuel" | "commission" | "cars"
  >("fuel");
  const [selectedCar, setSelectedCar] = useState<CarRecord | null>(null);
  const [carForm, setCarForm] = useState({
    name: "",
    model: "",
    imageUrl:
      "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=900&q=85",
    mileageWithoutAC: "22",
    mileageWithAC: "17",
  });
  const [saveStatus, setSaveStatus] = useState("");
  const [isExtractingScreenshot, setIsExtractingScreenshot] = useState(false);
  const [screenshotPreview, setScreenshotPreview] = useState("");
  const [extractionError, setExtractionError] = useState("");
  const [request, setRequest] = useState({
    pickupDistance: "1.6",
    customerDistance: "13.2",
    extraDistance: "0",
    acUsed: true,
    ridePrice: "890",
    tip: "0",
    parking: "0",
    toll: "0",
    otherExpense: "0",
  });

  useEffect(() => {
    const promptKey = `indrive-petrol-prompt-${user.username}`;
    if (!sessionStorage.getItem(promptKey)) {
      sessionStorage.setItem(promptKey, "shown");
      setShowPetrolPrompt(true);
    }
  }, [user.username]);

  useEffect(() => {
    let isActive = true;

    const loadData = async () => {
      try {
        const [settingsResponse, ridesResponse, carsResponse] =
          await Promise.all([
            fetch("/api/settings"),
            fetch("/api/rides"),
            fetch("/api/cars"),
          ]);
        const settingsPayload = await settingsResponse.json();
        const ridesPayload = await ridesResponse.json();
        const carsPayload = await carsResponse.json();

        if (!isActive) return;

        if (settingsResponse.ok && settingsPayload.settings) {
          const loadedSettings = {
            ...defaultSettings,
            ...settingsPayload.settings,
          };
          setSettings(loadedSettings);
          setPetrolPromptValue(String(loadedSettings.petrolPrice));
          localStorage.setItem(
            storageKeys.settings,
            JSON.stringify(loadedSettings),
          );
        } else {
          const savedSettings = localStorage.getItem(storageKeys.settings);
          setSettings(
            savedSettings
              ? { ...defaultSettings, ...JSON.parse(savedSettings) }
              : defaultSettings,
          );
          setPetrolPromptValue(
            String(
              savedSettings
                ? JSON.parse(savedSettings).petrolPrice
                : defaultSettings.petrolPrice,
            ),
          );
        }

        if (ridesResponse.ok && Array.isArray(ridesPayload.rides)) {
          setRides(ridesPayload.rides);
          localStorage.setItem(
            storageKeys.rides,
            JSON.stringify(ridesPayload.rides),
          );
        } else {
          const savedRides = localStorage.getItem(storageKeys.rides);
          setRides(savedRides ? JSON.parse(savedRides) : []);
        }

        if (carsResponse.ok && Array.isArray(carsPayload.cars)) {
          setCars(carsPayload.cars);
        }
      } catch {
        const savedSettings = localStorage.getItem(storageKeys.settings);
        const savedRides = localStorage.getItem(storageKeys.rides);

        if (!isActive) return;

        setSettings(
          savedSettings
            ? { ...defaultSettings, ...JSON.parse(savedSettings) }
            : defaultSettings,
        );
        setRides(savedRides ? JSON.parse(savedRides) : []);
      }
    };

    void loadData();

    return () => {
      isActive = false;
    };
  }, [user.username, storageKeys.settings, storageKeys.rides]);

  const activeRides = rides.filter((ride) => !ride.deletedAt);
  const deletedRides = rides.filter((ride) => ride.deletedAt);

  const totals = useMemo(() => {
    const totalRides = activeRides.length;
    const totalRevenue = activeRides.reduce(
      (sum, ride) => sum + ride.ridePrice,
      0,
    );
    const totalTips = activeRides.reduce((sum, ride) => sum + ride.tip, 0);
    const totalCommission = activeRides.reduce(
      (sum, ride) => sum + ride.commissionAmount,
      0,
    );
    const totalFuel = activeRides.reduce((sum, ride) => sum + ride.fuelCost, 0);
    const totalOtherExpenses = activeRides.reduce(
      (sum, ride) => sum + ride.totalOtherExpenses,
      0,
    );
    const totalDistance = activeRides.reduce(
      (sum, ride) => sum + ride.totalDistance,
      0,
    );
    const totalFuelUsed = activeRides.reduce(
      (sum, ride) => sum + ride.fuelUsed,
      0,
    );
    const totalProfit = activeRides.reduce(
      (sum, ride) => sum + ride.netProfit,
      0,
    );

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
  }, [activeRides]);

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
    sessionStorage.removeItem(`indrive-petrol-prompt-${user.username}`);
    await fetch("/api/auth/logout", { method: "POST" });
    router.refresh();
  };

  const handleScreenshotUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const image = event.target.files?.[0];
    event.target.value = "";

    if (!image) return;
    if (!image.type.startsWith("image/")) {
      setExtractionError("Choose a valid image screenshot.");
      return;
    }
    if (image.size > 10 * 1024 * 1024) {
      setExtractionError("Screenshot must be smaller than 10 MB.");
      return;
    }

    setScreenshotPreview(URL.createObjectURL(image));
    setExtractionError("");
    setIsExtractingScreenshot(true);

    try {
      const formData = new FormData();
      formData.append("image", image);
      const response = await fetch("/api/rides/extract", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();

      if (!response.ok || !payload.ride) {
        throw new Error(payload.error || "Could not read this screenshot.");
      }

      setRequest((current) => ({
        ...current,
        pickupDistance: String(payload.ride.pickupDistance),
        customerDistance: String(payload.ride.customerDistance),
        ridePrice: String(payload.ride.ridePrice),
        acUsed: payload.ride.acUsed,
      }));
      setSaveStatus("Screenshot details added to the form");
      window.setTimeout(() => setSaveStatus(""), 2200);
    } catch (error) {
      setExtractionError(
        error instanceof Error
          ? error.message
          : "Could not read this screenshot.",
      );
    } finally {
      setIsExtractingScreenshot(false);
    }
  };

  const handlePetrolPromptSave = async () => {
    const petrolPrice = Number(petrolPromptValue);
    if (!Number.isFinite(petrolPrice) || petrolPrice < 0) return;

    const nextSettings = { ...settings, petrolPrice };
    setSettings(nextSettings);
    localStorage.setItem(storageKeys.settings, JSON.stringify(nextSettings));

    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextSettings),
      });
    } finally {
      setShowPetrolPrompt(false);
    }
  };

  const handleSaveSettings = async () => {
    localStorage.setItem(storageKeys.settings, JSON.stringify(settings));

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!response.ok) throw new Error("Unable to save settings");

      const payload = await response.json();
      if (payload.settings) {
        const savedSettings = { ...defaultSettings, ...payload.settings };
        setSettings(savedSettings);
        localStorage.setItem(
          storageKeys.settings,
          JSON.stringify(savedSettings),
        );
      }
      setSaveStatus("Settings saved to database");
    } catch {
      setSaveStatus("Saved on this device");
    }

    window.setTimeout(() => setSaveStatus(""), 1500);
  };

  const handleCreateCar = async () => {
    if (!carForm.name.trim() || !carForm.model.trim()) {
      setSaveStatus("Car name and model are required");
      window.setTimeout(() => setSaveStatus(""), 1800);
      return;
    }

    try {
      const response = await fetch("/api/cars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...carForm,
          mileageWithoutAC: Number(carForm.mileageWithoutAC),
          mileageWithAC: Number(carForm.mileageWithAC),
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.car)
        throw new Error(payload.error || "Unable to create car");

      setCars((current) => [payload.car, ...current]);
      setSettings((current) => ({
        ...current,
        carName: payload.car.name,
        carModel: payload.car.model,
        mileageWithoutAC: payload.car.mileageWithoutAC,
        mileageWithAC: payload.car.mileageWithAC,
      }));
      setSelectedCar(payload.car);
      setSaveStatus("Car created");
      setCarForm((current) => ({ ...current, name: "", model: "" }));
    } catch (error) {
      setSaveStatus(
        error instanceof Error ? error.message : "Unable to create car",
      );
    }

    window.setTimeout(() => setSaveStatus(""), 1800);
  };

  const handleSelectCar = (car: CarRecord) => {
    setSelectedCar(car);
    setSettings((current) => ({
      ...current,
      carName: car.name,
      carModel: car.model,
      mileageWithoutAC: car.mileageWithoutAC,
      mileageWithAC: car.mileageWithAC,
    }));
    setSettingsTab("cars");
  };

  const handleEditRide = (ride: RideRecord) => {
    setEditingRideId(ride.id);
    setRequest({
      pickupDistance: String(ride.pickupDistance),
      customerDistance: String(ride.customerDistance),
      extraDistance: String(ride.extraDistance),
      acUsed: ride.acUsed,
      ridePrice: String(ride.ridePrice),
      tip: String(ride.tip),
      parking: String(ride.parking),
      toll: String(ride.toll),
      otherExpense: String(ride.otherExpense),
    });
  };

  const handleRideFlag = async (
    ride: RideRecord,
    action: "delete" | "recover",
  ) => {
    try {
      const response = await fetch(`/api/rides/${ride.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.ride)
        throw new Error("Unable to update ride");
      setRides((current) => {
        const updated = current.map((item) =>
          item.id === ride.id ? payload.ride : item,
        );
        localStorage.setItem(storageKeys.rides, JSON.stringify(updated));
        return updated;
      });
    } catch {
      const deletedAt = action === "delete" ? new Date().toISOString() : null;
      setRides((current) => {
        const updated = current.map((item) =>
          item.id === ride.id ? { ...item, deletedAt } : item,
        );
        localStorage.setItem(storageKeys.rides, JSON.stringify(updated));
        return updated;
      });
    }
  };

  const handleSaveRide = async () => {
    const rideToSave = {
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

    try {
      const response = await fetch(
        editingRideId ? `/api/rides/${editingRideId}` : "/api/rides",
        {
          method: editingRideId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            editingRideId ? { ...rideToSave, action: "update" } : rideToSave,
          ),
        },
      );

      if (!response.ok) throw new Error("Unable to save ride");

      const payload = await response.json();
      const updatedRides = payload.ride
        ? editingRideId
          ? rides.map((ride) =>
              ride.id === editingRideId ? payload.ride : ride,
            )
          : [payload.ride, ...rides]
        : rides;
      setRides(updatedRides);
      localStorage.setItem(storageKeys.rides, JSON.stringify(updatedRides));
      setEditingRideId(null);
      setSection("history");
    } catch {
      if (editingRideId) {
        const updatedRides = rides.map((ride) =>
          ride.id === editingRideId
            ? { id: editingRideId, ...rideToSave }
            : ride,
        );
        setRides(updatedRides);
        localStorage.setItem(storageKeys.rides, JSON.stringify(updatedRides));
        setEditingRideId(null);
        setSection("history");
        return;
      }
      const localRide: RideRecord = { id: `${Date.now()}`, ...rideToSave };
      const updatedRides = [localRide, ...rides];
      setRides(updatedRides);
      localStorage.setItem(storageKeys.rides, JSON.stringify(updatedRides));
      setSection("history");
    }
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
        <h2 className="text-lg font-semibold text-white">
          {editingRideId ? "Edit Ride" : "Add Ride"}
        </h2>
        <span className="rounded-full bg-[#d5ff4e]/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#d5ff4e]">
          Live calc
        </span>
      </div>

      <div className="rounded-3xl border border-[#d5ff4e]/25 bg-[#d5ff4e]/10 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <p className="text-sm font-bold text-white">Fill from screenshot</p>
            <p className="mt-1 text-xs leading-5 text-white/50">
              Gemini reads Point A, Point B, fare, and Ride A/C from the
              uploaded image.
            </p>
          </div>
          <label className="cursor-pointer rounded-2xl bg-[#d5ff4e] px-3 py-2 text-xs font-black text-[#101812] hover:bg-[#e2ff82]">
            {isExtractingScreenshot ? "Reading..." : "Upload image"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleScreenshotUpload}
              disabled={isExtractingScreenshot}
              className="sr-only"
            />
          </label>
        </div>
        {screenshotPreview ? (
          <img
            src={screenshotPreview}
            alt="Uploaded ride screenshot"
            className="mt-3 max-h-48 w-full rounded-2xl object-contain"
          />
        ) : null}
        {extractionError ? (
          <p className="mt-3 rounded-xl border border-rose-300/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">
            {extractionError}
          </p>
        ) : null}
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
          <span>Extra travel</span>
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
        {editingRideId ? "Update Ride" : "Save Ride"}
      </button>
      {editingRideId ? (
        <button
          type="button"
          onClick={() => {
            setEditingRideId(null);
            setSection("history");
          }}
          className="w-full rounded-2xl border border-white/15 px-4 py-3 text-sm font-bold text-white/60"
        >
          Cancel edit
        </button>
      ) : null}
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-5 rounded-[30px] border border-white/10 bg-[#111d1a]/90 p-4 shadow-xl shadow-black/10">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Ride History</h2>
        <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">
          {activeRides.length}
        </span>
      </div>

      {activeRides.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 p-4 text-sm text-slate-300">
          No rides saved yet.
        </div>
      ) : (
        activeRides.map((ride) => (
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
            <div className="mt-3 flex gap-2 border-t border-white/10 pt-3">
              <button
                type="button"
                onClick={() => handleEditRide(ride)}
                className="flex-1 rounded-xl border border-white/15 px-3 py-2 text-xs font-bold text-white/70 hover:bg-white/10 hover:text-white"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setDeleteCandidate(ride)}
                className="flex-1 rounded-xl border border-rose-300/30 px-3 py-2 text-xs font-bold text-rose-200 hover:bg-rose-400/10"
              >
                Delete
              </button>
            </div>
          </div>
        ))
      )}

      <div className="border-t border-white/10 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Deleted Items</h3>
            <p className="mt-1 text-xs text-white/40">
              Deleted rides can be recovered for 30 days.
            </p>
          </div>
          <span className="rounded-full bg-rose-400/10 px-2 py-1 text-[10px] font-bold text-rose-200">
            {deletedRides.length}
          </span>
        </div>
        {deletedRides.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/10 p-3 text-xs text-white/35">
            No deleted rides.
          </p>
        ) : (
          <div className="space-y-2">
            {deletedRides.map((ride) => (
              <div
                key={ride.id}
                className="flex items-center justify-between rounded-2xl border border-rose-200/15 bg-rose-200/5 p-3"
              >
                <div>
                  <p className="text-sm font-semibold text-white/75">
                    Rs. {roundMoney(ride.ridePrice)}
                  </p>
                  <p className="mt-1 text-xs text-white/35">
                    Marked deleted{" "}
                    {ride.deletedAt
                      ? new Date(ride.deletedAt).toLocaleDateString()
                      : "recently"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRecoverCandidate(ride)}
                  className="rounded-xl border border-[#d5ff4e]/40 px-3 py-2 text-xs font-bold text-[#d5ff4e] hover:bg-[#d5ff4e]/10"
                >
                  Recover
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-[11px] text-white/30">
          After 30 days, deleted rides may be permanently removed. Automatic
          permanent deletion is not enabled.
        </p>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-5 rounded-[30px] border border-white/10 bg-[#111d1a]/90 p-4 shadow-xl shadow-black/10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d5ff4e]">
            Preferences
          </p>
          <h2 className="mt-1 text-xl font-black text-white">Settings</h2>
        </div>
        <button
          type="button"
          onClick={handleSaveSettings}
          className="rounded-full bg-[#d5ff4e] px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#101812]"
        >
          Save
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-black/20 p-1">
        {[
          ["fuel", "Fuel price"],
          ["commission", "Commission"],
          ["cars", "Cars"],
        ].map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            onClick={() =>
              setSettingsTab(tab as "fuel" | "commission" | "cars")
            }
            className={`rounded-xl px-2 py-2 text-xs font-bold transition ${
              settingsTab === tab
                ? "bg-[#d5ff4e] text-[#101812]"
                : "text-white/50 hover:bg-white/5 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {saveStatus ? (
        <div className="rounded-xl border border-[#d5ff4e]/40 bg-[#d5ff4e]/10 px-3 py-2 text-sm text-[#d5ff4e]">
          {saveStatus}
        </div>
      ) : null}

      {settingsTab === "fuel" ? (
        <div className="space-y-4">
          <div className="rounded-3xl border border-[#d5ff4e]/25 bg-[#d5ff4e]/10 p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#d5ff4e]">
              Current petrol price
            </p>
            <p className="mt-3 text-4xl font-black text-white">
              Rs. {settings.petrolPrice.toFixed(2)}
            </p>
            <p className="mt-1 text-sm text-white/55">Per litre</p>
          </div>
          <label className="block text-sm text-slate-300">
            <span className="mb-1 block">Update petrol price (Rs/L)</span>
            <input
              type="number"
              step="0.01"
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
        </div>
      ) : null}

      {settingsTab === "commission" ? (
        <div className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">
              Platform deduction
            </p>
            <p className="mt-3 text-4xl font-black text-white">
              {settings.commissionPercentage.toFixed(1)}%
            </p>
            <p className="mt-1 text-sm text-white/55">
              Applied to every saved ride
            </p>
          </div>
          <label className="block text-sm text-slate-300">
            <span className="mb-1 block">Update commission percentage</span>
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
      ) : null}

      {settingsTab === "cars" ? (
        <div className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">Create a car</p>
                <p className="mt-1 text-xs text-white/45">
                  Save averages for accurate fuel calculations.
                </p>
              </div>
              <span className="rounded-full bg-[#d5ff4e]/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#d5ff4e]">
                New
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs font-semibold text-white/65">
                <span>Car name</span>
                <input
                  id="car-name"
                  value={carForm.name}
                  onChange={(event) =>
                    setCarForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="space-y-1 text-xs font-semibold text-white/65">
                <span>Car model</span>
                <input
                  id="car-model"
                  value={carForm.model}
                  onChange={(event) =>
                    setCarForm((current) => ({
                      ...current,
                      model: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="space-y-1 text-xs font-semibold text-white/65">
                <span>Average without AC (km/L)</span>
                <input
                  id="car-mileage-without-ac"
                  type="number"
                  min="0"
                  step="0.1"
                  value={carForm.mileageWithoutAC}
                  onChange={(event) =>
                    setCarForm((current) => ({
                      ...current,
                      mileageWithoutAC: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="space-y-1 text-xs font-semibold text-white/65">
                <span>Average with AC (km/L)</span>
                <input
                  id="car-mileage-with-ac"
                  type="number"
                  min="0"
                  step="0.1"
                  value={carForm.mileageWithAC}
                  onChange={(event) =>
                    setCarForm((current) => ({
                      ...current,
                      mileageWithAC: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={handleCreateCar}
              className="mt-3 w-full rounded-2xl bg-[#d5ff4e] px-4 py-3 text-sm font-black text-[#101812]"
            >
              Create car
            </button>
          </div>

          {selectedCar ? (
            <div className="overflow-hidden rounded-3xl border border-[#d5ff4e]/35 bg-[#d5ff4e]/10">
              <img
                src={selectedCar.imageUrl}
                alt={selectedCar.model}
                className="h-40 w-full object-cover"
              />
              <div className="p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d5ff4e]">
                  Selected car
                </p>
                <p className="mt-1 text-xl font-black text-white">
                  {selectedCar.name}
                </p>
                <p className="text-sm text-white/55">
                  {selectedCar.model} · {selectedCar.mileageWithAC} km/L with AC
                </p>
              </div>
            </div>
          ) : null}

          <div className="space-y-3">
            {cars.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/15 p-4 text-sm text-white/45">
                No cars saved yet.
              </p>
            ) : null}
            {cars.map((car) => (
              <div
                key={car.id}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-3"
              >
                <img
                  src={car.imageUrl}
                  alt={car.model}
                  className="h-16 w-20 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-white">{car.name}</p>
                  <p className="truncate text-xs text-white/45">{car.model}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectCar(car)}
                  className="rounded-full border border-[#d5ff4e]/40 px-3 py-2 text-xs font-bold text-[#d5ff4e]"
                >
                  View
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
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
          <div className="flex items-center gap-2">
            <div className="rounded-[8px] border border-[#9fbdad] bg-[#edf6f0]/70 px-3 py-2 text-right">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#668176]">
                Fuel price
              </p>
              <p className="text-xs font-black text-[#17312a]">
                Rs. {settings.petrolPrice.toFixed(2)} /L
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-[8px] border border-[#9fbdad] bg-[#edf6f0]/70 px-3 py-[10px] text-xs font-bold uppercase tracking-[0.12em] text-[#49675b] transition hover:border-[#6d9782] hover:text-[#17312a]"
            >
              Logout
            </button>
          </div>
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

        {showPetrolPrompt ? (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#07100d]/70 px-4 backdrop-blur-sm">
            <div className="relative w-full max-w-md rounded-[30px] border border-white/15 bg-[#13221e] p-6 shadow-2xl shadow-black/40">
              <button
                type="button"
                aria-label="Close petrol price popup"
                onClick={() => setShowPetrolPrompt(false)}
                className="absolute right-4 top-4 rounded-full border border-white/15 px-3 py-1 text-lg leading-none text-white/55 hover:bg-white/10 hover:text-white"
              >
                x
              </button>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#d5ff4e]">
                Daily setup
              </p>
              <h2 className="mt-2 pr-8 text-2xl font-black text-white">
                Today&apos;s petrol price
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/55">
                Enter today&apos;s price so every ride calculation uses the
                correct fuel cost.
              </p>
              <label className="mt-5 block text-sm font-semibold text-white/70">
                Petrol price (Rs/L)
                <input
                  autoFocus
                  type="number"
                  min="0"
                  step="0.01"
                  value={petrolPromptValue}
                  onChange={(event) => setPetrolPromptValue(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/15 bg-black/20 px-4 py-3 text-xl font-bold text-white outline-none focus:border-[#d5ff4e]"
                />
              </label>
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPetrolPrompt(false)}
                  className="flex-1 rounded-2xl border border-white/15 px-4 py-3 text-sm font-bold text-white/65 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handlePetrolPromptSave()}
                  className="flex-1 rounded-2xl bg-[#d5ff4e] px-4 py-3 text-sm font-black text-[#101812]"
                >
                  Save price
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {deleteCandidate ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07100d]/70 px-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-[28px] border border-white/15 bg-[#13221e] p-5 shadow-2xl shadow-black/40">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-200">
                Delete ride
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">
                Delete this ride?
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/55">
                This ride will move to Deleted Items. You can recover it later.
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteCandidate(null)}
                  className="flex-1 rounded-2xl border border-white/15 px-4 py-3 text-sm font-bold text-white/65"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await handleRideFlag(deleteCandidate, "delete");
                    setDeleteCandidate(null);
                  }}
                  className="flex-1 rounded-2xl bg-rose-400 px-4 py-3 text-sm font-black text-[#24100e]"
                >
                  Delete ride
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {recoverCandidate ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07100d]/70 px-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-[28px] border border-white/15 bg-[#13221e] p-5 shadow-2xl shadow-black/40">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d5ff4e]">
                Recover ride
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">
                Recover this ride?
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/55">
                This ride will return to your active Ride History and dashboard
                totals.
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setRecoverCandidate(null)}
                  className="flex-1 rounded-2xl border border-white/15 px-4 py-3 text-sm font-bold text-white/65"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await handleRideFlag(recoverCandidate, "recover");
                    setRecoverCandidate(null);
                  }}
                  className="flex-1 rounded-2xl bg-[#d5ff4e] px-4 py-3 text-sm font-black text-[#101812]"
                >
                  Recover ride
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {editingRideId ? (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-[#07100d]/70 px-4 py-8 backdrop-blur-sm">
            <div className="mx-auto w-full max-w-2xl rounded-[30px] border border-white/15 bg-[#13221e] p-5 shadow-2xl shadow-black/40">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d5ff4e]">
                    Ride details
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-white">
                    Edit ride
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingRideId(null)}
                  className="rounded-full border border-white/15 px-3 py-2 text-xs font-bold text-white/60"
                >
                  Close
                </button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  ["Pickup distance", "pickupDistance"],
                  ["Customer trip", "customerDistance"],
                  ["Extra travel", "extraDistance"],
                  ["Ride price", "ridePrice"],
                  ["Tip", "tip"],
                  ["Parking", "parking"],
                  ["Toll", "toll"],
                  ["Other expense", "otherExpense"],
                ].map(([label, field]) => (
                  <label
                    key={field}
                    className="space-y-1 text-xs font-semibold text-white/65"
                  >
                    <span>{label}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={request[field as keyof typeof request] as string}
                      onChange={(event) =>
                        setRequest((current) => ({
                          ...current,
                          [field]: event.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-[#d5ff4e]"
                    />
                  </label>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                  AC status
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setRequest((current) => ({ ...current, acUsed: true }))
                    }
                    className={`flex-1 rounded-xl border px-3 py-2 text-sm font-bold ${request.acUsed ? "border-[#d5ff4e] bg-[#d5ff4e]/10 text-[#d5ff4e]" : "border-white/10 text-white/50"}`}
                  >
                    AC ON
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setRequest((current) => ({ ...current, acUsed: false }))
                    }
                    className={`flex-1 rounded-xl border px-3 py-2 text-sm font-bold ${!request.acUsed ? "border-[#d5ff4e] bg-[#d5ff4e]/10 text-[#d5ff4e]" : "border-white/10 text-white/50"}`}
                  >
                    AC OFF
                  </button>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-[#d5ff4e]/20 bg-[#d5ff4e]/5 p-4 text-sm text-white/70">
                <div className="flex justify-between">
                  <span>Total distance</span>
                  <strong>{summary.totalDistance.toFixed(1)} km</strong>
                </div>
                <div className="mt-2 flex justify-between">
                  <span>Fuel cost</span>
                  <strong>Rs. {roundMoney(summary.fuelCost)}</strong>
                </div>
                <div className="mt-2 flex justify-between">
                  <span>Net profit</span>
                  <strong className="text-[#d5ff4e]">
                    Rs. {roundMoney(summary.netProfit)}
                  </strong>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void handleSaveRide()}
                className="mt-5 w-full rounded-2xl bg-[#d5ff4e] px-4 py-3 text-sm font-black text-[#101812]"
              >
                Save changes
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
