import { useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { COGNITO } from '../lib/cognito';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';

export default function Callback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');

      const savedState = sessionStorage.getItem('pkce_state');
      if (!code || !state || state !== savedState) {
        console.error('State mismatch or missing code');
        navigate('/login?error=state');
        return;
      }

      const codeVerifier = sessionStorage.getItem('pkce_code_verifier') || '';

      const form = new URLSearchParams();
      form.set('grant_type', 'authorization_code');
      form.set('client_id', COGNITO.clientId);
      form.set('code', code);
      form.set('redirect_uri', COGNITO.redirectUri);
      form.set('code_verifier', codeVerifier);

      try {
        const tokenRes = await axios.post(
          `${COGNITO.domain}/oauth2/token`,
          form,
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const { id_token, access_token, refresh_token, expires_in } = tokenRes.data;
        localStorage.setItem('id_token', id_token);
        localStorage.setItem('access_token', access_token);
        if (refresh_token) localStorage.setItem('refresh_token', refresh_token);
        localStorage.setItem('expires_at', String(Date.now() + expires_in * 1000));

        sessionStorage.removeItem('pkce_code_verifier');
        sessionStorage.removeItem('pkce_state');
        
        // Fetch user details from backend
        try {
          const userResponse = await api.get('/api/v1/me');
          setUser(userResponse.data);
        } catch (err) {
          console.error('Failed to fetch user details', err);
        }
        
        navigate('/');
      } catch (err) {
        console.error('Token exchange failed', err);
        navigate('/login?error=exchange_failed');
      }
    };

    handleCallback();
  }, [navigate, setUser]);

  return <div>Finishing login…</div>;
}
