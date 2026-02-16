// lib/models/AppSetting.ts

import mongoose, { Schema, model, models } from "mongoose";

export interface IAppSetting extends mongoose.Document {
  key: string;
  value: any;
  updatedBy?: mongoose.Types.ObjectId;
}

const AppSettingSchema = new Schema<IAppSetting>(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: Schema.Types.Mixed },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export const AppSetting =
  models.AppSetting || model<IAppSetting>("AppSetting", AppSettingSchema);
