// imports/ui/App-non-lazy.jsx
// A version of App.jsx without lazy loading for testing

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Import components directly (non-lazy)
import Home from './pages/Home';
import RestroomsList from './pages/RestroomsList';
import RestroomDetails from './pages/RestroomDetails';
import AddRestroom from './pages/AddRestroom';
import Contact from './pages/Contact';
import About from './pages/About';
import Signs from './pages/Signs';
import ApiDocs from './pages/ApiDocs';
import NotFound from './pages/NotFound';
import MapTest from './pages/MapTest';
import AdminPanel from './pages/AdminPanel';

const App = () => {
  return (
    <Routes>
      {/* Home page */}
      <Route path="/" element={<Home />} />
      
      {/* Restrooms routes */}
      <Route path="/restrooms">
        <Route index element={<RestroomsList />} />
        <Route path=":id" element={<RestroomDetails />} />
        <Route path="new" element={<AddRestroom />} />
        <Route path=":id/edit" element={<AddRestroom />} />
      </Route>
      
      {/* Static pages */}
      <Route path="/about" element={<About />} />
      <Route path="/signs" element={<Signs />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/admin" element={<AdminPanel />} />
      
      {/* API docs */}
      <Route path="/api/docs" element={<ApiDocs />} />
      
      {/* Map test page */}
      <Route path="/map-test" element={<MapTest />} />
      
      {/* Legacy routes - redirect to new structure */}
      <Route path="/restroom/:id" element={<Navigate to="/restrooms/:id" replace />} />
      <Route path="/submit" element={<Navigate to="/restrooms/new" replace />} />
      
      {/* 404 Not Found */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default App;