import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = "http://localhost:8000";

// 모든 요청에 Authorization 자동 추가
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

const Page1 = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');   // UI 라벨이 email이어도 서버에는 username으로 보냄
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLoginClick = async () => {
    setError('');
    try {
      const response = await axios.post(
        `${API_URL}/auth/login`,
        { username, password },                         // ✅ JSON 바디
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (response.status === 200 && response.data.access_token) {
        localStorage.setItem('access_token', response.data.access_token); // ✅ 키 통일
        navigate('/dashboard');
      } else {
        setError('로그인에 성공했지만, 토큰을 받지 못했습니다.');
      }
    } catch (err) {
      console.error('login error:', err?.response?.status, err?.response?.data, err?.message);
      if (err.response?.data?.detail) {
        setError(typeof err.response.data.detail === 'string'
          ? err.response.data.detail
          : Array.isArray(err.response.data.detail)
            ? err.response.data.detail.map(d => d.msg).join('; ')
            : '로그인 중 오류가 발생했습니다.');
      } else {
        setError('네트워크 오류가 발생했습니다. 서버 상태를 확인해주세요.');
      }
    }
  };

  return (
    <div className="page1-container">
      <header className="page1-header">
        <h1 className="logo">Haeksim</h1>
      </header>

      <main className="login-main">
        <h2 className="login-title">시작하기</h2>
        <p className="login-subtitle">AI와 함께 실력을 향상시켜 보세요.</p>

        <form className="login-form" onSubmit={(e) => e.preventDefault()}>
          <input
            type="text"
            placeholder="Username"
            className="login-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            className="login-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

          <button type="button" className="login-button login-button-primary" onClick={handleLoginClick}>
            Login
          </button>

          <button type="button" className="login-button login-button-secondary" onClick={() => navigate('/sign-up')}>
            회원가입
          </button>
        </form>

        <div className="separator">------------------ 또는 ------------------</div>

        <div className="social-login-buttons">
          <button className="social-button google-button" onClick={() => console.log('Google login clicked')}>
            Google로 로그인
          </button>
          <button className="social-button kakao-button" onClick={() => console.log('Kakao login clicked')}>
            카카오로 로그인
          </button>
        </div>
      </main>

      <footer className="login-footer">
        <p>By continuing, you agree to our Terms of Service and Privacy Policy</p>
      </footer>
    </div>
  );
};

export default Page1;
