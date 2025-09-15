import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ChatPage from './ChatPage';
import './LearningAnalysisPage.css';

const API_URL = 'http://localhost:8000';
const authHeaders = () => {
  const t = localStorage.getItem('access_token');
  return t ? { Authorization: `Bearer ${t}` } : {};
};

export default function LearningAnalysisPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [showChat, setShowChat] = useState(false);

  // 전달된 데이터
  const studyPack = state?.studyPack || null;
  const mySummary = state?.mySummary || '';

  const title = studyPack?.title || '학습 요약 지문';
  const passage =
    (studyPack?.generated_passage || '').replace(/<br\s*\/?>/gi, '\n');

  // --- LLM 점수/평가 가져오기 ---
  const [scores, setScores] = useState({ overall: 60 });
  const [summaryEval, setSummaryEval] = useState('평가를 불러오는 중입니다...');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/v1/summary/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ passage, summary: mySummary }),
        });

        if (res.ok) {
          const data = await res.json();
          setScores({
            overall: Math.max(0, Math.min(100, Number(data?.scores?.overall ?? 0))),
          });
          setSummaryEval(data?.summary_feedback || '—');
        } else {
          // 백엔드가 아직 없을 때의 안전한 폴백(샘플 계산)
          const len = Math.min(mySummary.length, 500);
          setScores({ overall: Math.round(60 + (len / 500) * 40) });
          setSummaryEval('샘플 평가: 요약 길이와 간단 규칙으로 산출한 점수입니다.');
        }
      } catch (e) {
        const len = Math.min(mySummary.length, 500);
        setScores({ overall: Math.round(60 + (len / 500) * 40) });
        setSummaryEval('샘플 평가: 네트워크 오류로 임시 점수를 표시합니다.');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [passage, mySummary]);

  // 저장
  const handleSave = async () => {
    try {
      await fetch(`${API_URL}/api/v1/summary/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          title,
          passage,
          my_summary: mySummary,
          scores,
          pack_summary: studyPack?.summary || '',
          key_points: studyPack?.key_points || [],
          evaluated_feedback: summaryEval,
        }),
      });
      alert('저장되었습니다.');
      navigate('/dashboard');
    } catch {
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="analysis-container">
      <header className="analysis-header">
        <div className="logo">Haeksim</div>
        <nav className="header-nav">
          <a href="/dashboard">대시보드</a>
          <a href="#" className="active">학습분석</a>
          <a href="/page1">로그아웃</a>
        </nav>
      </header>

      <main className="analysis-main">
        <h1>{title}</h1>

        {/* AI 분석 점수 */}
        <section className="analysis-section ai-scores-section">
          <h2>AI 분석 점수</h2>
          <div className="score-item">
            <span className="score-label">완성도</span>
            <div className="progress-bar-container">
              <div
                className="progress-bar"
                style={{ width: `${scores.overall ?? 0}%` }}
              />
            </div>
            <span className="score-value">{scores.overall ?? 0}%</span>
          </div>
        </section>

        {/* 지문 */}
        <section className="analysis-section">
          <h2>지문</h2>
          <div className="passage-card">{passage || '—'}</div>
        </section>

        {/* 요약 비교 */}
        <section className="analysis-section detailed-feedback-section">
          <h2>요약 비교</h2>
          <div className="feedback-box">
            <div className="feedback-item">
              <span className="feedback-label">내 요약</span>
              <span className="feedback-text">{mySummary || '—'}</span>
            </div>

            <div className="feedback-item">
              <span className="feedback-label">참고 요약</span>
              <span className="feedback-text">{studyPack?.summary || '—'}</span>
            </div>

            {Array.isArray(studyPack?.key_points) && studyPack.key_points.length > 0 && (
              <div className="feedback-item">
                <span className="feedback-label">핵심 포인트</span>
                <span className="feedback-text">{studyPack.key_points.join(' · ')}</span>
              </div>
            )}

            {/* 내 요약 평가 */}
            <div className="feedback-item">
              <span className="feedback-label">평가</span>
              <span className="feedback-text">
                {loading ? 'AI가 평가 중입니다...' : (summaryEval || '—')}
              </span>
            </div>
          </div>
        </section>

        {/* 우하단 원형 FAB */}
        <button
          className="chat-fab"
          onClick={() => setShowChat(true)}
          title="AI 선생님에게 질문하기"
        >
          <img
            src="https://placehold.co/72x72?text=AI"
            alt="AI"
            style={{ width: 36, height: 36, borderRadius: '50%' }}
          />
        </button>

        {/* 팝업 챗(지문 + 내 요약만 컨텍스트 전달) - 단일 렌더링 */}
        {showChat && (
          <ChatPage
            open
            onClose={() => setShowChat(false)}
            context={{ mode: 'summary', passage, summary: mySummary }}
          />
        )}

        {/* 하단 버튼 */}
        <div className="action-buttons-container">
          <button className="btn btn-try-again" onClick={() => navigate(-1)}>다시 하기</button>
          <button className="btn btn-save" onClick={handleSave}>저장</button>
        </div>
      </main>
    </div>
  );
}
