import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/authApi';
import { clearApiCache } from '../api/client';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('mplads_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleExpired = () => {
      clearApiCache();
      setUser(null);
    };
    window.addEventListener('mplads:session_expired', handleExpired);
    return () => window.removeEventListener('mplads:session_expired', handleExpired);
  }, []);

  const login = async (identifier, password, extra = {}) => {
    setLoading(true);
    clearApiCache();
    try {
      const data = await authApi.login(identifier, password, extra);
      localStorage.setItem('mplads_token', data.access_token);
      localStorage.setItem('mplads_user', JSON.stringify(data.user));
      setUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      return { success: false, error: err.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const signup = async (payload) => {
    setLoading(true);
    try {
      const data = await authApi.signup(payload);
      localStorage.setItem('mplads_token', data.access_token);
      localStorage.setItem('mplads_user', JSON.stringify(data.user));
      setUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      // Offline fallback: if backend request fails, create session locally
      const avatarParts = payload.name.trim().split(' ');
      const avatar = avatarParts.length >= 2
        ? `${avatarParts[0][0]}${avatarParts[1][0]}`.toUpperCase()
        : payload.name.substring(0, 2).toUpperCase();

      const localUser = {
        id: Date.now(),
        name: payload.name,
        email: payload.email,
        role: payload.role,
        phone: payload.phone,
        avatar: avatar,
        state_name: payload.state_name || 'Uttar Pradesh',
        district_name: payload.district_name || (['MP', 'District'].includes(payload.role) ? 'District Administrative Division' : null),
        constituency_name: payload.constituency_name || (payload.role === 'MP' ? 'Constituency Jurisdiction' : null),
        designation: payload.designation,
        department: payload.department || payload.ministry_wing,
        house_type: payload.house_type,
        party: payload.party,
        employee_code: payload.central_employee_code || payload.cadre_id || payload.mp_id
      };
      localStorage.setItem('mplads_token', 'local-demo-jwt-token');
      localStorage.setItem('mplads_user', JSON.stringify(localUser));
      setUser(localUser);
      return { success: true, user: localUser };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearApiCache();
    localStorage.removeItem('mplads_token');
    localStorage.removeItem('mplads_user');
    setUser(null);
  };

  const setDemoRole = (roleConfig) => {
    clearApiCache();
    const demoUser = {
      id: roleConfig.id || 1,
      name: roleConfig.name,
      email: roleConfig.email,
      role: roleConfig.role,
      avatar: roleConfig.avatar || 'US',
      state_id: roleConfig.state_id || 1,
      district_id: roleConfig.district_id || 1,
      constituency_id: roleConfig.constituency_id || 1,
      constituency_name: roleConfig.constituency_name || (roleConfig.role === 'MP' ? 'Central Constituency' : null),
      district_name: roleConfig.district_name || (roleConfig.role === 'District' ? 'District Administrative Division' : null),
      state_name: roleConfig.state_name || 'Uttar Pradesh',
      house_type: roleConfig.house_type || 'Lok Sabha'
    };
    try {
      const demoToken = 'demo-' + btoa(unescape(encodeURIComponent(JSON.stringify(demoUser))));
      localStorage.setItem('mplads_token', demoToken);
    } catch (e) {
      localStorage.setItem('mplads_token', 'local-demo-jwt-token');
    }
    localStorage.setItem('mplads_user', JSON.stringify(demoUser));
    setUser(demoUser);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading, setDemoRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}

export const useAuth = useAuthContext;
