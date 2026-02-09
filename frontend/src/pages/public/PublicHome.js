import React from 'react';
import PublicLayout from './PublicLayout';

const galleryItems = [
  {
    full: '/uploads/1/4/8/8/148835555/whatsapp-image-2024-03-13-at-21-59-09-5a2cf8c0_orig.jpg',
    thumb: '/uploads/1/4/8/8/148835555/whatsapp-image-2024-03-13-at-21-59-09-5a2cf8c0.jpg',
    style: { position: 'absolute', border: 0, width: '112.57%', top: '0%', left: '-6.29%' },
  },
  {
    full: '/uploads/1/4/8/8/148835555/whatsapp-image-2024-03-13-at-21-59-08-b0014b90_orig.jpg',
    thumb: '/uploads/1/4/8/8/148835555/whatsapp-image-2024-03-13-at-21-59-08-b0014b90.jpg',
    style: { position: 'absolute', border: 0, width: '112.57%', top: '0%', left: '-6.29%' },
  },
  {
    full: '/uploads/1/4/8/8/148835555/whatsapp-image-2024-03-13-at-21-59-07-1d5162a7_orig.jpg',
    thumb: '/uploads/1/4/8/8/148835555/whatsapp-image-2024-03-13-at-21-59-07-1d5162a7.jpg',
    style: { position: 'absolute', border: 0, width: '112.57%', top: '0%', left: '-6.29%' },
  },
  {
    full: '/uploads/1/4/8/8/148835555/whatsapp-image-2024-03-13-at-21-59-07-b9df658f_orig.jpg',
    thumb: '/uploads/1/4/8/8/148835555/whatsapp-image-2024-03-13-at-21-59-07-b9df658f.jpg',
    style: { position: 'absolute', border: 0, width: '112.57%', top: '0%', left: '-6.29%' },
  },
  {
    full: '/uploads/1/4/8/8/148835555/whatsapp-image-2024-03-13-at-21-59-06-45ee476e_orig.jpg',
    thumb: '/uploads/1/4/8/8/148835555/whatsapp-image-2024-03-13-at-21-59-06-45ee476e.jpg',
    style: { position: 'absolute', border: 0, width: '100%', top: '-44.56%', left: '0%' },
  },
  {
    full: '/uploads/1/4/8/8/148835555/whatsapp-image-2024-03-13-at-21-59-06-aedbc0b5_orig.jpg',
    thumb: '/uploads/1/4/8/8/148835555/whatsapp-image-2024-03-13-at-21-59-06-aedbc0b5.jpg',
    style: { position: 'absolute', border: 0, width: '100%', top: '-50.06%', left: '0%' },
  },
  {
    full: '/uploads/1/4/8/8/148835555/whatsapp-image-2024-03-13-at-21-59-07-34a55c16_orig.jpg',
    thumb: '/uploads/1/4/8/8/148835555/whatsapp-image-2024-03-13-at-21-59-07-34a55c16.jpg',
    style: { position: 'absolute', border: 0, width: '112.57%', top: '0%', left: '-6.29%' },
  },
  {
    full: '/uploads/1/4/8/8/148835555/whatsapp-image-2024-03-13-at-21-59-05-b20cd8e7_orig.jpg',
    thumb: '/uploads/1/4/8/8/148835555/whatsapp-image-2024-03-13-at-21-59-05-b20cd8e7.jpg',
    style: { position: 'absolute', border: 0, width: '112.57%', top: '0%', left: '-6.29%' },
  },
  {
    full: '/uploads/1/4/8/8/148835555/whatsapp-image-2024-05-12-at-22-34-21-8602a493_orig.jpg',
    thumb: '/uploads/1/4/8/8/148835555/whatsapp-image-2024-05-12-at-22-34-21-8602a493.jpg',
    style: { position: 'absolute', border: 0, width: '100%', top: '-38.89%', left: '0%' },
  },
  {
    full: '/uploads/1/4/8/8/148835555/whatsapp-image-2024-05-12-at-22-33-20-c88d85c0_orig.jpg',
    thumb: '/uploads/1/4/8/8/148835555/whatsapp-image-2024-05-12-at-22-33-20-c88d85c0.jpg',
    style: { position: 'absolute', border: 0, width: '100%', top: '-38.89%', left: '0%' },
  },
  {
    full: '/uploads/1/4/8/8/148835555/whatsapp-image-2024-05-12-at-22-33-18-fed0a9d2_orig.jpg',
    thumb: '/uploads/1/4/8/8/148835555/whatsapp-image-2024-05-12-at-22-33-18-fed0a9d2.jpg',
    style: { position: 'absolute', border: 0, width: '100%', top: '-38.89%', left: '0%' },
  },
  {
    full: '/uploads/1/4/8/8/148835555/whatsapp-image-2024-03-13-at-21-59-07-d8787f5c_orig.jpg',
    thumb: '/uploads/1/4/8/8/148835555/whatsapp-image-2024-03-13-at-21-59-07-d8787f5c.jpg',
    style: { position: 'absolute', border: 0, width: '112.57%', top: '0%', left: '-6.29%' },
  },
];

