import { jwtDecode } from 'jwt-decode';

/**
 * Retrieves and decodes the current user from the stored JWT access token.
 * The function looks for the token in localStorage (primary) or sessionStorage.
 * If the token is missing or invalid/expired, it returns null.
 */
export const getUserFromToken = () => {
  const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
  if (!token) return null;
  try {
    const decoded = jwtDecode(token);
    // Check expiration (exp is seconds since epoch)
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      // Token expired – clean up storage
      localStorage.removeItem('access_token');
      sessionStorage.removeItem('access_token');
      return null;
    }
    return decoded;
  } catch (error) {
    console.error('Unable to decode JWT token:', error);
    return null;
  }
};
