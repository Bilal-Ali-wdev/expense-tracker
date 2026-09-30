import mongoose, { Schema, model, models } from "mongoose";

export interface ICar extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  username: string;
  name: string;
  carModel: string;
  imageUrl: string;
  mileageWithoutAC: number;
  mileageWithAC: number;
  createdAt: Date;
  updatedAt: Date;
}

const CarSchema = new Schema<ICar>(
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
    name: { type: String, required: true, trim: true, maxlength: 80 },
    carModel: { type: String, required: true, trim: true, maxlength: 80 },
    imageUrl: { type: String, required: true, trim: true },
    mileageWithoutAC: { type: Number, required: true, min: 0 },
    mileageWithAC: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

export const CarModel = models.DriverCar || model<ICar>("DriverCar", CarSchema);
