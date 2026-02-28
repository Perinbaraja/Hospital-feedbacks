import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

function PublicFeedback() {
  const { formId } = useParams();
  const [form, setForm] = useState(null);
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetchForm();
  }, [formId]);

  const fetchForm = async () => {
    try {
      const response = await api.get(`/forms/${formId}`);
      setForm(response.data);
      initializeResponses(response.data.fields);
    } catch (error) {
      console.error('Error fetching form:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeResponses = (fields) => {
    const initialResponses = {};
    fields.forEach((field) => {
      initialResponses[field._id] = '';
    });
    setResponses(initialResponses);
  };

  const handleInputChange = (fieldId, value) => {
    setResponses({ ...responses, [fieldId]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/feedback/${formId}`, { responses });
      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  if (loading) return <div>Loading form...</div>;
  if (!form) return <div>Form not found</div>;
  if (submitted) return <div>Thank you for your feedback!</div>;

  return (
    <div className="public-feedback-container">
      <h2>{form.title}</h2>
      <p>{form.description}</p>
      <form onSubmit={handleSubmit}>
        {form.fields.map((field) => (
          <div key={field._id} className="form-field">
            <label>{field.label}</label>
            <input
              type={field.type}
              value={responses[field._id]}
              onChange={(e) => handleInputChange(field._id, e.target.value)}
              required={field.required}
            />
          </div>
        ))}
        <button type="submit">Submit Feedback</button>
      </form>
    </div>
  );
}

export default PublicFeedback;
