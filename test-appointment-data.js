// Simple test script to check appointment data
const mongoose = require('mongoose');

async function testAppointmentData() {
  try {
    // Connect to database using the same connection string as the application
    await mongoose.connect('mongodb+srv://barekzai:barekzai@barekzai.w4jd6ls.mongodb.net/?appName=barekzai', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to database');

    // Test appointment ID from the logs
    const appointmentId = '697214d010338840a300d27e';

    // Check if appointment exists
    const appointments = mongoose.connection.db.collection('appointments');
    const appointment = await appointments.findOne({ _id: new mongoose.Types.ObjectId(appointmentId) });
    
    if (appointment) {
      console.log('Appointment found:', appointment.appointmentId);
      console.log('Patient:', appointment.patient);
      console.log('Doctor:', appointment.doctor);
      console.log('Date:', appointment.date);
    } else {
      console.log('Appointment not found');
    }

    // Check lab tests for this appointment
    const labTests = mongoose.connection.db.collection('labtests');
    const labTestResults = await labTests.find({ appointment: new mongoose.Types.ObjectId(appointmentId) }).toArray();
    
    console.log(`Found ${labTestResults.length} lab tests for appointment ${appointmentId}`);
    labTestResults.forEach(test => {
      console.log(`- ${test.testName} (${test.testId}) - Status: ${test.status}`);
    });

    // Check prescriptions for this appointment
    const prescriptions = mongoose.connection.db.collection('prescriptions');
    const prescriptionResults = await prescriptions.find({ appointment: new mongoose.Types.ObjectId(appointmentId) }).toArray();
    
    console.log(`Found ${prescriptionResults.length} prescriptions for appointment ${appointmentId}`);
    prescriptionResults.forEach(prescription => {
      console.log(`- ${prescription.prescriptionId} - Diagnosis: ${prescription.diagnosis}`);
      console.log(`  Medications: ${prescription.medications.length}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
  }
}

testAppointmentData();