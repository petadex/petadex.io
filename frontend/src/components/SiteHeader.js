import React from "react";
import { Link } from "gatsby";

/**
 * Shared site header component with navigation
 * Used across all pages for consistent navigation
 *
 * @param {string} currentPage - The current page identifier to highlight the active nav link
 *                               Values: 'home', 'sequence', 'enzymes', 'structure', 'metadata'
 */
const SiteHeader = ({ currentPage = '' }) => {
  // Navigation items configuration
  const navItems = [
    { label: 'Sequence', path: '/fastaa', key: 'sequence' },
    { label: 'Enzymes', path: '/enzymes', key: 'enzymes' },
    { label: 'Substrate', path: '/structure', key: 'structure' },
    { label: 'Metadata', path: '/metadata', key: 'metadata' }
  ];

  // Filter navigation items based on current page
  // - Home page: shows Sequence, Substrate, Metadata (no Enzymes)
  // - Other pages: hide self-reference link
  const visibleNavItems = navItems.filter(item => {
    if (currentPage === 'home') {
      return item.key !== 'enzymes'; // Home page doesn't show Enzymes
    }
    return item.key !== currentPage; // Other pages don't show self-reference
  });

  return (
    <header role="banner" className="ui-section-header">
      <div className="ui-layout-container">
        <div className="ui-section-header__layout ui-layout-flex">
          {/* LOGO */}
          <Link
            to="/"
            role="link"
            aria-label="PETadex Home"
            style={{ display: 'flex', alignItems: 'center' }}
          >
            <img
              src={require('../images/petadex-icon.png').default}
              alt="PETadex Logo"
              style={{ height: '48px', width: 'auto' }}
            />
          </Link>

          {/* NAVIGATION */}
          <nav style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            {visibleNavItems.map(item => (
              <Link
                key={item.key}
                to={item.path}
                style={{
                  textDecoration: 'none',
                  color: '#64748b',
                  fontWeight: '500',
                  fontSize: '0.95rem',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#2c3e50'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default SiteHeader;
