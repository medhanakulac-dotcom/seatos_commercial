// Renders the full seatOS Playbook (a self-contained HTML file) as the app's
// primary shell. The HTML lives in /public/playbook.html and is served at the
// root path — no build-time import, so the app builds fine even before the
// file is uploaded. `role` and `email` are passed through so the Playbook can
// show the real signed-in user and the admin-only entry.
export default function PlaybookApp({ role = "member", email = "" }) {
  const src = `/playbook.html?role=${encodeURIComponent(role)}&email=${encodeURIComponent(email)}`;
  return (
    <iframe
      title="seatOS Playbook"
      src={src}
      style={{
        width: "100%",
        height: "100vh",
        border: "none",
        display: "block",
      }}
    />
  );
}
