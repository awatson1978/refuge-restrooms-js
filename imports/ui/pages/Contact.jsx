// imports/ui/pages/Contact.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, Link as RouterLink } from 'react-router-dom';
import { Meteor } from 'meteor/meteor';
import { 
  Box, 
  Container, 
  Paper, 
  Typography, 
  TextField, 
  Button, 
  Alert,
  CircularProgress,
  Snackbar,
  Divider
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTranslation } from 'react-i18next';
import ReCAPTCHA from 'react-google-recaptcha';

import MainLayout from '../layouts/MainLayout';
import { validateRecaptcha } from '../../utils/recaptcha';

// Helper to parse query parameters
const useQuery = () => {
  return new URLSearchParams(useLocation().search);
};

const Contact = () => {
  const { t } = useTranslation();
  const query = useQuery();
  
  // Get query parameters for restroom reports
  const restroomId = query.get('restroom_id');
  const restroomName = query.get('restroom_name');
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
    restroom_id: restroomId || '',
    restroom_name: restroomName || ''
  });
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [recaptchaValue, setRecaptchaValue] = useState('');
  
  // Handle form field changes
  const handleChange = (event) => {
    const { name, value } = event.target;
    
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  // Handle form submission
  const handleSubmit = async (event) => {
    event.preventDefault();
    
    // Validate form
    if (!formData.name || !formData.email || !formData.message) {
      setError(t('contact.missing-required-fields'));
      return;
    }
    
    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(formData.email)) {
      setError(t('contact.invalid-email'));
      return;
    }
    
    // Validate reCAPTCHA
    if (!recaptchaValue) {
      setError(t('contact.recaptcha-required'));
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Verify reCAPTCHA token
      const recaptchaValid = await validateRecaptcha(recaptchaValue);
      
      if (!recaptchaValid) {
        setError(t('contact.recaptcha-failed'));
        setLoading(false);
        return;
      }
      
      // Submit the contact form
      await Meteor.callAsync('contacts.submit', {
        ...formData,
        recaptchaToken: recaptchaValue
      });
      
      setSubmitted(true);
    } catch (err) {
      console.error('Contact submission error:', err);
      setError(err.reason || t('contact.submission-error'));
      setLoading(false);
    }
  };
  
  // Show success message after submission
  if (submitted) {
    return (
      <MainLayout>
        <Container maxWidth="md" sx={{ my: 4 }}>
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h4" color="primary" gutterBottom>
              {t('contact.thank-you')}
            </Typography>
            
            <Typography variant="body1" paragraph>
              {t('contact.we-will-get-back-to-you')}
            </Typography>
            
            <Button
              component={RouterLink}
              to="/"
              variant="contained"
              color="primary"
              sx={{ mt: 2 }}
            >
              {t('contact.back-to-home')}
            </Button>
          </Paper>
        </Container>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout>
      <Container maxWidth="md" sx={{ my: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Button
              component={RouterLink}
              to="/"
              startIcon={<ArrowBackIcon />}
              sx={{ mr: 2 }}
            >
              {t('common.back')}
            </Button>
            
            <Typography variant="h4" component="h1">
              {restroomId 
                ? t('contact.request-edit-for-restroom', { restroomName: decodeURIComponent(restroomName) })
                : t('contact.contact-title')}
            </Typography>
          </Box>
          
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          
          <form onSubmit={handleSubmit}>
            <TextField
              label={t('contact.form.name')}
              name="name"
              value={formData.name}
              onChange={handleChange}
              fullWidth
              required
              margin="normal"
            />
            
            <TextField
              label={t('contact.form.email')}
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              fullWidth
              required
              margin="normal"
            />
            
            <TextField
              label={t('contact.form.message')}
              name="message"
              value={formData.message}
              onChange={handleChange}
              fullWidth
              required
              multiline
              rows={10}
              margin="normal"
            />
            
            {/* Hidden fields for restroom information */}
            <input type="hidden" name="restroom_id" value={formData.restroom_id} />
            <input type="hidden" name="restroom_name" value={formData.restroom_name} />
            
            <Box sx={{ mt: 3, mb: 2 }}>
              <ReCAPTCHA
                sitekey={Meteor.settings.public.recaptchaSiteKey}
                onChange={setRecaptchaValue}
              />
            </Box>
            
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                disabled={loading || !recaptchaValue}
                startIcon={loading ? <CircularProgress size={24} /> : <SendIcon />}
              >
                {loading ? t('contact.sending') : t('contact.send')}
              </Button>
            </Box>
          </form>
        </Paper>
      </Container>
    </MainLayout>
  );
};

export default Contact;