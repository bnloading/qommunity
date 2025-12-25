const mongoose = require("mongoose");
const Community = require("./src/models/Community");
const User = require("./src/models/User");
require("dotenv").config();

async function checkLatest() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const communities = await Community.find()
      .populate("creator", "firstName lastName email clerkId")
      .sort({ createdAt: -1 })
      .limit(10);

    console.log("=== LATEST 10 COMMUNITIES ===\n");
    communities.forEach((c, i) => {
      console.log(`${i + 1}. ${c.name}`);
      console.log(`   Created: ${c.createdAt}`);
      console.log(`   Creator: ${c.creator?.firstName} ${c.creator?.lastName}`);
      console.log(`   Email: ${c.creator?.email}`);
      console.log(`   ClerkId: ${c.creator?.clerkId}\n`);
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkLatest();
