// frontend/src/pages/CreateGroup.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { ALL_CURRENCIES } from '../utils/currency';

function CreateGroup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    contribution_amount: 100,
    contribution_period: 'weekly',
    member_count: 5,
    rosca_type: 'random',
    currency: 'GBP'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await API.post('/groups/', {
        name: formData.name,
        description: formData.description,
        contribution_amount: Number(formData.contribution_amount),
        contribution_period: formData.contribution_period,
        member_count: Number(formData.member_count),
        rosca_type: formData.rosca_type,
        currency: formData.currency
      });
      alert('Group created successfully!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to create group:', error);
      alert('Failed to create group: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const inputStyle = { width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '5px', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' };
  const fieldStyle = { marginBottom: '1rem' };

  return (
    <div style={{ maxWidth: '600px', margin: '2rem auto', padding: '2rem', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>Create New Group</h1>

      <form onSubmit={handleSubmit}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Group Name</label>
          <input type="text" name="name" value={formData.name} onChange={handleChange} required style={inputStyle} />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Description</label>
          <textarea name="description" value={formData.description} onChange={handleChange} rows="3" style={inputStyle} />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Contribution Amount</label>
          <input type="number" name="contribution_amount" value={formData.contribution_amount} onChange={handleChange} required step="0.01" style={inputStyle} />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Currency</label>
          <select name="currency" value={formData.currency} onChange={handleChange} style={inputStyle}>
            {ALL_CURRENCIES.map(c => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Contribution Period</label>
          <select name="contribution_period" value={formData.contribution_period} onChange={handleChange} style={inputStyle}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Bi-Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Number of Members</label>
          <input type="number" name="member_count" value={formData.member_count} onChange={handleChange} required min="2" max="50" style={inputStyle} />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>ROSCA Type</label>
          <select name="rosca_type" value={formData.rosca_type} onChange={handleChange} style={inputStyle}>
            <option value="random">Random (Lottery)</option>
            <option value="fixed">Fixed Order</option>
            <option value="auction">Auction</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="button" onClick={() => navigate('/dashboard')}
            style={{ padding: '0.75rem 1.5rem', background: '#ccc', color: '#333', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            Cancel
          </button>
          <button type="submit" disabled={loading}
            style={{ padding: '0.75rem 1.5rem', background: loading ? '#999' : '#1a6b4a', color: 'white', border: 'none', borderRadius: '5px', cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateGroup;