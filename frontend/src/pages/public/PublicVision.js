import React from 'react';
import PublicLayout from './PublicLayout';

export function PublicVision() {
  return (
    <PublicLayout
      bodyClassName="no-header wsite-page-vision full-width-on wsite-theme-light"
      title="Vision - Little Sparrows Academy"
    >
      <div id="wsite-content" className="wsite-elements wsite-not-footer">
        <div className="wsite-section-wrap">
          <div
            className="wsite-section wsite-body-section wsite-section-bg-image wsite-section-effect-parallax wsite-background-1 wsite-custom-background"
            style={{
              height: '530px',
              backgroundImage:
                'url("/uploads/1/4/8/8/148835555/background-images/1128667981.jpg")',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: '44.27% 6.58%',
              backgroundSize: 'cover',
              backgroundColor: 'transparent',
              backgroundAttachment: 'scroll',
            }}
          >
            <div className="wsite-section-content">
              <div className="container">
                <div className="wsite-section-elements">
                  <h2 className="wsite-content-title" style={{ textAlign: 'center' }}>
                    <font color="#ffffff">Core Values</font>
                  </h2>

                  <div>
                    <div style={{ height: '20px', overflow: 'hidden', width: '100%' }}></div>
                    <hr className="styled-hr" style={{ width: '100%' }} />
                    <div style={{ height: '20px', overflow: 'hidden', width: '100%' }}></div>
                  </div>

                  <div className="paragraph" style={{ textAlign: 'center' }}>
                    <font color="#ffffff">
                      Who we are: We are an Infant and Toddler In-Home Based Childcare program
                      located in South Burnaby. Our curriculum and philosophy is play-based,
                      nature-based learning while also being Reggio Emilia inspired.
                      <br />
                      <br />
                      We believe that families are the child's first teachers, then educators,
                      and finally, the environment. Therefore, we aim to work in partnerships
                      always with our families and also with the rich environment surrounding us.
                      <br />
                      <br />
                      Our curriculum will be based on what inspires us, as we can (and are)
                      inspired by everything and everyone around us. We want to continue to spark
                      curiosity, creativity and collaboration through our curriculum and daily
                      activities. Our holistic and open-ended learning approach will provide many
                      opportunities for children to grow and be challenged, not only physically
                      but also mentally, emotionally and socially.
                      <br />
                      &#8203;
                      <br />
                      At its core and foundation, we want to create and maintain healthy
                      relationships between educators, children, families, along with our
                      environment in order to provide a positive learning space for everyone.
                      &nbsp;&#8203;
                    </font>
                  </div>

                  <div className="wsite-spacer" style={{ height: '63px' }}></div>
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

export default PublicVision;
