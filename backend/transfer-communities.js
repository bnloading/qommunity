const mongoose = require("mongoose");
const Community = require("./src/models/Community");
const User = require("./src/models/User");
require("dotenv").config();

async function transferCommunities() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Get Asay user
    const asay = await User.findOne({ email: "asay4061@gmail.com" });
    const nur = await User.findOne({ email: "nurbakhitjan5@gmail.com" });

    if (!asay || !nur) {
      console.log("❌ Users not found");
      process.exit(1);
    }

    console.log(`Asay: ${asay.firstName} ${asay.lastName}`);
    console.log(`Nur: ${nur.firstName} ${nur.lastName}\n`);

    // Transfer some communities to Asay
    const communityNames = ["1232", "Public", "Ken"];

    for (const name of communityNames) {
      const community = await Community.findOne({ name });
      if (community) {
        console.log(`Transferring "${name}" to Asay...`);
        community.creator = asay._id;

        // Update members array - add Asay if not there
        const hasAsay = community.members.some(
          (m) => m.user && m.user.toString() === asay._id.toString()
        );

        if (!hasAsay) {
          community.members.push({
            user: asay._id,
            role: "admin",
            joinedAt: new Date(),
          });
        }

        await community.save();
        console.log(`✅ Transferred\n`);
      }
    }

    console.log("✅ Done!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

transferCommunities();
