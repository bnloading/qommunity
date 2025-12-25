const mongoose = require("mongoose");
const User = require("./src/models/User");
const Community = require("./src/models/Community");
require("dotenv").config();

async function checkData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Get all users
    console.log("\n📋 USERS:");
    const users = await User.find({});
    users.forEach((user) => {
      console.log(
        `  - ${user.email}: "${user.firstName} ${user.lastName}" (ID: ${user._id})`
      );
    });

    // Get all communities with creator info
    console.log("\n🏘️  COMMUNITIES:");
    const communities = await Community.find({})
      .populate("creator", "firstName lastName email")
      .sort({ createdAt: -1 });

    communities.forEach((community) => {
      console.log(`  - ${community.name} (${community.slug})`);
      if (community.creator) {
        console.log(
          `    Creator: ${community.creator.firstName} ${community.creator.lastName} (${community.creator.email})`
        );
      } else {
        console.log(`    Creator: NONE`);
      }
    });

    console.log("\n✅ Done!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkData();
