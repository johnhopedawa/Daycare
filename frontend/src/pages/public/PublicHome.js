import React, { useEffect, useState } from 'react';
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
          height: 'min(74vh, 560px)',
          minHeight: '420px',
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
                <div className="wsite-spacer" style={{ height: '58px' }}></div>
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
                  <a className="wsite-button wsite-button-large wsite-button-highlight" href="/contact">
                    <span className="wsite-button-inner">
                      <span>
                        <strong>Contact Us</strong>
                      </span>
                    </span>
                  </a>
                  <div style={{ height: '10px', overflow: 'hidden' }}></div>
                </div>
                <div className="wsite-spacer" style={{ height: '44px' }}></div>
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
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const isLightboxOpen = lightboxIndex !== null;
  const activeImage = isLightboxOpen ? galleryItems[lightboxIndex] : null;

  const openLightbox = (index) => {
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const showNextImage = () => {
    setLightboxIndex((previousIndex) => {
      if (previousIndex === null) {
        return 0;
      }
      return (previousIndex + 1) % galleryItems.length;
    });
  };

  const showPreviousImage = () => {
    setLightboxIndex((previousIndex) => {
      if (previousIndex === null) {
        return galleryItems.length - 1;
      }
      return (previousIndex - 1 + galleryItems.length) % galleryItems.length;
    });
  };

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    if (isLightboxOpen) {
      document.body.classList.add('public-gallery-lightbox-open');
    } else {
      document.body.classList.remove('public-gallery-lightbox-open');
    }

    return () => {
      document.body.classList.remove('public-gallery-lightbox-open');
    };
  }, [isLightboxOpen]);

  useEffect(() => {
    if (typeof window === 'undefined' || !isLightboxOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setLightboxIndex(null);
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setLightboxIndex((previousIndex) => {
          if (previousIndex === null) {
            return galleryItems.length - 1;
          }
          return (previousIndex - 1 + galleryItems.length) % galleryItems.length;
        });
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setLightboxIndex((previousIndex) => {
          if (previousIndex === null) {
            return 0;
          }
          return (previousIndex + 1) % galleryItems.length;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLightboxOpen]);

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
                          className="public-home-gallery-item"
                          id={`496520863490730145-imageContainer${index}`}
                          style={{ margin: 0 }}
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
                                <button
                                  type="button"
                                  className="public-home-gallery-trigger"
                                  onClick={() => openLightbox(index)}
                                  aria-label={`Open gallery image ${index + 1}`}
                                >
                                  <img
                                    src={item.thumb}
                                    className="galleryImage"
                                    alt={`Gallery ${index + 1}`}
                                    style={item.style}
                                  />
                                </button>
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

      {isLightboxOpen && activeImage ? (
        <div
          className="public-gallery-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Gallery image viewer"
          onClick={closeLightbox}
        >
          <div
            className="public-gallery-lightbox-stage"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="public-gallery-lightbox-hotspot is-prev"
              onClick={showPreviousImage}
              aria-label="Previous image"
            ></button>
            <button
              type="button"
              className="public-gallery-lightbox-hotspot is-next"
              onClick={showNextImage}
              aria-label="Next image"
            ></button>

            <img
              src={activeImage.full}
              className="public-gallery-lightbox-image"
              alt={`Gallery ${lightboxIndex + 1}`}
            />

            <button
              type="button"
              className="public-gallery-lightbox-close"
              onClick={closeLightbox}
              aria-label="Close gallery"
            >
              &#10005;
            </button>
            <div className="public-gallery-lightbox-count">
              {lightboxIndex + 1} / {galleryItems.length}
            </div>
          </div>
        </div>
      ) : null}
    </PublicLayout>
  );
}

export default PublicHome;
