import React, { useEffect, useLayoutEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const styleLinks = [
  { id: 'public-weebly-sites', href: 'https://cdn2.editmysite.com/css/sites.css?buildTime=1715364408' },
  { id: 'public-weebly-fancybox', href: 'https://cdn2.editmysite.com/css/old/fancybox.css?1715364408' },
  { id: 'public-weebly-social-icons', href: 'https://cdn2.editmysite.com/css/social-icons.css?buildtime=1715364408' },
  { id: 'public-main-style', href: '/files/main_style.css' },
  { id: 'public-fonts', href: '/fonts.css' },
  { id: 'public-overrides', href: '/public-overrides.css' },
];

const navItems = [
  { label: 'Home', path: '/', pageId: '282035976519147359' },
  { label: 'Vision', path: '/vision', pageId: '954230238545219624' },
  { label: 'Services & Rates', path: '/services-rates', pageId: '887084743897799948' },
  { label: 'About the Director', path: '/about-the-director', pageId: '567194535950592543' },
  { label: 'Policies', path: '/policies', pageId: '662356911994996210' },
  { label: 'Contact & Hours', path: '/contact', pageId: '118016740449386557' },
];

let publicBodyClasses = [];

export function PublicLayout({ bodyClassName, children, banner, title }) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const configuredPortalBase = (process.env.REACT_APP_PORTAL_BASE_URL || '').trim().replace(/\/$/, '');

  const isLocalDevHost = (() => {
    if (typeof window === 'undefined') {
      return false;
    }
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  })();

  const portalBaseUrl = (() => {
    if (configuredPortalBase) {
      return configuredPortalBase;
    }
    if (typeof window === 'undefined') {
      return '';
    }
    if (isLocalDevHost) {
      return window.location.origin;
    }

    const { protocol, hostname, port } = window.location;
    const baseHost = hostname.replace(/^www\./, '').replace(/^portal\./, '');
    const portSuffix = port ? `:${port}` : '';
    return `${protocol}//portal.${baseHost}${portSuffix}`;
  })();

  const staffPortalHref = isLocalDevHost
    ? `${portalBaseUrl}/staff?mode=portal`
    : `${portalBaseUrl}/staff`;
  const parentPortalHref = isLocalDevHost
    ? `${portalBaseUrl}/parents?mode=portal`
    : `${portalBaseUrl}/parents`;

  useLayoutEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    publicBodyClasses.forEach((cls) => document.body.classList.remove(cls));

    const classes = ['public-site'];
    if (bodyClassName) {
      classes.push(...bodyClassName.split(' ').filter(Boolean));
    }

    classes.forEach((cls) => document.body.classList.add(cls));
    publicBodyClasses = classes;

    return undefined;
  }, [bodyClassName]);

  useEffect(() => {
    if (typeof document === 'undefined' || !title) {
      return undefined;
    }
    const previousTitle = document.title;
    document.title = title;
    return () => {
      document.title = previousTitle;
    };
  }, [title]);

  useLayoutEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }
    styleLinks.forEach(({ id, href }) => {
      if (document.getElementById(id)) {
        return;
      }
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = href;
      link.dataset.publicSite = 'true';
      document.head.appendChild(link);
    });
    return undefined;
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    if (menuOpen) {
      document.body.classList.add('menu-open');
    } else {
      document.body.classList.remove('menu-open');
    }

    return () => {
      document.body.classList.remove('menu-open');
    };
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const isActivePath = (path) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname === '/index.html';
    }
    return location.pathname === path;
  };

  return (
    <div className="body-wrap">
      <div className="public-portals-cta" aria-label="Portal quick links">
        <a
          href={staffPortalHref}
          className="public-portals-cta-link wsite-button wsite-button-large wsite-button-highlight"
        >
          <span className="wsite-button-inner">Staff Portal</span>
        </a>
        <a
          href={parentPortalHref}
          className="public-portals-cta-link wsite-button wsite-button-large wsite-button-highlight"
        >
          <span className="wsite-button-inner">Parent Portal</span>
        </a>
      </div>

      <div id="header">
        <div className="nav-trigger hamburger">
          <div
            className="open-btn"
            onClick={() => setMenuOpen((prev) => !prev)}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                setMenuOpen((prev) => !prev);
              }
            }}
            aria-label="Toggle navigation"
          >
            <span className="mobile"></span>
            <span className="mobile"></span>
            <span className="mobile"></span>
          </div>
        </div>

        <div id="sitename">
          <span className="wsite-logo">
            <Link to="/">
              <span id="wsite-title">Little Sparrows Academy</span>
            </Link>
          </span>
        </div>

      </div>

      <div id="wrapper">
        <div className="bg-wrapper">
          <div id="navigation">
            <ul className="wsite-menu-default">
              {navItems.map((item) => (
                <li
                  key={item.path}
                  className="wsite-menu-item-wrap"
                  id={isActivePath(item.path) ? 'active' : `pg${item.pageId}`}
                >
                  <Link to={item.path} className="wsite-menu-item">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {banner ? <div className="banner-wrap">{banner}</div> : null}

          <div id="content-wrapper">
            {children}
          </div>
        </div>

        <div id="footer"></div>
      </div>

      <div className="navmobile-wrapper">
        <div id="navmobile" className="nav">
          <ul className="wsite-menu-default">
            {navItems.map((item) => (
              <li
                key={`${item.path}-mobile`}
                className="wsite-menu-item-wrap"
                id={isActivePath(item.path) ? 'active' : `pg${item.pageId}`}
              >
                <Link to={item.path} className="wsite-menu-item">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default PublicLayout;
