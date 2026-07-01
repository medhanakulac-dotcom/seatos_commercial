import playbookHtml from "./playbook.html?raw";

// Renders the full seatOS Playbook (a self-contained HTML design) as a tab
// inside the main app. The HTML is imported as a raw string at build time
// (Vite "?raw"), so there is no need for a /public folder.
export default function PlaybookApp() {
  return (
    <iframe
      title="seatOS Playbook"
      srcDoc={playbookHtml}
      style={{
        width: "100%",
        height: "100vh",
        border: "none",
        display: "block",
      }}
    />
  );
}
