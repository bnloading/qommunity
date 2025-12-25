const { clerkClient } = require("@clerk/clerk-sdk-node");
const mongoose = require("mongoose");
const User = require("./src/models/User");
require("dotenv").config();

async function updateUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Get all users from database
    const users = await User.find({ clerkId: { $exists: true } });
    console.log(`📋 Found ${users.length} users with Clerk IDs`);

    for (const user of users) {
      try {
        console.log(`\n🔄 Updating user: ${user.email}`);

        // Get latest data from Clerk
        const clerkUser = await clerkClient.users.getUser(user.clerkId);

        let updated = false;

        // Update firstName if available from Clerk
        if (clerkUser.firstName && clerkUser.firstName !== user.firstName) {
          console.log(
            `  📝 Updating firstName: "${user.firstName}" → "${clerkUser.firstName}"`
          );
          user.firstName = clerkUser.firstName;
          updated = true;
        }

        // Update lastName if available from Clerk
        if (clerkUser.lastName && clerkUser.lastName !== user.lastName) {
          console.log(
            `  📝 Updating lastName: "${user.lastName}" → "${clerkUser.lastName}"`
          );
          user.lastName = clerkUser.lastName;
          updated = true;
        }

        // Update profile picture if available
        if (clerkUser.imageUrl && clerkUser.imageUrl !== user.profilePicture) {
          console.log(`  📷 Updating profile picture`);
          user.profilePicture = clerkUser.imageUrl;
          updated = true;
        }

        if (updated) {
          await user.save();
          console.log(`  ✅ User updated successfully`);
        } else {
          console.log(`  ⏭️  No changes needed`);
        }
      } catch (error) {
        console.error(`  ❌ Error updating user ${user.email}:`, error.message);
      }
    }

    console.log("\n✅ Update complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

updateUsers();
