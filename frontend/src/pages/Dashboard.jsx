import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function Dashboard() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      const response = await api.get('/forms');
      setForms(response.data);
    } catch (error) {
      console.error('Error fetching forms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateForm = () => {
    navigate('/create-form');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="dashboard-container">
      <h2>Dashboard</h2>
      <button onClick={handleCreateForm}>Create New Form</button>
      <button onClick={handleLogout}>Logout</button>
      
      <div className="forms-list">
        <h3>Your Forms</h3>
        {forms.length === 0 ? (
          <p>No forms created yet. Create one to get started!</p>
        ) : (
          <ul>
            {forms.map((form) => (
              <li key={form._id}>{form.title}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
