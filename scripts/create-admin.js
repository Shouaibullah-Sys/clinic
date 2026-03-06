/**
 * Script to create an admin user with role "admin" and approved = true
 * Usage: node scripts/create-admin.js
 *
 * Or with custom credentials:
 * ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=secret ADMIN_NAME="John Doe" ADMIN_PHONE="+1234567890" node scripts/create-admin.js
 */

require("dotenv").config({ path: ".env.local" });

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@hospital.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const ADMIN_NAME = process.env.ADMIN_NAME || "System Administrator";
const ADMIN_PHONE = process.env.ADMIN_PHONE || "+93700000000";

// Define the User schema (similar to lib/models/User.ts)
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: [
        "admin",
        "staff",
        "doctor",
        "nurse",
        "receptionist",
        "pharmacist",
        "pharmacy_head",
        "lab_technician",
        "radiologist",
        "admission",
      ],
      required: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    avatar: {
      type: String,
    },
    approved: {
      type: Boolean,
      default: false,
    },
    active: {
      type: Boolean,
      default: true,
    },
    employeeId: {
      type: String,
      unique: true,
    },
    department: {
      type: String,
    },
    designation: {
      type: String,
    },
    specialization: {
      type: String,
    },
    licenseNumber: {
      type: String,
      unique: true,
    },
    address: {
      type: String,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    qualifications: [
      {
        type: String,
      },
    ],
    experience: {
      type: Number,
      min: 0,
    },
    consultationFee: {
      type: Number,
      min: 0,
    },
    availability: {
      days: [String],
      startTime: String,
      endTime: String,
      breakStart: String,
      breakEnd: String,
    },
    biography: {
      type: String,
      trim: true,
    },
    joiningDate: {
      type: Date,
    },
    permissions: [
      {
        type: String,
      },
    ],
    refreshTokens: [
      {
        type: String,
      },
    ],
    markedOnlyAccess: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.refreshTokens;
        return ret;
      },
    },
    toObject: {
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.refreshTokens;
        return ret;
      },
    },
  },
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

async function createAdminUser() {
  try {
    // Connect to MongoDB
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("Database connected successfully");

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ role: "admin" });
    if (existingAdmin) {
      console.log("\n⚠️  Admin user already exists!");
      console.log("Admin details:");
      console.log(`  Email: ${existingAdmin.email}`);
      console.log(`  Name: ${existingAdmin.name}`);
      console.log(`  Phone: ${existingAdmin.phone}`);
      console.log(`  Approved: ${existingAdmin.approved}`);
      console.log(`  Active: ${existingAdmin.active}`);
      console.log(`  Created: ${existingAdmin.createdAt}`);

      // Ask if user wants to update the existing admin
      const readline = require("readline");
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.question(
        "\nDo you want to update the existing admin password? (y/n): ",
        async (answer) => {
          if (answer.toLowerCase() === "y") {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);
            existingAdmin.password = hashedPassword;
            existingAdmin.email = ADMIN_EMAIL;
            existingAdmin.name = ADMIN_NAME;
            existingAdmin.phone = ADMIN_PHONE;
            await existingAdmin.save();
            console.log("\n✅ Admin user updated successfully!");
            console.log(`   Email: ${ADMIN_EMAIL}`);
            console.log(`   Password: ${ADMIN_PASSWORD}`);
          }
          rl.close();
          await mongoose.disconnect();
          console.log("\nDisconnected from database");
        },
      );
      return;
    }

    // Hash the password
    console.log("\nHashing password...");
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);

    // Set admin permissions
    const adminPermissions = [
      "manage_users",
      "manage_settings",
      "view_all_reports",
      "manage_billing",
      "manage_appointments",
      "manage_patients",
      "manage_doctors",
      "manage_staff",
      "view_financial_reports",
      "manage_inventory",
    ];

    // Create the admin user
    const adminUser = new User({
      email: ADMIN_EMAIL,
      password: hashedPassword,
      name: ADMIN_NAME,
      role: "admin",
      phone: ADMIN_PHONE,
      approved: true, // User is approved immediately
      active: true,
      permissions: adminPermissions,
      designation: "System Administrator",
      joiningDate: new Date(),
    });

    // Save to database
    console.log("Creating admin user...");
    await adminUser.save();

    console.log("\n✅ Admin user created successfully!");
    console.log("\n--- Admin Credentials ---");
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log(`   Role: admin`);
    console.log(`   Approved: true`);
    console.log(`   Active: true`);
    console.log(`   Permissions: ${adminPermissions.join(", ")}`);
    console.log("\n--------------------------\n");

    // Disconnect from database
    await mongoose.disconnect();
    console.log("Disconnected from database");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.code === 11000) {
      console.log("\nNote: An admin user with this email may already exist.");
    }
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the script
createAdminUser();
