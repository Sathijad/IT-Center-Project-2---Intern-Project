import { useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { COGNITO } from '../lib/cognito';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';

export default function Callback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const handledRef = useRef(false); // Prevent duplicate execution

  useEffect(() => {
    // Prevent double execution (common in dev mode with React.StrictMode)
    if (handledRef.current) {
      console.log('Callback already handled, skipping duplicate');
      return;
    }
    handledRef.current = true;

    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');

      const savedState = sessionStorage.getItem('pkce_state');
      if (!code || !state || state !== savedState) {
        console.error('State mismatch or missing code', { code: !!code, state: !!state, savedState: !!savedState });
        // Clear URL to prevent re-run
        window.history.replaceState({}, document.title, window.location.pathname);
        navigate('/login?error=state');
        return;
      }

      const codeVerifier = sessionStorage.getItem('pkce_code_verifier');
      if (!codeVerifier) {
        console.error('Code verifier not found in session storage');
        // Clear URL to prevent re-run
        window.history.replaceState({}, document.title, window.location.pathname);
        navigate('/login?error=verifier_missing');
        return;
      }

      const form = new URLSearchParams();
      form.set('grant_type', 'authorization_code');
      form.set('client_id', COGNITO.clientId);
      form.set('code', code);
      form.set('redirect_uri', COGNITO.redirectUri);
      form.set('code_verifier', codeVerifier);

      try {
        // Debug logging
        console.log('Exchanging token with params:', {
          grant_type: 'authorization_code',
          client_id: COGNITO.clientId,
          redirect_uri: COGNITO.redirectUri,
          code_length: code?.length,
          verifier_length: codeVerifier?.length
        });

        const tokenRes = await axios.post(
          `${COGNITO.domain}/oauth2/token`,
          form,
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        console.log('Token exchange successful');
        const { id_token, access_token, refresh_token, expires_in } = tokenRes.data;
        localStorage.setItem('id_token', id_token);
        localStorage.setItem('access_token', access_token);
        if (refresh_token) localStorage.setItem('refresh_token', refresh_token);
        localStorage.setItem('expires_at', String(Date.now() + expires_in * 1000));

        sessionStorage.removeItem('pkce_code_verifier');
        sessionStorage.removeItem('pkce_state');
        
        // Clear URL parameters to prevent re-running on re-render
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Fetch user details from backend
        try {
          const userResponse = await api.get('/api/v1/me');
          setUser(userResponse.data);
          console.log('User profile fetched successfully');
          
          // Mark login for this session (idempotent per JWT token)
          try {
            await api.post('/api/v1/sessions/mark-login');
            console.log('Login marked successfully');
          } catch (err) {
            console.error('Failed to mark login', err);
            // Don't fail the login flow if this fails
          }
        } catch (err) {
          console.error('Failed to fetch user details', err);
          // Navigate anyway as login was successful
        }
        
        navigate('/');
      } catch (err: any) {
        console.error('Token exchange failed', err);
        console.error('Error details:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status,
          code: err.code
        });
        // Clear URL to prevent re-run
        window.history.replaceState({}, document.title, window.location.pathname);
        navigate('/login?error=exchange_failed');
      }
    };

    handleCallback();
  }, [navigate, setUser]);

  return <div>Finishing login…</div>;
}
