const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log('Database connected successfully');

    // Check if User model exists
    const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
      email: String,
      password: String,
      approved: Boolean,
      active: Boolean,
      role: String
    }));

    const users = await User.find({});
    console.log('Users found:', users.length);

    if (users.length > 0) {
      users.forEach(user => {
        console.log('User:', {
          email: user.email,
          role: user.role,
          approved: user.approved,
          active: user.active
        });
      });
    } else {
      console.log('No users found in database');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkUsers();
