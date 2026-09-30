import { NextResponse } from "next/server";

import { connectDb } from "@/lib/db";
import { readSession } from "@/lib/session";
import { DriverSettingsModel } from "@/models/DriverSettings";

const defaultSettings = {
  carName: "My car",
  carModel: "",
  petrolPrice: 300,
  mileageWithoutAC: 22,
  mileageWithAC: 17,
  commissionPercentage: 10,
};

function responseSettings(settings: Record<string, unknown>) {
  return {
    id: String(settings._id),
    carName: settings.carName,
    carModel: settings.carModel,
    petrolPrice: settings.petrolPrice,
    mileageWithoutAC: settings.mileageWithoutAC,
    mileageWithAC: settings.mileageWithAC,
    commissionPercentage: settings.commissionPercentage,
  };
}

export async function GET() {
  const session = await readSession();

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    await connectDb();
    const settings = await DriverSettingsModel.findOneAndUpdate(
      { userId: session.userId },
      {
        $setOnInsert: {
          ...defaultSettings,
          userId: session.userId,
          username: session.username,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();

    return NextResponse.json({ settings: responseSettings(settings) });
  } catch (error) {
    console.error("Settings fetch failed:", error);
    return NextResponse.json(
      { error: "Unable to load settings." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const session = await readSession();

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const values = {
      carName: String(body.carName || "My car")
        .trim()
        .slice(0, 80),
      carModel: String(body.carModel || "")
        .trim()
        .slice(0, 80),
      petrolPrice: Number(body.petrolPrice),
      mileageWithoutAC: Number(body.mileageWithoutAC),
      mileageWithAC: Number(body.mileageWithAC),
      commissionPercentage: Number(body.commissionPercentage),
    };

    if (
      !Number.isFinite(values.petrolPrice) ||
      values.petrolPrice < 0 ||
      !Number.isFinite(values.mileageWithoutAC) ||
      values.mileageWithoutAC < 0 ||
      !Number.isFinite(values.mileageWithAC) ||
      values.mileageWithAC < 0 ||
      !Number.isFinite(values.commissionPercentage) ||
      values.commissionPercentage < 0 ||
      values.commissionPercentage > 100
    ) {
      return NextResponse.json(
        { error: "Enter valid settings values." },
        { status: 400 },
      );
    }

    await connectDb();
    const settings = await DriverSettingsModel.findOneAndUpdate(
      { userId: session.userId },
      { $set: { ...values, username: session.username } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();

    return NextResponse.json({ settings: responseSettings(settings) });
  } catch (error) {
    console.error("Settings save failed:", error);
    return NextResponse.json(
      { error: "Unable to save settings." },
      { status: 500 },
    );
  }
}
