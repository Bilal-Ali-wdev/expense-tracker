import mongoose, { Schema, model, models } from "mongoose";

export interface IRide extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  username: string;
  createdAt: Date;
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
}

const RideSchema = new Schema<IRide>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    pickupDistance: { type: Number, required: true, min: 0 },
    customerDistance: { type: Number, required: true, min: 0 },
    extraDistance: { type: Number, required: true, min: 0 },
    totalDistance: { type: Number, required: true, min: 0 },
    acUsed: { type: Boolean, required: true },
    mileageUsed: { type: Number, required: true, min: 0 },
    petrolPriceAtRide: { type: Number, required: true, min: 0 },
    fuelUsed: { type: Number, required: true, min: 0 },
    fuelCost: { type: Number, required: true, min: 0 },
    ridePrice: { type: Number, required: true, min: 0 },
    tip: { type: Number, required: true, min: 0 },
    commissionPercentageAtRide: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    commissionAmount: { type: Number, required: true, min: 0 },
    parking: { type: Number, required: true, min: 0 },
    toll: { type: Number, required: true, min: 0 },
    otherExpense: { type: Number, required: true, min: 0 },
    totalOtherExpenses: { type: Number, required: true, min: 0 },
    grossRevenue: { type: Number, required: true, min: 0 },
    netProfit: { type: Number, required: true },
  },
  { timestamps: true },
);

export const RideModel = models.Ride || model<IRide>("Ride", RideSchema);
