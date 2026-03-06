// scripts/reset-admin-password.ts
import dbConnect from "@/lib/dbConnect";
import { User } from "@/lib/models/User";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function resetAdminPassword() {
  try {
    await dbConnect();
    console.log("Database connected");
    
    const email = "admin1@example.com";
    const newPassword = "Admin1@example.com";
    
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log("User not found. Creating new admin user...");
      
      const adminUser = new User({
        name: "Admin User",
        email: email,
        password: newPassword,
        phone: "1234567890",
        role: "admin",
        employeeId: "ADM24001",
        designation: "Administrator",
        department: "Administration",
        gender: "male",
        approved: true,
        active: true,
        joiningDate: new Date(),
      });
      
      await adminUser.save();
      console.log("Admin user created successfully");
      console.log(`Email: ${email}`);
      console.log(`Password: ${newPassword}`);
      console.log(`Hash: ${adminUser.password.substring(0, 30)}...`);
      
    } else {
      console.log("User found:", {
        email: user.email,
        role: user.role,
        approved: user.approved,
        active: user.active,
        currentHash: user.password?.substring(0, 30) + '...'
      });
      
      // Reset password
      user.password = newPassword;
      user.approved = true;
      user.active = true;
      
      await user.save();
      
      console.log("Password reset successfully");
      console.log(`New password: ${newPassword}`);
      console.log(`New hash: ${user.password.substring(0, 30)}...`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

resetAdminPassword();
