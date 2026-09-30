import { NextResponse } from "next/server";

import { connectDb } from "@/lib/db";
import { readSession } from "@/lib/session";
import { RideModel } from "@/models/Ride";

const numericFields = [
  "pickupDistance",
  "customerDistance",
  "extraDistance",
  "totalDistance",
  "mileageUsed",
  "petrolPriceAtRide",
  "fuelUsed",
  "fuelCost",
  "ridePrice",
  "tip",
  "commissionPercentageAtRide",
  "commissionAmount",
  "parking",
  "toll",
  "otherExpense",
  "totalOtherExpenses",
  "grossRevenue",
  "netProfit",
] as const;

function normalizeRide(body: Record<string, unknown>) {
  const ride = Object.fromEntries(
    numericFields.map((field) => [field, Number(body[field])]),
  ) as Record<string, number>;

  if (
    numericFields.some(
      (field) => !Number.isFinite(ride[field]) || ride[field] < 0,
    ) ||
    ride.netProfit === undefined
  ) {
    return null;
  }

  return { ...ride, acUsed: Boolean(body.acUsed) };
}

function responseRide(ride: Record<string, unknown>) {
  return {
    id: String(ride._id),
    createdAt: ride.createdAt,
    ...Object.fromEntries(numericFields.map((field) => [field, ride[field]])),
    acUsed: ride.acUsed,
  };
}

export async function GET() {
  const session = await readSession();

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    await connectDb();
    const rides = await RideModel.find({ userId: session.userId })
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json({ rides: rides.map(responseRide) });
  } catch (error) {
    console.error("Rides fetch failed:", error);
    return NextResponse.json(
      { error: "Unable to load rides." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await readSession();

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const ride = normalizeRide(body);

    if (!ride) {
      return NextResponse.json(
        { error: "Enter valid ride values." },
        { status: 400 },
      );
    }

    await connectDb();
    const savedRide = await RideModel.create({
      ...ride,
      userId: session.userId,
      username: session.username,
    });

    return NextResponse.json(
      { ride: responseRide(savedRide.toObject()) },
      { status: 201 },
    );
  } catch (error) {
    console.error("Ride save failed:", error);
    return NextResponse.json(
      { error: "Unable to save ride." },
      { status: 500 },
    );
  }
}
