import React, { useRef, useState } from 'react';
import PublicLayout from './PublicLayout';
import api from '../../utils/api';

export function PublicContact() {
  const formRef = useRef(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) {
      return;
    }
    setStatus(null);
    setSubmitting(true);

    try {
      await api.post('/contact', {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        message: formData.message.trim(),
      });
      setStatus({ type: 'success', message: 'Thanks! Your message has been sent.' });
      setFormData({ firstName: '', lastName: '', email: '', message: '' });
    } catch (error) {
      const message = error.response?.data?.error || 'Something went wrong. Please try again.';
      setStatus({ type: 'error', message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicLayout
      bodyClassName="no-header wsite-page-contact-hours full-width-on wsite-theme-light"
      title="Contact & Hours - Little Sparrows Academy"
    >
      <div id="wsite-content" className="wsite-elements wsite-not-footer">
        <div className="wsite-section-wrap">
          <div
            className="wsite-section wsite-body-section wsite-section-bg-color wsite-background-11 wsite-custom-background"
            style={{ backgroundColor: '#e4e4e3', backgroundImage: 'none' }}
          >
            <div className="wsite-section-content">
              <div className="container">
                <div className="wsite-section-elements">
                  <h2 className="wsite-content-title" style={{ textAlign: 'center' }}>
                    Contact Us
                  </h2>

                  <div className="paragraph" style={{ textAlign: 'center' }}>
                    <font color="#728985">
                      &#8203;&#8203;Fill out our form below for more questions!
                    </font>
                  </div>

                  <div>
                    <div className="wsite-multicol">
                      <div className="wsite-multicol-table-wrap" style={{ margin: '0 -70px' }}>
                        <table className="wsite-multicol-table">
                          <tbody className="wsite-multicol-tbody">
                            <tr className="wsite-multicol-tr">
                              <td className="wsite-multicol-col" style={{ width: '23.106216841539%', padding: '0 70px' }}>
                                <div className="wsite-spacer" style={{ height: '50px' }}></div>
                              </td>
                              <td className="wsite-multicol-col" style={{ width: '60.134171026935%', padding: '0 70px' }}>
                                <div>
                                  <form ref={formRef} className="wsite-form" onSubmit={handleSubmit}>
                                    <div className="wsite-form-container" style={{ marginTop: '10px' }}>
                                      <ul className="formlist">
                                        <label className="wsite-form-label wsite-form-fields-required-label">
                                          <span className="form-required">*</span> Indicates required field
                                        </label>

                                        <div>
                                          <div className="wsite-form-field" style={{ margin: '5px 0px 5px 0px' }}>
                                            <label className="wsite-form-label" htmlFor="contact-first-name">
                                              First Name <span className="form-required">*</span>
                                            </label>
                                            <div className="wsite-form-input-container">
                                              <input
                                                aria-required="true"
                                                id="contact-first-name"
                                                className="wsite-form-input wsite-input wsite-input-width-370px"
                                                type="text"
                                                name="firstName"
                                                value={formData.firstName}
                                                onChange={handleChange}
                                                required
                                              />
                                            </div>
                                          </div>
                                        </div>

                                        <div>
                                          <div className="wsite-form-field" style={{ margin: '5px 0px 0px 0px' }}>
                                            <label className="wsite-form-label" htmlFor="contact-last-name">
                                              Last Name <span className="form-required">*</span>
                                            </label>
                                            <div className="wsite-form-input-container">
                                              <input
                                                aria-required="true"
                                                id="contact-last-name"
                                                className="wsite-form-input wsite-input wsite-input-width-370px"
                                                type="text"
                                                name="lastName"
                                                value={formData.lastName}
                                                onChange={handleChange}
                                                required
                                              />
                                            </div>
                                          </div>
                                        </div>

                                        <div>
                                          <div className="wsite-form-field" style={{ margin: '5px 0px 5px 0px' }}>
                                            <label className="wsite-form-label" htmlFor="contact-email">
                                              Email <span className="form-required">*</span>
                                            </label>
                                            <div className="wsite-form-input-container">
                                              <input
                                                aria-required="true"
                                                id="contact-email"
                                                className="wsite-form-input wsite-input wsite-input-width-370px"
                                                type="text"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                required
                                              />
                                            </div>
                                          </div>
                                        </div>

                                        <div>
                                          <div className="wsite-form-field" style={{ margin: '5px 0px 5px 0px' }}>
                                            <label className="wsite-form-label" htmlFor="contact-message">
                                              Message <span className="form-required">*</span>
                                            </label>
                                            <div className="wsite-form-input-container">
                                              <input
                                                aria-required="true"
                                                id="contact-message"
                                                className="wsite-form-input wsite-input wsite-input-width-370px"
                                                type="text"
                                                name="message"
                                                value={formData.message}
                                                onChange={handleChange}
                                                required
                                              />
                                            </div>
                                          </div>
                                        </div>

                                        <div className="wsite-spacer" style={{ height: '10px' }}></div>
                                      </ul>
                                    </div>

                                    <div style={{ textAlign: 'left', marginTop: '10px', marginBottom: '10px' }}>
                                      <a
                                        href="#"
                                        className="wsite-button"
                                        aria-disabled={submitting ? 'true' : undefined}
                                        onClick={(event) => {
                                          event.preventDefault();
                                          if (submitting) {
                                            return;
                                          }
                                          formRef.current?.requestSubmit();
                                        }}
                                      >
                                        <span className="wsite-button-inner">
                                          {submitting ? 'Submitting...' : 'Submit'}
                                        </span>
                                      </a>
                                    </div>

                                    {status ? (
                                      <div
                                        className={`public-contact-status ${
                                          status.type === 'error' ? 'error' : ''
                                        }`}
                                      >
                                        {status.message}
                                      </div>
                                    ) : null}
                                    <input
                                      type="submit"
                                      role="button"
                                      aria-label="Submit"
                                      value="Submit"
                                      style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: '-9999px',
                                        width: '1px',
                                        height: '1px',
                                      }}
                                    />
                                  </form>
                                </div>
                              </td>
                              <td className="wsite-multicol-col" style={{ width: '16.759612131525%', padding: '0 70px' }}>
                                <div className="wsite-spacer" style={{ height: '50px' }}></div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <div className="wsite-spacer" style={{ height: '50px' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="wsite-section-wrap">
          <div
            className="wsite-section wsite-body-section wsite-section-bg-color wsite-background-9 wsite-custom-background"
            style={{ backgroundColor: '#ffffff', backgroundImage: 'none', height: 'auto' }}
          >
            <div className="wsite-section-content">
              <div className="container">
                <div className="wsite-section-elements">
                  <div className="wsite-spacer" style={{ height: '10px' }}></div>

                  <div>
                    <div className="wsite-multicol">
                      <div className="wsite-multicol-table-wrap" style={{ margin: '0 -15px' }}>
                        <table className="wsite-multicol-table">
                          <tbody className="wsite-multicol-tbody">
                            <tr className="wsite-multicol-tr">
                              <td className="wsite-multicol-col" style={{ width: '31.810221251529%', padding: '0 15px' }}>
                                <h2 className="wsite-content-title" style={{ textAlign: 'left' }}>
                                  <font size="5">Hours</font>
                                </h2>
                                <div className="paragraph" style={{ textAlign: 'left' }}>
                                  Mon - Fri 9:00 A.M. - 5:00 P.M.
                                  <br />
                                  &#8203;Excluding stat holidays
                                  <br />
                                  &#8203;Closed on the last 2 weeks of December
                                  <br />
                                </div>

                                <h2 className="wsite-content-title" style={{ textAlign: 'left' }}>
                                  &#8203;<font size="5">Location</font>
                                </h2>

                                <div className="paragraph">South Burnaby along Gilley Ave<br /></div>
                              </td>
                              <td className="wsite-multicol-col" style={{ width: '58.51777902585%', padding: '0 15px' }}>
                                <div className="wsite-spacer" style={{ height: '50px' }}></div>
                                <div className="wsite-map">
                                  <iframe
                                    title="Little Sparrows Academy Map"
                                    allowTransparency="true"
                                    frameBorder="0"
                                    scrolling="no"
                                    style={{
                                      width: '100%',
                                      height: '300px',
                                      marginTop: '10px',
                                      marginBottom: '10px',
                                    }}
                                    src="//www.weebly.com/weebly/apps/generateMap.php?map=google&elementid=689344634729860203&ineditor=0&control=3&width=auto&height=300px&overviewmap=0&scalecontrol=0&typecontrol=0&zoom=15&long=-122.9720887&lat=49.2175233&domain=www&point=0&align=1&reseller=false"
                                  ></iframe>
                                </div>
                              </td>
                              <td className="wsite-multicol-col" style={{ width: '9.6719997226216%', padding: '0 15px' }}>
                                <div className="wsite-spacer" style={{ height: '50px' }}></div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <div className="wsite-spacer" style={{ height: '72px' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

export default PublicContact;
