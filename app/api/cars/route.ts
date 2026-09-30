import { NextResponse } from "next/server";

import { connectDb } from "@/lib/db";
import { readSession } from "@/lib/session";
import { CarModel } from "@/models/Car";

const defaultImageUrl =
  "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=900&q=85";

function responseCar(car: Record<string, unknown>) {
  return {
    id: String(car._id),
    name: car.name,
    model: car.carModel,
    imageUrl: car.imageUrl,
    mileageWithoutAC: car.mileageWithoutAC,
    mileageWithAC: car.mileageWithAC,
    createdAt: car.createdAt,
  };
}

export async function GET() {
  const session = await readSession();

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    await connectDb();
    const cars = await CarModel.find({ userId: session.userId })
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json({ cars: cars.map(responseCar) });
  } catch (error) {
    console.error("Cars fetch failed:", error);
    return NextResponse.json(
      { error: "Unable to load cars." },
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
    const values = {
      name: String(body.name || "")
        .trim()
        .slice(0, 80),
      carModel: String(body.model || "")
        .trim()
        .slice(0, 80),
      imageUrl: String(body.imageUrl || defaultImageUrl).trim(),
      mileageWithoutAC: Number(body.mileageWithoutAC),
      mileageWithAC: Number(body.mileageWithAC),
    };

    if (
      !values.name ||
      !values.carModel ||
      !values.imageUrl ||
      !Number.isFinite(values.mileageWithoutAC) ||
      values.mileageWithoutAC < 0 ||
      !Number.isFinite(values.mileageWithAC) ||
      values.mileageWithAC < 0
    ) {
      return NextResponse.json(
        { error: "Enter valid car details." },
        { status: 400 },
      );
    }

    await connectDb();
    const car = await CarModel.create({
      ...values,
      userId: session.userId,
      username: session.username,
    });

    return NextResponse.json(
      { car: responseCar(car.toObject()) },
      { status: 201 },
    );
  } catch (error) {
    console.error("Car save failed:", error);
    return NextResponse.json({ error: "Unable to save car." }, { status: 500 });
  }
}
