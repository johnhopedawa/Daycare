import React from 'react';
import PublicLayout from './PublicLayout';

const banner = (
  <div className="wsite-elements wsite-not-footer wsite-header-elements">
    <div className="wsite-section-wrap">
      <div
        className="wsite-section wsite-header-section wsite-section-bg-image wsite-section-effect-parallax"
        style={{
          backgroundImage:
            'url("/uploads/1/4/8/8/148835555/background-images/747541575.jpg")',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: '50.00% 47.91%',
          backgroundSize: 'cover',
          backgroundColor: 'transparent',
          backgroundAttachment: 'scroll',
        }}
      >
        <div className="wsite-section-content">
          <div id="banner">
            <div id="banner-container">
              <div className="wsite-section-elements">
                <h2 className="wsite-content-title">Policies</h2>
              </div>
            </div>
          </div>
        </div>
        <div></div>
      </div>
    </div>
  </div>
);

export function PublicPolicies() {
  return (
    <PublicLayout
      bodyClassName="header-page wsite-page-policies full-width-on wsite-theme-light"
      banner={banner}
      title="Policies - Little Sparrows Academy"
    >
      <div id="wsite-content" className="wsite-elements wsite-not-footer">
        <div className="wsite-section-wrap">
          <div className="wsite-section wsite-body-section wsite-background-13 wsite-custom-background">
            <div className="wsite-section-content">
              <div className="container">
                <div className="wsite-section-elements">
                  <div>
                    <div className="wsite-multicol">
                      <div className="wsite-multicol-table-wrap" style={{ margin: '0 -15px' }}>
                        <table className="wsite-multicol-table">
                          <tbody className="wsite-multicol-tbody">
                            <tr className="wsite-multicol-tr">
                              <td className="wsite-multicol-col" style={{ width: '50%', padding: '0 15px' }}>
                                <div>
                                  <div style={{ margin: '10px 0 0 -10px' }}>
                                    <a
                                      title="Download file: PARENT HANDBOOK"
                                      href="/uploads/1/4/8/8/148835555/parent_handbook.pdf"
                                    >
                                      <img
                                        src="//www.weebly.com/weebly/images/file_icons/pdf.png"
                                        width="36"
                                        height="36"
                                        style={{
                                          float: 'left',
                                          position: 'relative',
                                          left: '0px',
                                          top: '0px',
                                          margin: '0 15px 15px 0',
                                          border: 0,
                                        }}
                                        alt="PDF"
                                      />
                                    </a>
                                    <div style={{ float: 'left', textAlign: 'left', position: 'relative' }}>
                                      <table style={{ fontSize: '12px', fontFamily: 'tahoma', lineHeight: '.9' }}>
                                        <tbody>
                                          <tr>
                                            <td colSpan="2">
                                              <b> PARENT HANDBOOK</b>
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                      <a
                                        title="Download file: PARENT HANDBOOK"
                                        href="/uploads/1/4/8/8/148835555/parent_handbook.pdf"
                                        style={{ fontWeight: 'bold' }}
                                      >
                                        Download File
                                      </a>
                                    </div>
                                  </div>
                                  <hr style={{ clear: 'both', width: '100%', visibility: 'hidden' }} />
                                </div>
                              </td>
                              <td className="wsite-multicol-col" style={{ width: '50%', padding: '0 15px' }}>
                                <div>
                                  <div style={{ margin: '10px 0 0 -10px' }}>
                                    <a
                                      title="Download file: POLICIES"
                                      href="/uploads/1/4/8/8/148835555/policies.pdf"
                                    >
                                      <img
                                        src="//www.weebly.com/weebly/images/file_icons/pdf.png"
                                        width="36"
                                        height="36"
                                        style={{
                                          float: 'left',
                                          position: 'relative',
                                          left: '0px',
                                          top: '0px',
                                          margin: '0 15px 15px 0',
                                          border: 0,
                                        }}
                                        alt="PDF"
                                      />
                                    </a>
                                    <div style={{ float: 'left', textAlign: 'left', position: 'relative' }}>
                                      <table style={{ fontSize: '12px', fontFamily: 'tahoma', lineHeight: '.9' }}>
                                        <tbody>
                                          <tr>
                                            <td colSpan="2">
                                              <b> POLICIES</b>
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                      <a
                                        title="Download file: POLICIES"
                                        href="/uploads/1/4/8/8/148835555/policies.pdf"
                                        style={{ fontWeight: 'bold' }}
                                      >
                                        Download File
                                      </a>
                                    </div>
                                  </div>
                                  <hr style={{ clear: 'both', width: '100%', visibility: 'hidden' }} />
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
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

export default PublicPolicies;
