import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DynamicFieldBuilder from '../components/DynamicFieldBuilder';
import api from '../services/api';

function CreateForm() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    fields: [],
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleTitleChange = (e) => {
    setFormData({ ...formData, title: e.target.value });
  };

  const handleDescriptionChange = (e) => {
    setFormData({ ...formData, description: e.target.value });
  };

  const handleFieldsChange = (fields) => {
    setFormData({ ...formData, fields });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/forms', formData);
      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating form:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-form-container">
      <h2>Create Feedback Form</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Form Title"
          value={formData.title}
          onChange={handleTitleChange}
          required
        />
        <textarea
          placeholder="Form Description"
          value={formData.description}
          onChange={handleDescriptionChange}
        />
        <DynamicFieldBuilder
          fields={formData.fields}
          onChange={handleFieldsChange}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Form'}
        </button>
      </form>
    </div>
  );
}

export default CreateForm;
