const mongoose = require("mongoose");
const Community = require("./src/models/Community");
const User = require("./src/models/User");
require("dotenv").config();

async function checkCreators() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const communities = await Community.find().populate(
      "creator",
      "firstName lastName email clerkId"
    );
    console.log("=== ALL COMMUNITIES ===");
    communities.forEach((c, i) => {
      console.log(`\n${i + 1}. ${c.name}`);
      console.log(`   Creator: ${c.creator?.firstName} ${c.creator?.lastName}`);
      console.log(`   Email: ${c.creator?.email}`);
      console.log(`   ClerkId: ${c.creator?.clerkId}`);
    });

    const users = await User.find();
    console.log(`\n\n=== ALL USERS (${users.length}) ===`);
    users.forEach((u, i) => {
      console.log(
        `${i + 1}. ${u.firstName} ${u.lastName} - ${u.email} - ${u.clerkId}`
      );
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkCreators();
