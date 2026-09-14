import mongoose, { Schema, Document, Model } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUserPermissions {
  canManageStock: boolean;   // add/deduct stock quantities on existing items
  canManageItems: boolean;   // create/edit/delete inventory items
  canManageBills: boolean;   // create bills, change bill status
}

export interface IUser extends Document {
  name: string;
  username: string;
  passwordHash: string;
  role: "superuser" | "staff";
  permissions: IUserPermissions;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const PermissionsSchema = new Schema<IUserPermissions>(
  {
    canManageStock: { type: Boolean, default: false },
    canManageItems: { type: Boolean, default: false },
    canManageBills: { type: Boolean, default: false },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["superuser", "staff"], default: "staff" },
    permissions: { type: PermissionsSchema, default: () => ({}) },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);
// Superusers implicitly have every permission — this keeps that rule in one place
// rather than re-deriving it at every call site.
UserSchema.methods.comparePassword = function (candidate: string) {
  return bcrypt.compare(candidate, this.passwordHash);
};

// Never let the hash leave the server by accident (e.g. via JSON.stringify(user) in a route).
UserSchema.set("toJSON", {
  transform: (_doc, ret) => {
    const { passwordHash, ...safe } = ret;
    return safe;
  },
});

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;