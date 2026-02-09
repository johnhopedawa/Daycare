import React from 'react';
import PublicLayout from './PublicLayout';

export function PublicNotFound() {
  return (
    <PublicLayout
      bodyClassName="no-header wsite-page-not-found full-width-on wsite-theme-light"
      title="Page Not Found - Little Sparrows Academy"
    >
      <div id="wsite-content" className="wsite-elements wsite-not-footer">
        <div className="wsite-section-wrap">
          <div className="wsite-section wsite-body-section wsite-section-bg-color wsite-background-2 wsite-custom-background" style={{ backgroundColor: '#ffffff' }}>
            <div className="wsite-section-content">
              <div className="container">
                <div className="wsite-section-elements">
                  <h2 className="wsite-content-title" style={{ textAlign: 'center' }}>
                    Page Not Found
                  </h2>
                  <div className="paragraph" style={{ textAlign: 'center' }}>
                    The page you are looking for does not exist.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

export default PublicNotFound;