const banner = (
  <div className="wsite-elements wsite-not-footer wsite-header-elements">
    <div className="wsite-section-wrap">
      <div
        className="wsite-section wsite-header-section wsite-section-bg-image wsite-section-effect-parallax"
        style={{
          verticalAlign: 'middle',
          height: '543px',
          backgroundImage:
            'url("/uploads/1/4/8/8/148835555/background-images/1730075260.jpg")',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: '50.00% 59.47%',
          backgroundSize: 'cover',
          backgroundColor: 'transparent',
          backgroundAttachment: 'scroll',
        }}
      >
        <div className="wsite-section-content">
          <div id="banner">
            <div id="banner-container">
              <div className="wsite-section-elements">
                <div className="wsite-spacer" style={{ height: '112px' }}></div>
                <div className="paragraph" style={{ textAlign: 'center' }}>
                  <span>
                    <strong>
                      <font size="4">New daycare in the Burnaby area</font>
                    </strong>
                  </span>
                </div>
                <h2 className="wsite-content-title" style={{ textAlign: 'center' }}>
                  &#8203;Open &amp; Enrolling
                </h2>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ height: '30px', overflow: 'hidden' }}></div>
                  <a className="wsite-button wsite-button-large wsite-button-highlight" href="/contact--hours.html">
                    <span className="wsite-button-inner">
                      <span>
                        <strong>Contact Us</strong>
                      </span>
                    </span>
                  </a>
                  <div style={{ height: '10px', overflow: 'hidden' }}></div>
                </div>
                <div className="wsite-spacer" style={{ height: '97px' }}></div>
              </div>
            </div>
          </div>
        </div>
        <div></div>
      </div>
    </div>
  </div>
);

export function PublicHome() {
  return (
    <PublicLayout
      bodyClassName="header-page wsite-page-index full-width-on wsite-theme-light"
      banner={banner}
      title="Little Sparrows Academy - Home"
    >
      <div id="wsite-content" className="wsite-elements wsite-not-footer">
        <div className="wsite-section-wrap">
          <div
            className="wsite-section wsite-body-section wsite-section-bg-color wsite-background-2 wsite-custom-background"
            style={{ backgroundColor: '#c3c1bd', backgroundImage: 'none' }}
          >
            <div className="wsite-section-content">
              <div className="container">
                <div className="wsite-section-elements">
                  <div className="paragraph" style={{ textAlign: 'center' }}>
                    <span>
                      <strong>
                        <font color="#526c66" size="7">
                          GALLERY
                        </font>
                      </strong>
                    </span>
                  </div>

                  <div>
                    <div style={{ height: '20px', overflow: 'hidden' }}></div>
                    <div
                      className="imageGallery"
                      style={{ lineHeight: '0px', padding: 0, margin: 0 }}
                    >
                      {galleryItems.map((item, index) => (
                        <div
                          key={item.thumb}
                          id={`496520863490730145-imageContainer${index}`}
                          style={{ float: 'left', width: '33.28%', margin: 0 }}
                        >
                          <div
                            id={`496520863490730145-insideImageContainer${index}`}
                            style={{ position: 'relative', margin: '5px' }}
                          >
                            <div
                              className="galleryImageHolder"
                              style={{
                                position: 'relative',
                                width: '100%',
                                padding: '0 0 75%',
                                overflow: 'hidden',
                              }}
                              >
                              <div className="galleryInnerImageHolder">
                                <a href={item.full} rel="lightbox[gallery496520863490730145]">
                                  <img
                                    src={item.thumb}
                                    className="galleryImage"
                                    alt="Gallery"
                                    style={item.style}
                                  />
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      <span
                        style={{ display: 'block', clear: 'both', height: '0px', overflow: 'hidden' }}
                      ></span>
                    </div>
                    <div style={{ height: '20px', overflow: 'hidden' }}></div>
                  </div>

                  <div className="wsite-spacer" style={{ height: '109px' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

export default PublicHome;
