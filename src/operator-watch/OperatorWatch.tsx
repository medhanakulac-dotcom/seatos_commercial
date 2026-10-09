import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { App } from './app/App';
import { Providers } from './app/Providers';
import './styles/operator-watch.css';

/** Operator Watch pages the site's sidebar links to, and the in-app path each one opens. */
export const OW_PAGES = {
  home: '/',
  accounts: '/accounts',
  approvals: '/approvals',
  sent: '/sent',
  leader: '/leader',
  settings: '/settings',
} as const;

export type OwPage = keyof typeof OW_PAGES;

/** The sidebar page a path belongs to (an account record belongs to Accounts). */
export function pageOf(pathname: string): OwPage {
  const first = pathname.split('/')[1] ?? '';
  return (Object.keys(OW_PAGES) as OwPage[]).find((p) => p !== 'home' && OW_PAGES[p] === `/${first}`) ?? 'home';
}

/** Keeps the in-app route and the site's sidebar selection in step, in both directions. */
function PageSync({ page, onPageChange }: { page: OwPage; onPageChange: (page: OwPage) => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (pageOf(pathname) !== page) navigate(OW_PAGES[page]);
    // Only when the sidebar picks a page; in-app navigation is reported below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);
  useEffect(() => {
    const current = pageOf(pathname);
    if (current !== page) onPageChange(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);
  return null;
}

/**
 * CS Operator Watch inside the site: opened from the sidebar's Operator Watch group like the other tools. Styles are
 * scoped under .ow-root so they never touch the Playbook.
 */
export default function OperatorWatch({ page = 'home', onPageChange = () => undefined }: { page?: OwPage; onPageChange?: (page: OwPage) => void }) {
  return (
    <div className="ow-root nosb">
      <Providers initialPath={OW_PAGES[page]}>
        <PageSync page={page} onPageChange={onPageChange} />
        <App />
      </Providers>
    </div>
  );
}
