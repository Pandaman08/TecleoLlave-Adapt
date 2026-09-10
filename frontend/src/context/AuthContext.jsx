import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [userId, setUserId] = useState(() => {
    const id = localStorage.getItem('current_user_id');
    return id ? parseInt(id, 10) : null;
  });
  const [username, setUsername] = useState(() => localStorage.getItem('current_username') || '');
  const [role, setRole] = useState(() => localStorage.getItem('current_role') || 'user');

  const login = ({ token: newToken, userId: newUserId, username: newUsername, role: newRole }) => {
    const finalRole = newRole || 'user';
    setToken(newToken);
    setUserId(newUserId || null);
    setUsername(newUsername || '');
    setRole(finalRole);

    if (newToken) localStorage.setItem('token', newToken);
    if (newUserId) localStorage.setItem('current_user_id', String(newUserId));
    if (newUsername) localStorage.setItem('current_username', newUsername);
    localStorage.setItem('current_role', finalRole);
  };

  const logout = () => {
    setToken(null);
    setUserId(null);
    setUsername('');
    setRole('user');

    localStorage.removeItem('token');
    localStorage.removeItem('current_user_id');
    localStorage.removeItem('current_username');
    localStorage.removeItem('current_role');
  };

  const isAuthenticated = Boolean(token);
  const isAdmin = role === 'admin';
  const isUser = role === 'user';

  return (
    <AuthContext.Provider
      value={{
        token,
        userId,
        username,
        role,
        isAuthenticated,
        isAdmin,
        isUser,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
