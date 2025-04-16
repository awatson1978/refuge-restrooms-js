// imports/ui/theme.js
import { createTheme, responsiveFontSizes } from '@mui/material/styles';

// Create a theme instance with the REFUGE Restrooms color scheme
let theme = createTheme({
  palette: {
    primary: {
      // Purple color from the original app
      main: '#8a6db1',
      light: '#a58bc9',
      dark: '#69509a',
      contrastText: '#fff',
    },
    secondary: {
      // Accessible blue color
      main: '#3e7ab9',
      light: '#6297d9',
      dark: '#2a5f9a',
      contrastText: '#fff',
    },
    success: {
      // Green for changing table
      main: '#41b076',
      light: '#65c994',
      dark: '#2d8855',
      contrastText: '#fff',
    },
    error: {
      main: '#e74c3c',
      light: '#fb6b5b',
      dark: '#c0392b',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    text: {
      primary: '#333333',
      secondary: '#666666',
    },
  },
  typography: {
    fontFamily: '"Lato", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 700,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 500,
    },
    h6: {
      fontWeight: 500,
    },
    button: {
      fontWeight: 500,
      textTransform: 'none',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
        },
        containedPrimary: {
          '&:hover': {
            backgroundColor: '#69509a',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          overflow: 'hidden',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 8,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        },
      },
    },
  },
});

// Make typography responsive
theme = responsiveFontSizes(theme);

export default theme;