// Debug script to check appointments directly
const mongoose = require("mongoose");

async function debugAppointments() {
  try {
    await mongoose.connect(
      "mongodb+srv://barekzai:barekzai@barekzai.w4jd6ls.mongodb.net/?appName=barekzai",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      },
    );

    console.log("Connected to database");

    const appointments = mongoose.connection.db.collection("appointments");

    // Count all appointments
    const totalCount = await appointments.countDocuments();
    console.log("Total appointments in collection:", totalCount);

    // Get sample appointments
    const sample = await appointments.find({}).limit(5).toArray();
    console.log("\nSample appointments:");
    sample.forEach((apt, i) => {
      console.log(`\nAppointment ${i + 1}:`);
      console.log("  _id:", apt._id);
      console.log("  appointmentId:", apt.appointmentId);
      console.log("  patient:", apt.patient);
      console.log("  doctor:", apt.doctor);
      console.log("  status:", apt.status);
      console.log("  date:", apt.date);
      console.log("  startTime:", apt.startTime);
      console.log("  appointmentType:", apt.appointmentType);
    });

    // Check by status
    const statusCounts = await appointments
      .aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }])
      .toArray();
    console.log("\nAppointments by status:", statusCounts);

    // Check by doctor
    const doctorCounts = await appointments
      .aggregate([
        { $group: { _id: "$doctor", count: { $sum: 1 } } },
        { $limit: 10 },
      ])
      .toArray();
    console.log("\nAppointments by doctor (top 10):", doctorCounts);

    // Check if date vs startTime
    const dateCheck = await appointments.find({}).limit(5).toArray();
    console.log("\nDate vs startTime comparison:");
    dateCheck.forEach((apt, i) => {
      console.log(`  ${i + 1}. date: ${apt.date}, startTime: ${apt.startTime}`);
    });

    // Check users collection for doctors
    const users = mongoose.connection.db.collection("users");
    const doctors = await users.find({ role: "doctor" }).toArray();
    console.log("\nDoctors in users collection:", doctors.length);
    doctors.forEach((doc) => {
      console.log(
        `  - ${doc.name} (${doc._id}): consultationFee=${doc.consultationFee}`,
      );
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from database");
  }
}

debugAppointments();
