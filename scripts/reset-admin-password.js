const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

async function resetAdminPassword() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('Database connected');

    const email = "admin1@example.com";
    const newPassword = "Admin1@example.com";

    // Define a simple User schema for this script
    const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
      name: String,
      email: String,
      password: String,
      phone: String,
      role: String,
      employeeId: String,
      designation: String,
      department: String,
      gender: String,
      approved: Boolean,
      active: Boolean,
      joiningDate: Date,
      refreshTokens: [String]
    }));

    const user = await User.findOne({ email });

    if (!user) {
      console.log("User not found. Creating new admin user...");

      // Create admin user if doesn't exist
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      const adminUser = new User({
        name: "Admin User",
        email: email,
        password: hashedPassword,
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
      console.log(`Hash: ${hashedPassword.substring(0, 30)}...`);

    } else {
      console.log("User found:", {
        email: user.email,
        role: user.role,
        approved: user.approved,
        active: user.active,
        currentHash: user.password?.substring(0, 30) + '...'
      });

      // Reset password
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      user.password = hashedPassword;
      user.approved = true;
      user.active = true;

      await user.save();

      console.log("Password reset successfully");
      console.log(`New password: ${newPassword}`);
      console.log(`New hash: ${hashedPassword.substring(0, 30)}...`);
    }

    await mongoose.disconnect();
    console.log('Database disconnected');
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

resetAdminPassword();
