import React from 'react';
import { Link } from 'react-router-dom';
import './styles/NotFound.css'; // optional styling

const NotFound = () => (
  <div className="not-found-container" style={{ padding: '40px', textAlign: 'center' }}>
    <h1 style={{ fontSize: '4rem', marginBottom: '20px' }}>404 - Page Not Found</h1>
    <p style={{ marginBottom: '30px' }}>Sorry, the page you are looking for does not exist.</p>
    <Link to="/" style={{ fontSize: '1.2rem', color: '#0066ff', textDecoration: 'none' }}>
      Go back to Home
    </Link>
  </div>
);

export default NotFound;
