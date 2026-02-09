import React from 'react';
import PublicLayout from './PublicLayout';

export function PublicServices() {
  return (
    <PublicLayout
      bodyClassName="no-header wsite-page-services-rates full-width-on wsite-theme-light"
      title="Services & Rates - Little Sparrows Academy"
    >
      <div id="wsite-content" className="wsite-elements wsite-not-footer">
        <div className="wsite-section-wrap">
          <div
            className="wsite-section wsite-body-section wsite-section-bg-image wsite-section-effect-parallax wsite-background-6 wsite-custom-background"
            style={{
              backgroundImage:
                'url("//cdn2.editmysite.com/images/editor/theme-background/stock/Dawn-Sky.jpg")',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: '50% 50%',
              backgroundSize: 'cover',
              backgroundColor: 'transparent',
              backgroundAttachment: 'scroll',
            }}
          >
            <div className="wsite-section-content">
              <div className="container">
                <div className="wsite-section-elements">
                  <h2 className="wsite-content-title" style={{ textAlign: 'center' }}>
                    <font color="#ffffff">What We Provide</font>
                  </h2>

                  <div>
                    <div style={{ height: '20px', overflow: 'hidden', width: '100%' }}></div>
                    <hr className="styled-hr" style={{ width: '100%' }} />
                    <div style={{ height: '20px', overflow: 'hidden', width: '100%' }}></div>
                  </div>

                  <div className="paragraph" style={{ textAlign: 'center' }}>
                    <font color="#ffffff">
                      We are a licensed, in home facility and we are proud to share that we take
                      part in the current government subsidies provided which aims to lower
                      families' fees. As government subsidies and grants tend to change every year,
                      please reach out to us to know more about our current fees.
                      <br />
                      <br />
                      Our program provides healthy morning and afternoon snacks, on which we follow
                      the Canada Food Guide.
                      &nbsp;
                      <br />
                      &#8203;
                      <br />
                      We follow the current licensing ratio guidelines which is 1 educator: 4
                      children.
                      &nbsp;
                    </font>
                  </div>

                  <div className="wsite-spacer" style={{ height: '50px' }}></div>

                  <div>
                    <div className="wsite-multicol">
                      <div className="wsite-multicol-table-wrap" style={{ margin: '0 -5px' }}>
                        <table className="wsite-multicol-table">
                          <tbody className="wsite-multicol-tbody">
                            <tr className="wsite-multicol-tr">
                              <td className="wsite-multicol-col" style={{ width: '33.333333333333%', padding: '0 5px' }}>
                                <div>
                                  <div
                                    className="wsite-image wsite-image-border-none"
                                    style={{
                                      paddingTop: '0px',
                                      paddingBottom: '0px',
                                      marginLeft: '0px',
                                      marginRight: '0px',
                                      textAlign: 'center',
                                    }}
                                  >
                                    <a>
                                      <img
                                        src="/uploads/1/4/8/8/148835555/whatsapp-image-2024-03-13-at-21-59-08-9ad2e542_orig.jpg"
                                        alt="Picture"
                                        style={{ width: 'auto', maxWidth: '100%' }}
                                      />
                                    </a>
                                    <div style={{ display: 'block', fontSize: '90%' }}></div>
                                  </div>
                                </div>
                              </td>
                              <td className="wsite-multicol-col" style={{ width: '33.333333333333%', padding: '0 5px' }}>
                                <div>
                                  <div
                                    className="wsite-image wsite-image-border-none"
                                    style={{
                                      paddingTop: '0px',
                                      paddingBottom: '0px',
                                      marginLeft: '0px',
                                      marginRight: '0px',
                                      textAlign: 'center',
                                    }}
                                  >
                                    <a>
                                      <img
                                        src="/uploads/1/4/8/8/148835555/whatsapp-image-2024-03-13-at-21-59-07-1d5162a7_orig.jpg"
                                        alt="Picture"
                                        style={{ width: 'auto', maxWidth: '100%' }}
                                      />
                                    </a>
                                    <div style={{ display: 'block', fontSize: '90%' }}></div>
                                  </div>
                                </div>
                              </td>
                              <td className="wsite-multicol-col" style={{ width: '33.333333333333%', padding: '0 5px' }}>
                                <div>
                                  <div
                                    className="wsite-image wsite-image-border-none"
                                    style={{
                                      paddingTop: '0px',
                                      paddingBottom: '0px',
                                      marginLeft: '0px',
                                      marginRight: '0px',
                                      textAlign: 'center',
                                    }}
                                  >
                                    <a>
                                      <img
                                        src="/uploads/1/4/8/8/148835555/whatsapp-image-2024-03-13-at-21-59-07-447090df_orig.jpg"
                                        alt="Picture"
                                        style={{ width: 'auto', maxWidth: '100%' }}
                                      />
                                    </a>
                                    <div style={{ display: 'block', fontSize: '90%' }}></div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <div className="wsite-spacer" style={{ height: '80px' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

export default PublicServices;
