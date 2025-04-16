// import React from 'react';
// import { createRoot } from 'react-dom/client';
// import { Meteor } from 'meteor/meteor';
// import { App } from '/imports/ui/App';

// Meteor.startup(() => {
//   const container = document.getElementById('react-target');
//   const root = createRoot(container);
//   root.render(<App />);
// });


// client/main.js
import { Meteor } from 'meteor/meteor';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../imports/startup/client/i18n';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from '../imports/ui/theme';
// import MainLayout from '../imports/ui/layouts/MainLayout';
import App from '../imports/ui/App';

Meteor.startup(() => {
  const container = document.getElementById('react-target');
  const root = createRoot(container);
  
  root.render(
    <BrowserRouter>
      <I18nextProvider i18n={i18n}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <App />
        </ThemeProvider>
      </I18nextProvider>
    </BrowserRouter>
  );
});