const mongoose = require("mongoose");
const User = require("./src/models/User");
require("dotenv").config();

async function fixUserNames() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Get all users
    const users = await User.find({});
    console.log(`📋 Found ${users.length} users`);

    for (const user of users) {
      try {
        console.log(`\n🔄 Checking user: ${user.email}`);

        // If user has default names, extract from email
        if (
          user.firstName === "Nur" ||
          user.firstName === "Skool" ||
          user.firstName === "User"
        ) {
          const emailUsername = user.email.split("@")[0];

          // Parse email username (handle nurbakhitjan5, asay4061, etc)
          let firstName = emailUsername;
          let lastName = "";

          // Try to extract meaningful names from email
          // Remove numbers from end
          const nameWithoutNumbers = emailUsername.replace(/\d+$/, "");

          if (nameWithoutNumbers.length > 0) {
            // Capitalize first letter
            firstName =
              nameWithoutNumbers.charAt(0).toUpperCase() +
              nameWithoutNumbers.slice(1);
          }

          console.log(
            `  📝 Updating: "${user.firstName} ${user.lastName}" → "${firstName} ${lastName}"`
          );

          user.firstName = firstName;
          user.lastName = lastName;
          await user.save();

          console.log(`  ✅ User updated successfully`);
        } else {
          console.log(
            `  ⏭️  User already has custom name: ${user.firstName} ${user.lastName}`
          );
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

fixUserNames();
