const mongoose = require("mongoose");
const Community = require("./src/models/Community");
const User = require("./src/models/User");
require("dotenv").config();

async function fixCreators() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const communities = await Community.find({ creator: null }).populate(
      "members.user"
    );
    console.log(`Found ${communities.length} communities without creators\n`);

    for (const community of communities) {
      console.log(`\n🔧 Fixing: ${community.name}`);

      // Check if there's an admin member
      const adminMember = community.members.find((m) => m.role === "admin");

      if (adminMember && adminMember.user) {
        console.log(`   Setting creator to admin: ${adminMember.user.email}`);
        community.creator = adminMember.user._id;
        await community.save();
        console.log("   ✅ Fixed");
      } else if (community.members.length > 0 && community.members[0].user) {
        // Set first member as creator
        console.log(
          `   Setting creator to first member: ${community.members[0].user.email}`
        );
        community.creator = community.members[0].user._id;
        await community.save();
        console.log("   ✅ Fixed");
      } else {
        console.log("   ⚠️  No members found, skipping...");
      }
    }

    console.log("\n✅ All communities fixed!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

fixCreators();
