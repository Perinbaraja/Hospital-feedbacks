import React, { useState } from 'react';

function DynamicFieldBuilder({ fields, onChange }) {
  const [fieldInput, setFieldInput] = useState({
    label: '',
    type: 'text',
    required: false,
  });

  const handleAddField = () => {
    if (fieldInput.label.trim()) {
      const newFields = [
        ...fields,
        {
          _id: Date.now(),
          ...fieldInput,
        },
      ];
      onChange(newFields);
      setFieldInput({ label: '', type: 'text', required: false });
    }
  };

  const handleRemoveField = (fieldId) => {
    const updatedFields = fields.filter((f) => f._id !== fieldId);
    onChange(updatedFields);
  };

  return (
    <div className="field-builder">
      <h3>Form Fields</h3>
      <div className="add-field">
        <input
          type="text"
          placeholder="Field Label"
          value={fieldInput.label}
          onChange={(e) =>
            setFieldInput({ ...fieldInput, label: e.target.value })
          }
        />
        <select
          value={fieldInput.type}
          onChange={(e) =>
            setFieldInput({ ...fieldInput, type: e.target.value })
          }
        >
          <option value="text">Text</option>
          <option value="textarea">Textarea</option>
          <option value="select">Select</option>
          <option value="checkbox">Checkbox</option>
          <option value="radio">Radio</option>
          <option value="date">Date</option>
        </select>
        <label>
          <input
            type="checkbox"
            checked={fieldInput.required}
            onChange={(e) =>
              setFieldInput({ ...fieldInput, required: e.target.checked })
            }
          />
          Required
        </label>
        <button type="button" onClick={handleAddField}>
          Add Field
        </button>
      </div>

      <div className="fields-list">
        {fields.map((field) => (
          <div key={field._id} className="field-item">
            <span>
              {field.label} ({field.type})
              {field.required && ' *'}
            </span>
            <button
              type="button"
              onClick={() => handleRemoveField(field._id)}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DynamicFieldBuilder;
