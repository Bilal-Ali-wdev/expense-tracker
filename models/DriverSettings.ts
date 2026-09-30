import mongoose, { Schema, model, models } from "mongoose";

export interface IDriverSettings extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  username: string;
  carName: string;
  carModel: string;
  petrolPrice: number;
  mileageWithoutAC: number;
  mileageWithAC: number;
  commissionPercentage: number;
  createdAt: Date;
  updatedAt: Date;
}

const DriverSettingsSchema = new Schema<IDriverSettings>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    username: { type: String, required: true, trim: true, lowercase: true },
    carName: { type: String, default: "My car", trim: true },
    carModel: { type: String, default: "", trim: true },
    petrolPrice: { type: Number, required: true, min: 0, default: 300 },
    mileageWithoutAC: { type: Number, required: true, min: 0, default: 22 },
    mileageWithAC: { type: Number, required: true, min: 0, default: 17 },
    commissionPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 10,
    },
  },
  { timestamps: true },
);

export const DriverSettingsModel =
  models.DriverSettings ||
  model<IDriverSettings>("DriverSettings", DriverSettingsSchema);
