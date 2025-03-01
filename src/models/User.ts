import mongoose, { Schema, Document } from 'mongoose';

// Define the User Role enum
export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export interface IUser extends Document {
  name: string;
  username: string;
  email: string;
  password: string;
  avatar?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

// Define the User schema
const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.USER,
    },
  },
  { timestamps: true }
);

// Create the model if it doesn't exist
const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User; 