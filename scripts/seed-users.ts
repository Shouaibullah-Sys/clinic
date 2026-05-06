// scripts/seed-users.ts
// Seed initial admin and user accounts

import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";

async function seedUsers() {
  try {
    console.log("Seeding users...");

    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: "admin@hospital.com" },
    });

    if (existingAdmin) {
      console.log("Admin user already exists");
    } else {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash("admin123", salt);

      const admin = await prisma.user.create({
        data: {
          name: "System Administrator",
          email: "admin@hospital.com",
          password: hashedPassword,
          role: "admin",
          phone: "+1234567890",
          employeeId: "ADM20260001",
          department: "Administration",
          designation: "Administrator",
          approved: true,
          active: true,
          joiningDate: new Date(),
          permissions: "[]",
          refreshTokens: "[]",
        },
      });

      console.log("Created admin:", admin.email);
    }

    // Check if regular user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: "user@hospital.com" },
    });

    if (existingUser) {
      console.log("Regular user already exists");
    } else {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash("user123", salt);

      const user = await prisma.user.create({
        data: {
          name: "John Doe",
          email: "user@hospital.com",
          password: hashedPassword,
          role: "staff",
          phone: "+1234567891",
          employeeId: "STF20260002",
          department: "Support Services",
          designation: "Hospital Staff",
          approved: true,
          active: true,
          joiningDate: new Date(),
          permissions: "[]",
          refreshTokens: "[]",
        },
      });

      console.log("Created user:", user.email);
    }

    console.log("\n=== Seeding Complete ===");
    console.log("Admin credentials: admin@hospital.com / admin123");
    console.log("User credentials: user@hospital.com / user123");
  } catch (error) {
    console.error("Seeding error:", error);
    process.exitCode = 1;
  }
}

seedUsers();