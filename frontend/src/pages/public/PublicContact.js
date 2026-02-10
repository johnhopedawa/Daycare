import React, { useState } from 'react';
import PublicLayout from './PublicLayout';
import api from '../../utils/api';

export function PublicContact() {
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

  const cardStyle = {
    maxWidth: '740px',
    margin: '24px auto 0',
    background: 'linear-gradient(180deg, #ffffff 0%, #f9faf9 100%)',
    border: '1px solid rgba(82,108,102,0.25)',
    borderRadius: '18px',
    padding: '28px',
    boxShadow: '0 18px 40px rgba(38, 50, 46, 0.12)',
  };

  const labelStyle = {
    display: 'block',
    fontWeight: 600,
    color: '#3f5853',
    marginBottom: '8px',
    fontSize: '14px',
    letterSpacing: '0.02em',
  };

  const inputStyle = {
    width: '100%',
    borderRadius: '12px',
    border: '1px solid #bfd0cc',
    background: '#fff',
    padding: '12px 14px',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const statusStyle = status
    ? {
      marginTop: '14px',
      padding: '12px 14px',
      borderRadius: '10px',
      border: `1px solid ${status.type === 'error' ? '#e0b1b1' : '#b8d9ce'}`,
      background: status.type === 'error' ? '#fdf1f1' : '#eefaf4',
      color: status.type === 'error' ? '#8a2d2d' : '#2f6b52',
      fontSize: '14px',
    }
    : null;

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

                  <form className="wsite-form" onSubmit={handleSubmit} style={cardStyle}>
                    <div style={{ marginBottom: '14px', color: '#5d7a73', fontSize: '13px' }}>
                      <span className="form-required">*</span> Required fields
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                      <div>
                        <label style={labelStyle} htmlFor="contact-first-name">
                          First Name <span className="form-required">*</span>
                        </label>
                        <input
                          aria-required="true"
                          id="contact-first-name"
                          style={inputStyle}
                          type="text"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleChange}
                          required
                        />
                      </div>

                      <div>
                        <label style={labelStyle} htmlFor="contact-last-name">
                          Last Name <span className="form-required">*</span>
                        </label>
                        <input
                          aria-required="true"
                          id="contact-last-name"
                          style={inputStyle}
                          type="text"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: '14px' }}>
                      <label style={labelStyle} htmlFor="contact-email">
                        Email <span className="form-required">*</span>
                      </label>
                      <input
                        aria-required="true"
                        id="contact-email"
                        style={inputStyle}
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div style={{ marginTop: '14px' }}>
                      <label style={labelStyle} htmlFor="contact-message">
                        Message <span className="form-required">*</span>
                      </label>
                      <textarea
                        aria-required="true"
                        id="contact-message"
                        style={{ ...inputStyle, minHeight: '140px', resize: 'vertical' }}
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div style={{ textAlign: 'left', marginTop: '18px' }}>
                      <button
                        type="submit"
                        className="wsite-button wsite-button-large wsite-button-highlight"
                        disabled={submitting}
                        style={{ opacity: submitting ? 0.75 : 1, cursor: submitting ? 'wait' : 'pointer' }}
                      >
                        <span className="wsite-button-inner">
                          {submitting ? 'Sending...' : 'Send Message'}
                        </span>
                      </button>
                    </div>

                    {status ? <div style={statusStyle}>{status.message}</div> : null}
                  </form>

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
