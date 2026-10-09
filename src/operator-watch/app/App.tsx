import { useEffect, useRef } from 'react';
import { Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { ErrorBanner } from '../components/ErrorBanner';
import { Topbar } from '../components/layout/Topbar';
import { AccountRecordPage } from '../features/record/AccountRecordPage';
import { AccountsPage } from '../features/accounts/AccountsPage';
import { ApprovalsPage } from '../features/approvals/ApprovalsPage';
import { AuthGate } from '../features/auth/AuthGate';
import { HomePage } from '../features/home/HomePage';
import { LeaderPage } from '../features/leader/LeaderPage';
import { SentPage } from '../features/sent/SentPage';
import { SettingsPage } from '../features/settings/SettingsPage';

/** Page frame. Navigation lives in the site's sidebar (Operator Watch group), so there is no sidebar here. */
function Shell() {
  const { pathname } = useLocation();
  const top = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // The site scrolls the tool area, not the window.
    top.current?.scrollIntoView({ block: 'start' });
  }, [pathname]);
  return (
    <div className="app" ref={top}>
      <div className="content">
        <Topbar />
        <main id="main">
          <ErrorBanner />
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function App() {
  return (
    <AuthGate>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<HomePage />} />
          <Route path="accounts" element={<AccountsPage />} />
          <Route path="accounts/:id" element={<AccountRecordPage />} />
          <Route path="approvals" element={<ApprovalsPage />} />
          <Route path="sent" element={<SentPage />} />
          <Route path="leader" element={<LeaderPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<div className="card d">Page not found.</div>} />
        </Route>
      </Routes>
    </AuthGate>
  );
}
