'use client';

import { usePathname, useRouter } from 'next/navigation';

const tabs = [
  {
    label: 'Task Board',
    path: '/taskboard',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="6" height="6" rx="1" />
        <rect x="9" y="3" width="6" height="6" rx="1" />
        <rect x="16" y="3" width="6" height="6" rx="1" />
        <rect x="2" y="11" width="6" height="6" rx="1" />
        <rect x="9" y="11" width="6" height="6" rx="1" />
        <rect x="16" y="11" width="6" height="6" rx="1" />
        <rect x="2" y="19" width="6" height="3" rx="1" />
        <rect x="9" y="19" width="6" height="3" rx="1" />
        <rect x="16" y="19" width="6" height="3" rx="1" />
      </svg>
    ),
  },
  {
    label: 'Reports',
    path: '/reports',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    label: 'Analytics',
    path: '/analytics',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
];

export function BottomTabs() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="bottom-tabs">
      {tabs.map((tab) => {
        const active = pathname === tab.path;
        return (
          <button
            key={tab.path}
            type="button"
            className={`tab-btn ${active ? 'active' : ''}`}
            onClick={() => router.push(tab.path)}
            aria-current={active ? 'page' : undefined}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}