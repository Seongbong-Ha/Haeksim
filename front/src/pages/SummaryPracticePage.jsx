import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './SummaryPracticePage.css';

export default function SummaryPracticePage() {
  const navigate = useNavigate();
  const { state } = useLocation();

  // RAG에서 온 학습팩(옵션)
  const studyPack = state?.studyPack || null;
  const source = state?.source || 'dashboard';

  // 제목 & 지문
  const title = studyPack?.title || '학습 요약 지문';
  const passage = useMemo(() => {
    const t = (studyPack?.generated_passage || state?.currentPassage || '').trim();
    if (t) return t;
    return '대시보드에서 랜덤 생성된 연습 지문입니다. (백엔드 연결 시 실제 지문으로 교체됩니다)';
  }, [studyPack, state]);

  // “고민해볼 지점”(= 기존 study_questions)
  const questions = Array.isArray(studyPack?.study_questions)
    ? studyPack.study_questions
    : [];

  const [summaryText, setSummaryText] = useState('');
  const [fontSize, setFontSize] = useState(16);

  const handleSubmit = () => {
    navigate('/learning-analysis', {
      state: {
        source,
        studyPack,
        mySummary: summaryText,
      },
    });
  };

  return (
    <div className="summary-page-container">
      {/* 상단 헤더 */}
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
        {/* 지문 섹션: 제목/박스 */}
        <div className="passage-header">
          <h1 className="main-title">{title}</h1>
          <div className="font-size-controls">
            <span>글자크기: {fontSize}pt</span>
            <button
              onClick={() => setFontSize((s) => Math.min(s + 2, 24))}
              className="font-size-btn"
            >
              +
            </button>
            <button
              onClick={() => setFontSize((s) => Math.max(s - 2, 12))}
              className="font-size-btn"
            >
              -
            </button>
          </div>
        </div>

        <div className="passage-content" style={{ fontSize: `${fontSize}pt` }}>
          {passage}
        </div>

        {/* 고민해볼 지점: 제목 위치/박스 형식 지문과 동일 */}
        {questions.length > 0 && (
          <>
            <div className="passage-header">
              <h2 className="main-title">고민해볼 지점</h2>
              <div /> {/* 우측 공간(지문과 레이아웃 통일) */}
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

        {/* 사용자 입력 영역 */}
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
