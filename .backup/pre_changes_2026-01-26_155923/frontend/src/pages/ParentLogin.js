import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function ParentLogin() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to unified login
    navigate('/login');
  }, [navigate]);

  return null;
}

export default ParentLogin;
