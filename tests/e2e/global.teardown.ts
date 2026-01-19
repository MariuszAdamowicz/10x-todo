/* eslint-disable no-console */
import { test as teardown } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

// Load .env first
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
// Load .env.test with override to ensure it takes precedence
dotenv.config({ path: path.resolve(process.cwd(), ".env.test"), override: true });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

teardown("cleanup database", async () => {
  console.log("\n🔍 --- GLOBAL TEARDOWN START ---");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return;
  }

  // Mask key for logging
  const maskedKey = SUPABASE_SERVICE_ROLE_KEY.substring(0, 5) + "...";
  console.log(`Connecting to Supabase at ${SUPABASE_URL} with key ${maskedKey}`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // 1. Fetch all users
    const {
      data: { users },
      error: listUsersError,
    } = await supabase.auth.admin.listUsers({ perPage: 1000 });

    if (listUsersError) {
      console.error("❌ Error listing users:", listUsersError);
      return; // Exit gracefully on connection error, don't fail the whole suite if cleanup fails
    }

    console.log(`Found ${users.length} users in database.`);

    // 2. Find dedicated E2E test user
    const E2E_USERNAME = process.env.E2E_USERNAME;
    const e2eUser = users.find((user) => user.email === E2E_USERNAME);

    if (!e2eUser) {
      console.log(`⚠️  E2E user ${E2E_USERNAME} not found. Nothing to clean.`);
    } else {
      console.log(`🧹 Cleaning test data for E2E user: ${E2E_USERNAME}`);

      // 3. Delete all projects (CASCADE will delete tasks)
      const { error: deleteProjectsError } = await supabase.from("projects").delete().eq("user_id", e2eUser.id);

      if (deleteProjectsError) {
        console.error("⚠️  Error deleting projects:", deleteProjectsError);
      } else {
        console.log("✅ Deleted all projects for E2E user.");
      }
    }
  } catch (error) {
    console.error("❌ Global teardown exception:", error);
  }
  console.log("🏁 --- GLOBAL TEARDOWN END ---\n");
});
