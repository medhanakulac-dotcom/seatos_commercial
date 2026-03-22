import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient.js";

const S = {
  card: { background: "#fff", borderRadius: 16, padding: "24px", marginBottom: 20, boxShadow: "0 2px 12px rgba(0,0,0,.06)" },
  th: { padding: "10px 14px", textAlign: "left", fontWeight: 700, fontSize: 11, textTransform: "uppercase", color: "#71717a", borderBottom: "2px solid #e4e4e7", background: "#fafaf9" },
  td: { padding: "10px 14px", borderBottom: "1px solid #f4f4f5", fontSize: 13, color: "#3f3f46" },
  btn: { padding: "8px 16px", borderRadius: 10, border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 },
  inp: { padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e4e4e7", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box" },
};

const eventColors = {
  login: "#16a34a",
  logout: "#e11d48",
  tab_switch: "#7c3aed",
  action: "#f59e0b",
};

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function AdminApp({ currentUser }) {
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [newEmail, setNewEmail] = useState("");
  const [inviteMsg, setInviteMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("logs");
  const [logFilter, setLogFilter] = useState("all");

  // Fetch activity logs
  useEffect(() => {
    fetchLogs();
    fetchUsers();
  }, []);

  async function fetchLogs() {
    setLoading(true);
    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (!error && data) setLogs(data);
    setLoading(false);
  }

  async function fetchUsers() {
    const { data, error } = await supabase
      .from("allowed_users")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setUsers(data);
  }

  async function inviteUser(e) {
    e.preventDefault();
    if (!newEmail.trim() || !newEmail.includes("@")) {
      setInviteMsg("Please enter a valid email.");
      return;
    }
    const exists = users.find(u => u.email === newEmail.toLowerCase().trim());
    if (exists) {
      setInviteMsg("This email is already invited.");
      return;
    }

    // 1. Add to allowed_users table
    const { error: dbErr } = await supabase
      .from("allowed_users")
      .insert({ email: newEmail.toLowerCase().trim(), invited_by: currentUser, role: "member" });

    if (dbErr) {
      setInviteMsg("Error: " + dbErr.message);
      return;
    }

    // 2. Send invite via Supabase Auth (magic link)
    const { error: authErr } = await supabase.auth.admin.inviteUserByEmail(newEmail.trim());
    // Note: admin.inviteUserByEmail requires service_role key.
    // Alternative: use supabase.auth.signInWithOtp for magic link invite
    if (authErr) {
      // Fallback: send OTP magic link instead
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: newEmail.trim(),
        options: { shouldCreateUser: true },
      });
      if (otpErr) {
        setInviteMsg("Saved to allowed list, but email invite failed: " + otpErr.message);
      } else {
        setInviteMsg("Invite sent to " + newEmail + "!");
      }
    } else {
      setInviteMsg("Invite sent to " + newEmail + "!");
    }

    setNewEmail("");
    fetchUsers();
    setTimeout(() => setInviteMsg(""), 4000);
  }

  async function removeUser(email) {
    if (!confirm(`Remove ${email} from allowed users?`)) return;
    await supabase.from("allowed_users").delete().eq("email", email);
    fetchUsers();
  }

  const filteredLogs = logFilter === "all" ? logs : logs.filter(l => l.event_type === logFilter);

  return (
    <div style={{ fontFamily: "'Segoe UI',sans-serif", minHeight: "100vh", background: "#F5F0EB", padding: "24px 16px 80px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1a1a1a", marginBottom: 4 }}>Admin Dashboard</h1>
          <p style={{ fontSize: 13, color: "#71717a" }}>Manage users and view activity logs</p>
        </div>

        {/* Sub-tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {[{ id: "logs", label: "Activity Logs" }, { id: "users", label: "Manage Users" }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              ...S.btn,
              background: tab === t.id ? "#1a1a1a" : "#fff",
              color: tab === t.id ? "#fff" : "#71717a",
              border: tab === t.id ? "none" : "1.5px solid #e4e4e7",
            }}>{t.label}</button>
          ))}
        </div>

        {/* ═══ ACTIVITY LOGS ═══ */}
        {tab === "logs" && (
          <div style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Activity Logs</h2>
              <div style={{ display: "flex", gap: 6 }}>
                {["all", "login", "logout", "tab_switch", "action"].map(f => (
                  <button key={f} onClick={() => setLogFilter(f)} style={{
                    ...S.btn, padding: "5px 12px", fontSize: 11,
                    background: logFilter === f ? (eventColors[f] || "#1a1a1a") : "#f4f4f5",
                    color: logFilter === f ? "#fff" : "#71717a",
                  }}>{f === "all" ? "All" : f.replace("_", " ")}</button>
                ))}
                <button onClick={fetchLogs} style={{ ...S.btn, padding: "5px 12px", fontSize: 11, background: "#f4f4f5", color: "#71717a" }}>↻ Refresh</button>
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: 40, color: "#a1a1aa" }}>Loading...</div>
            ) : filteredLogs.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "#a1a1aa" }}>No activity logs yet.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={S.th}>Time</th>
                      <th style={S.th}>User</th>
                      <th style={S.th}>Event</th>
                      <th style={S.th}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log, i) => (
                      <tr key={log.id || i}>
                        <td style={{ ...S.td, whiteSpace: "nowrap", fontSize: 12 }}>
                          <div>{timeAgo(log.created_at)}</div>
                          <div style={{ color: "#a1a1aa", fontSize: 10 }}>
                            {new Date(log.created_at).toLocaleString()}
                          </div>
                        </td>
                        <td style={{ ...S.td, fontWeight: 600 }}>{log.user_email || "—"}</td>
                        <td style={S.td}>
                          <span style={{
                            display: "inline-block", padding: "3px 10px", borderRadius: 20,
                            fontSize: 11, fontWeight: 700,
                            background: (eventColors[log.event_type] || "#71717a") + "18",
                            color: eventColors[log.event_type] || "#71717a",
                          }}>
                            {log.event_type}
                          </span>
                        </td>
                        <td style={{ ...S.td, fontSize: 12, color: "#71717a", maxWidth: 300 }}>
                          {log.metadata ? JSON.stringify(log.metadata) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══ MANAGE USERS ═══ */}
        {tab === "users" && (
          <>
            {/* Invite form */}
            <div style={S.card}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Invite New User</h2>
              <p style={{ fontSize: 12, color: "#71717a", marginBottom: 16 }}>
                Only invited emails can sign in. They will receive a magic link via email.
              </p>
              <form onSubmit={inviteUser} style={{ display: "flex", gap: 8 }}>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  style={{ ...S.inp, flex: 1 }}
                />
                <button type="submit" style={{ ...S.btn, background: "#F5A623", color: "#fff", padding: "10px 24px", whiteSpace: "nowrap" }}>
                  Send Invite
                </button>
              </form>
              {inviteMsg && (
                <div style={{
                  marginTop: 10, padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: inviteMsg.includes("Error") || inviteMsg.includes("already") ? "#fef2f2" : "#f0fdf4",
                  color: inviteMsg.includes("Error") || inviteMsg.includes("already") ? "#e11d48" : "#16a34a",
                }}>{inviteMsg}</div>
              )}
            </div>

            {/* User list */}
            <div style={S.card}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Allowed Users ({users.length})</h2>
              {users.length === 0 ? (
                <div style={{ textAlign: "center", padding: 30, color: "#a1a1aa" }}>No users invited yet.</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={S.th}>Email</th>
                      <th style={S.th}>Role</th>
                      <th style={S.th}>Invited By</th>
                      <th style={S.th}>Date</th>
                      <th style={{ ...S.th, textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td style={{ ...S.td, fontWeight: 600 }}>{u.email}</td>
                        <td style={S.td}>
                          <span style={{
                            padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                            background: u.role === "admin" ? "#7c3aed18" : "#f4f4f5",
                            color: u.role === "admin" ? "#7c3aed" : "#71717a",
                          }}>{u.role || "member"}</span>
                        </td>
                        <td style={{ ...S.td, fontSize: 12, color: "#71717a" }}>{u.invited_by || "—"}</td>
                        <td style={{ ...S.td, fontSize: 12, color: "#71717a" }}>
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                        </td>
                        <td style={{ ...S.td, textAlign: "right" }}>
                          {u.role !== "admin" && (
                            <button onClick={() => removeUser(u.email)} style={{
                              ...S.btn, padding: "4px 12px", fontSize: 11,
                              background: "#fef2f2", color: "#e11d48",
                            }}>Remove</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
