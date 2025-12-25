const mongoose = require("mongoose");
const Community = require("./src/models/Community");
const User = require("./src/models/User");
require("dotenv").config();

async function fixEmptyCommunities() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Get Asay user
    const asayUser = await User.findOne({ email: "asay4061@gmail.com" });
    if (!asayUser) {
      console.log("❌ Asay user not found");
      process.exit(1);
    }

    console.log(`Found Asay: ${asayUser.firstName} ${asayUser.lastName}\n`);

    // Find communities without creators
    const communities = await Community.find({
      $or: [{ creator: null }, { creator: { $exists: false } }],
    });

    console.log(`Found ${communities.length} communities without creators\n`);

    for (const community of communities) {
      console.log(`🔧 Fixing: ${community.name}`);

      // Set Asay as creator
      community.creator = asayUser._id;

      // Clean members array (remove null entries)
      community.members = community.members.filter((m) => m && m.user);

      // Add Asay as admin member if not already
      const hasAsay = community.members.some(
        (m) => m.user.toString() === asayUser._id.toString()
      );

      if (!hasAsay) {
        community.members.push({
          user: asayUser._id,
          role: "admin",
          joinedAt: new Date(),
        });
        console.log("   Added Asay as admin member");
      }

      await community.save();
      console.log("   ✅ Fixed\n");
    }

    console.log("✅ All communities fixed!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

fixEmptyCommunities();
