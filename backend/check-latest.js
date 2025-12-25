const mongoose = require("mongoose");
const User = require("./src/models/User");
const Community = require("./src/models/Community");
require("dotenv").config();

async function checkLatestCommunity() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const communities = await Community.find({})
      .populate("creator", "firstName lastName email clerkId")
      .sort({ createdAt: -1 })
      .limit(5);

    console.log("📋 Latest 5 Communities:\n");

    communities.forEach((community, idx) => {
      console.log(`${idx + 1}. ${community.name} (${community.slug})`);
      console.log(`   Created: ${community.createdAt}`);
      if (community.creator) {
        console.log(
          `   Creator: ${community.creator.firstName} ${community.creator.lastName}`
        );
        console.log(`   Email: ${community.creator.email}`);
        console.log(`   ClerkId: ${community.creator.clerkId}`);
      } else {
        console.log(`   Creator: NONE`);
      }
      console.log();
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkLatestCommunity();
