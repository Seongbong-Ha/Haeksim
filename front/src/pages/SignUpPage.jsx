import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = "http://localhost:8000";

const SignUpPage = () => {
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      setIsLoading(false);
      return;
    }
    const hasUpperCase = /[A-Z]/.test(password);
    if (!hasUpperCase) {
      setError('비밀번호는 최소 하나의 대문자를 포함해야 합니다.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/auth/signup`,
        { username, email, password },                         // ✅ JSON 바디
        { headers: { 'Content-Type': 'application/json' } }
      );

      if ((response.status === 200 || response.status === 201) && response.data?.access_token) {
        // ✅ 바로 로그인 처리: 토큰 저장 후 대시보드 이동
        localStorage.setItem('access_token', response.data.access_token);
        setSuccessMessage('회원가입이 완료되었습니다!');
        navigate('/dashboard');
      } else {
        setSuccessMessage('회원가입이 완료되었습니다! 로그인해 주세요.');
        setTimeout(() => navigate('/page1'), 1200);
      }
    } catch (err) {
      console.error('signup error:', err?.response?.status, err?.response?.data, err?.message);
      if (err.response?.data?.detail) {
        setError(typeof err.response.data.detail === 'string'
          ? err.response.data.detail
          : Array.isArray(err.response.data.detail)
            ? err.response.data.detail.map(d => d.msg).join('; ')
            : '회원가입 중 오류가 발생했습니다.');
      } else {
        setError('네트워크 오류가 발생했습니다. 서버 상태를 확인해주세요.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <header className="signup-header">
        <div className="logo">Haeksim</div>
      </header>

      <div className="signup-card">
        <h1 className="signup-title">회원가입</h1>
        <form onSubmit={handleSignUp} className="signup-form">
          <input
            type="text"
            placeholder="사용자 이름"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="signup-input"
          />
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="signup-input"
          />
          <input
            type="password"
            placeholder="비밀번호 (대문자 1개 이상 필수 입력)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="signup-input"
          />
          <input
            type="password"
            placeholder="비밀번호 확인"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="signup-input"
          />

          {error && <p className="signup-error">{error}</p>}
          {successMessage && <p className="signup-success">{successMessage}</p>}

          <button type="submit" className="signup-btn signup-btn-primary" disabled={isLoading}>
            {isLoading ? '가입 중...' : '회원가입'}
          </button>

          <button type="button" className="signup-btn signup-btn-kakao" onClick={() => console.log('kakao signup')}>
            카카오로 가입하기
          </button>
        </form>

        <p className="signup-link-text">
          기본 계정이 있으신가요? <a href="/page1">로그인 페이지로</a>
        </p>
      </div>
    </div>
  );
};

export default SignUpPage;
