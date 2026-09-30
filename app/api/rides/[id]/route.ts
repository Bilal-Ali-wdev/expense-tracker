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

function responseRide(value: unknown) {
  const ride = value as Record<string, unknown>;

  return {
    id: String(ride._id),
    createdAt: ride.createdAt,
    deletedAt: ride.deletedAt || null,
    ...Object.fromEntries(numericFields.map((field) => [field, ride[field]])),
    acUsed: ride.acUsed,
  };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await readSession();

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action || "");

    await connectDb();

    if (action === "delete") {
      const ride = await RideModel.findOneAndUpdate(
        { _id: id, userId: session.userId },
        { $set: { deletedAt: new Date() } },
        { new: true },
      ).lean();

      if (!ride)
        return NextResponse.json({ error: "Ride not found." }, { status: 404 });
      return NextResponse.json({ ride: responseRide(ride) });
    }

    if (action === "recover") {
      const ride = await RideModel.findOneAndUpdate(
        { _id: id, userId: session.userId },
        { $set: { deletedAt: null } },
        { new: true },
      ).lean();

      if (!ride)
        return NextResponse.json({ error: "Ride not found." }, { status: 404 });
      return NextResponse.json({ ride: responseRide(ride) });
    }

    if (action === "update") {
      const updates = Object.fromEntries(
        numericFields.map((field) => [field, Number(body[field])]),
      ) as Record<string, number>;

      if (
        numericFields.some(
          (field) =>
            !Number.isFinite(updates[field]) ||
            (field !== "netProfit" && updates[field] < 0),
        )
      ) {
        return NextResponse.json(
          { error: "Enter valid ride values." },
          { status: 400 },
        );
      }

      const ride = await RideModel.findOneAndUpdate(
        { _id: id, userId: session.userId },
        { $set: { ...updates, acUsed: Boolean(body.acUsed) } },
        { new: true, runValidators: true },
      ).lean();

      if (!ride)
        return NextResponse.json({ error: "Ride not found." }, { status: 404 });
      return NextResponse.json({ ride: responseRide(ride) });
    }

    return NextResponse.json(
      { error: "Unsupported ride action." },
      { status: 400 },
    );
  } catch (error) {
    console.error("Ride update failed:", error);
    return NextResponse.json(
      { error: "Unable to update ride." },
      { status: 500 },
    );
  }
}
