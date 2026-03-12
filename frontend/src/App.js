import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CreateForm from './pages/CreateForm';
import PublicFeedback from './pages/PublicFeedback';
import FeedbackList from './pages/FeedbackList';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<PublicFeedback />} />
        <Route path="/feedback/:formId" element={<PublicFeedback />} />
        <Route path="/login" element={<Login />} />

        {/* Admin routes */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/feedbacks" element={<ProtectedRoute><FeedbackList /></ProtectedRoute>} />
        <Route path="/create-form" element={<ProtectedRoute><CreateForm /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
