/**
 * Creates the initial superuser account from environment variables.
 * Safe to re-run: if a superuser already exists, it does nothing.
 *
 * Usage:
 *   1. Add to .env:
 *        SUPERUSER_NAME=Your Name
 *        SUPERUSER_EMAIL=you@example.com
 *        SUPERUSER_PASSWORD=a-strong-password-here
 *        JWT_SECRET=<a long random string, e.g. output of: openssl rand -base64 48>
 *   2. Run:
 *        npx tsx scripts/seedSuperuser.ts
 *      (or add a package.json script: "seed:superuser": "tsx scripts/seedSuperuser.ts")
 */
import dotenv from "dotenv";
dotenv.config();

import { connectDB } from "../lib/mongodb";
import User from "../models/User";
import { hashPassword } from "../lib/auth";

async function main() {
  const name = process.env.SUPERUSER_NAME;
  const email = process.env.SUPERUSER_EMAIL;
  const password = process.env.SUPERUSER_PASSWORD;

  if (!name || !email || !password) {
    console.error(
      "Missing SUPERUSER_NAME, SUPERUSER_EMAIL, or SUPERUSER_PASSWORD in your environment.\n" +
        "Add all three to your .env file and try again."
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("SUPERUSER_PASSWORD must be at least 8 characters.");
    process.exit(1);
  }

  await connectDB();

  const existingSuperuser = await User.findOne({ role: "superuser" });
  if (existingSuperuser) {
    console.log(
      `A superuser already exists (${existingSuperuser.username}). Nothing to do.\n` +
        "If you need to reset the password, do it directly against the database rather than re-running this script."
    );
    process.exit(0);
  }

  const existingEmail = await User.findOne({ email: email.toLowerCase().trim() });
  if (existingEmail) {
    console.error(`A user with email ${email} already exists but is not a superuser. Aborting.`);
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  const user = await User.create({
    name: name.trim(),
    username: email.toLowerCase().trim(),
    passwordHash,
    role: "superuser",
    permissions: { canManageStock: true, canManageItems: true, canManageBills: true },
    active: true,
  });

  console.log(`Superuser created: ${user.username}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});