// src/pages/SummaryPracticePage.jsx
import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './SummaryPracticePage.css';

export default function SummaryPracticePage() {
  const navigate = useNavigate();
  const { state } = useLocation();

  // 이전 화면에서 넘겨준 학습팩(있으면 즉시 사용)
  const studyPack = state?.studyPack || null;
  const source = state?.source || 'dashboard';

  // 제목 & 지문: 기존 fallback 우선순위 유지
  const title = studyPack?.title || '학습 요약 지문';
  const passage = useMemo(() => {
    const t = (studyPack?.generated_passage || state?.currentPassage || '').trim();
    if (t) return t;
    return '대시보드에서 랜덤 생성된 연습 지문입니다. (백엔드 연결 시 실제 지문으로 교체됩니다)';
  }, [studyPack, state]);

  // “고민해볼 지점”(옵션)
  const questions = Array.isArray(studyPack?.study_questions)
    ? studyPack.study_questions
    : [];

  // 요약 입력 & 글자 크기
  const [summaryText, setSummaryText] = useState('');
  const [fontSize, setFontSize] = useState(16);

  // 다음 화면으로 전달
  const handleSubmit = () => {
    navigate('/learning-analysis', {
      state: {
        source,
        studyPack,       // 생성/전달된 팩 그대로 넘김
        mySummary: summaryText,
      },
    });
  };

  return (
    <div className="summary-page-container">
      {/* 헤더 */}
      <header className="summary-header">
        <div className="logo">Haeksim</div>
        <nav className="header-nav">
          <a href="/dashboard">대시보드</a>
          <a href="#">설정</a>
          <a href="#">리포트</a>
          <a href="/page1">로그아웃</a>
        </nav>
      </header>

      <main className="summary-main">
        {/* 제목/폰트 컨트롤 */}
        <div className="passage-header">
          <h1 className="main-title">{title}</h1>
          <div className="font-size-controls">
            <span>글자크기: {fontSize}pt</span>
            <button
              onClick={() => setFontSize((s) => Math.min(s + 2, 24))}
              className="font-size-btn"
              aria-label="increase-font"
            >
              +
            </button>
            <button
              onClick={() => setFontSize((s) => Math.max(s - 2, 12))}
              className="font-size-btn"
              aria-label="decrease-font"
            >
              -
            </button>
          </div>
        </div>

        {/* 지문 */}
        <div className="passage-content" style={{ fontSize: `${fontSize}pt` }}>
          {passage}
        </div>

        {/* 고민해볼 지점(있을 때만) */}
        {questions.length > 0 && (
          <>
            <div className="passage-header">
              <h2 className="main-title">고민해볼 지점</h2>
              <div />
            </div>
            <div className="passage-content">
              <ul className="points-list">
                {questions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* 요약 입력 */}
        <h2 className="summary-title">여기에 요약문을 작성해 주세요.</h2>
        <div className="summary-input-container">
          <textarea
            className="summary-textarea"
            placeholder="요약문을 작성하세요..."
            value={summaryText}
            onChange={(e) => setSummaryText(e.target.value)}
            maxLength={500}
            rows={10}
          />
          <div className="char-count">글자 수: {summaryText.length}/500</div>
        </div>

        {/* 하단 버튼 */}
        <div className="action-buttons-container">
          <button className="btn btn-back" onClick={() => navigate(-1)}>
            뒤로가기
          </button>
          <button className="btn btn-submit" onClick={handleSubmit}>
            제출
          </button>
        </div>
      </main>
    </div>
  );
}
