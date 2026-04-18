import React, { useState } from 'react';
import axios from 'axios';

const API_BASE = `${(import.meta as any).env?.VITE_API_URL || ''}/api/v1`;

export const ConnectDataset: React.FC<{ onConnected: (connId: string) => void }> = ({ onConnected }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'postgres',
    remote_url: '',
    secret: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTestConnection = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/connections`, formData);
      const connId = res.data.id;
      
      // Test the connection
      const testRes = await axios.post(`${API_BASE}/connections/${connId}/test`);
      if (testRes.data.success) {
        setMessage('✓ Connection successful!');
        setTimeout(() => onConnected(connId), 1000);
      } else {
        setMessage(`✗ Connection failed: ${testRes.data.error}`);
      }
    } catch (err: any) {
      setMessage(`✗ Error: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel">
      <h2>Connect Dataset</h2>
      <div className="form-group">
        <label>Connection Name</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g., prod_warehouse"
        />
      </div>
      <div className="form-group">
        <label>Data Source Type</label>
        <select name="type" value={formData.type} onChange={handleChange}>
          <option value="postgres">PostgreSQL</option>
          <option value="bigquery">BigQuery</option>
          <option value="csv">CSV File</option>
          <option value="parquet">Parquet File</option>
        </select>
      </div>
      <div className="form-group">
        <label>Connection URL / Path</label>
        <input
          type="text"
          name="remote_url"
          value={formData.remote_url}
          onChange={handleChange}
          placeholder="postgresql://localhost:5432/mydb or /path/to/file.csv"
        />
      </div>
      <div className="form-group">
        <label>Secret (user:password)</label>
        <input
          type="password"
          name="secret"
          value={formData.secret}
          onChange={handleChange}
          placeholder="user:password"
        />
      </div>
      <button onClick={handleTestConnection} disabled={loading}>
        {loading ? 'Testing...' : 'Test & Create Connection'}
      </button>
      {message && <p className={message.startsWith('✓') ? 'success' : 'error'}>{message}</p>}
    </div>
  );
};

export default ConnectDataset;
