import React from 'react';
import PublicLayout from './PublicLayout';

export function PublicDirector() {
  return (
    <PublicLayout
      bodyClassName="no-header wsite-page-about-the-director full-width-on wsite-theme-light"
      title="About the Director - Little Sparrows Academy"
    >
      <div id="wsite-content" className="wsite-elements wsite-not-footer">
        <div className="wsite-section-wrap">
          <div
            className="wsite-section wsite-body-section wsite-section-bg-image wsite-background-10 wsite-custom-background"
            style={{
              backgroundImage:
                'url("//cdn2.editmysite.com/images/editor/theme-background/stock/Dawn-Sky.jpg")',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: '0% 0%',
              backgroundSize: 'cover',
              backgroundColor: 'transparent',
            }}
          >
            <div className="wsite-section-content">
              <div className="container">
                <div className="wsite-section-elements">
                  <div className="wsite-spacer" style={{ height: '50px' }}></div>

                  <h2 className="wsite-content-title" style={{ textAlign: 'center' }}>
                    <font color="#ffffff">Meet the Director</font>
                  </h2>

                  <div>
                    <div style={{ height: '20px', overflow: 'hidden', width: '100%' }}></div>
                    <hr className="styled-hr" style={{ width: '100%' }} />
                    <div style={{ height: '20px', overflow: 'hidden', width: '100%' }}></div>
                  </div>

                  <div>
                    <div className="wsite-multicol">
                      <div className="wsite-multicol-table-wrap" style={{ margin: '0 -15px' }}>
                        <table className="wsite-multicol-table">
                          <tbody className="wsite-multicol-tbody">
                            <tr className="wsite-multicol-tr">
                              <td className="wsite-multicol-col" style={{ width: '60.615711252654%', padding: '0 15px' }}>
                                <span
                                  className="imgPusher"
                                  style={{ float: 'left', height: '0px' }}
                                ></span>
                                <span
                                  style={{
                                    display: 'table',
                                    width: '203px',
                                    position: 'relative',
                                    float: 'left',
                                    maxWidth: '100%',
                                    clear: 'left',
                                    marginTop: '0px',
                                  }}
                                >
                                  <a>
                                    <img
                                      src="/uploads/1/4/8/8/148835555/published/faith-headshot.png"
                                      style={{
                                        marginTop: '5px',
                                        marginBottom: '10px',
                                        marginLeft: '0px',
                                        marginRight: '10px',
                                        borderWidth: '1px',
                                        padding: '3px',
                                        maxWidth: '100%',
                                      }}
                                      alt="Picture"
                                      className="galleryImageBorder wsite-image"
                                    />
                                  </a>
                                  <span
                                    style={{
                                      display: 'table-caption',
                                      captionSide: 'bottom',
                                      fontSize: '90%',
                                      marginTop: '-10px',
                                      marginBottom: '10px',
                                      textAlign: 'center',
                                    }}
                                    className="wsite-caption"
                                  ></span>
                                </span>
                                <div className="paragraph" style={{ display: 'block' }}>
                                  <font color="#ffffff">
                                    Faith is a passionate early childhood educator who completed her
                                    Bachelor's Degree in ECCE at Capilano University. Along with her
                                    ECE certification, she also has her specialized certifications
                                    (Infant/Toddler, Special Needs) which has allowed her to work
                                    with different children with diverse abilities and backgrounds.
                                    She finds joy in the simple things and hopes to be a light in
                                    young children's lives.
                                    &#8203;
                                  </font>
                                  <br />
                                  <br />
                                  <span style={{ color: 'rgb(255, 255, 255)' }}>
                                    As we welcome your family into our space, we want to let you know
                                    that we are here to support you in ways that we can. Please do not
                                    hesitate to reach us for any questions or concerns you may have.
                                    &nbsp;
                                  </span>
                                  &#8203;
                                </div>
                                <hr style={{ width: '100%', clear: 'both', visibility: 'hidden' }} />
                              </td>
                              <td className="wsite-multicol-col" style={{ width: '39.384288747346%', padding: '0 15px' }}>
                                <div>
                                  <div
                                    className="wsite-image wsite-image-border-medium"
                                    style={{
                                      paddingTop: '5px',
                                      paddingBottom: '10px',
                                      marginLeft: '0px',
                                      marginRight: '10px',
                                      textAlign: 'left',
                                    }}
                                  >
                                    <a>
                                      <img
                                        src="/uploads/1/4/8/8/148835555/editor/faith-family.png"
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

                  <div className="wsite-spacer" style={{ height: '67px' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

export default PublicDirector;
