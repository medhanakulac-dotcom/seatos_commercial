import { supabase } from "./supabaseClient.js";

/**
 * Log an activity event to Supabase.
 * 
 * Event types:
 *   - login          User signed in
 *   - logout         User signed out
 *   - tab_switch     User switched to a different tool tab
 *   - action         User performed an action inside a tool
 * 
 * @param {string} eventType  - "login" | "logout" | "tab_switch" | "action"
 * @param {object} metadata   - Additional data (e.g. { tab: "calculator" })
 * @param {string} userEmail  - User's email address
 */
export async function logActivity(eventType, metadata = {}, userEmail = "") {
  try {
    const { error } = await supabase.from("activity_logs").insert({
      user_email: userEmail,
      event_type: eventType,
      metadata: metadata,
      created_at: new Date().toISOString(),
    });
    if (error) console.warn("Activity log failed:", error.message);
  } catch (e) {
    // Silent fail — logging should never break the app
    console.warn("Activity log error:", e);
  }
}
