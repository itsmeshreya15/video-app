const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const createAdmin = async () => {
    // Get command line arguments
    const args = process.argv.slice(2);

    if (args.length < 3) {
        console.log('\n❌ Usage: npm run create-admin <username> <email> <password>');
        console.log('   Example: npm run create-admin admin admin@gmail.com admin123\n');
        process.exit(1);
    }

    const [username, email, password] = args;

    // Validate password length
    if (password.length < 6) {
        console.log('\n❌ Password must be at least 6 characters\n');
        process.exit(1);
    }

    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('\n📦 Connected to MongoDB');

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            if (existingUser.role === 'admin') {
                console.log(`\n⚠️  User "${existingUser.username}" is already an admin!\n`);
            } else {
                // Upgrade existing user to admin
                existingUser.role = 'admin';
                await existingUser.save();
                console.log(`\n✅ User "${existingUser.username}" upgraded to admin!\n`);
            }
            process.exit(0);
        }

        // Create new admin user
        const admin = await User.create({
            username,
            email,
            password,
            role: 'admin',
            organization: 'System Admin'
        });

        console.log('\n✅ Admin user created successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`   Username: ${admin.username}`);
        console.log(`   Email:    ${admin.email}`);
        console.log(`   Role:     ${admin.role}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message, '\n');
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
};

createAdmin();
