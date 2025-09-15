// src/pages/QuizResultPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./QuizResultPage.css";
import ChatPage from "./ChatPage";
import MiniLearnPopup from "./MiniLearnPopup";

const API_URL = "http://localhost:8000";
function getAuthHeaders() {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function QuizResultPage() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const itemId = state?.itemId;
  const selectedAnswer = state?.selectedAnswer ?? null; // 0-based로 전달되어 온다고 가정
  const evidenceMap = state?.evidenceMap ?? {};

  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState(null);
  const [correctIndex, setCorrectIndex] = useState(null); // 0-based
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);

  const [chatOpen, setChatOpen] = useState(false);     // ★ 챗봇 팝업
  const [learnOpen, setLearnOpen] = useState(false);   // ★ 추가 학습 팝업

  const allEvidenceFilled = useMemo(() => {
    if (!item?.choices?.length) return false;
    return item.choices.every((c) => (evidenceMap[c.index] || "").trim().length > 0);
  }, [item, evidenceMap]);

  // 문항 로딩
  useEffect(() => {
    const run = async () => {
      try {
        if (!itemId) throw new Error("결과 페이지 진입 파라미터가 없습니다.");

        const res = await fetch(`${API_URL}/api/v1/items`, {
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        });
        if (!res.ok) throw new Error(await res.text());
        const items = await res.json();
        const found = items.find((it) => String(it.id) === String(itemId));
        if (!found) throw new Error(`문항을 찾을 수 없습니다: ${String(itemId)}`);
        setItem(found);
        setCorrectIndex(found.correct_index ?? 0); // 0-based
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [itemId]);

  // LLM 분석 호출
  useEffect(() => {
    const runAnalysis = async () => {
      if (!item || selectedAnswer === null) return;
      try {
        const payload = {
          item_id: String(item.id),
          question: item.question || "다음 글을 읽고 물음에 답하시오.",
          passage: (item.generated_passage || "").replace(/<br\s*\/?>/gi, "\n"),
          choices: item.choices.map((c) => ({ index: c.index, text: c.text })),
          correct_index: correctIndex ?? 0,
          user_selected_index: selectedAnswer,
          evidence_map: evidenceMap,
          meta: { locale: "ko-KR", product: "Haeksim" },
        };
        const encodedId = encodeURIComponent(String(item.id));
        const res = await fetch(`${API_URL}/api/v1/items/${encodedId}/analysis`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setAnalysis(data);
      } catch (e) {
        setError(e.message);
      }
    };
    runAnalysis();
  }, [item, selectedAnswer, correctIndex, evidenceMap]);

  const isUserCorrect =
    analysis?.is_user_correct ?? (selectedAnswer !== null && selectedAnswer === correctIndex);

  if (loading) return <p style={{ padding: 24 }}>분석을 준비 중...</p>;
  if (error) return <p style={{ padding: 24, color: "crimson" }}>오류: {error}</p>;
  if (!item) return <p style={{ padding: 24 }}>문항이 없습니다.</p>;

  // ▼▼▼ ChatPage에 넘길 0-based 인덱스 보장
  const correctIndex0 = typeof correctIndex === "number" ? correctIndex : 0;
  const selectedIndex0 = typeof selectedAnswer === "number" ? selectedAnswer : 0;
  // ▲▲▲

  return (
    <div className="quiz-result-container">
      {/* Header */}
      <header className="result-header">
        <div className="logo">Haeksim</div>
        <nav className="header-nav">
          <a href="/dashboard">대시보드</a>
          <a href="#" className="active">결과</a>
          <a href="/page1">로그아웃</a>
          <img src="https://placehold.co/40x40" alt="Profile" className="profile-img" />
        </nav>
      </header>

      <main className="result-main">
        <h1>문제 풀이 분석 결과</h1>

        {/* 정답 분석 */}
        <section className="analysis-section correct-answer-box">
          <h2>정답 분석</h2>
          <div className="correct-answer-content">
            <span className="checkmark" aria-label={isUserCorrect ? "정답" : "오답"}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" strokeWidth="2"
                   strokeLinecap="round" strokeLinejoin="round">
                {isUserCorrect ? (
                  <polyline points="20 6 9 17 4 12"></polyline>
                ) : (
                  <>
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </>
                )}
              </svg>
            </span>
            <div className="answer-text">
              <p>
                선택한 번호: <strong>{selectedAnswer + 1}번</strong> / 실제 정답:{" "}
                <strong>{(correctIndex ?? 0) + 1}번</strong>
              </p>
              <span className="status">{isUserCorrect ? "정답" : "오답"}</span>
            </div>
          </div>
          {analysis?.overall_feedback && (
            <div style={{ marginTop: 16, lineHeight: 1.6 }}>{analysis.overall_feedback}</div>
          )}
        </section>

        {/* 선지별 분석 */}
        <section className="analysis-section option-analysis-section">
          <h2>선지별 분석</h2>
          <div className="option-list">
            {item.choices.map((c) => {
              const ai = analysis?.per_choice?.find((pc) => pc.index === c.index);
              const userEv = (evidenceMap[c.index] || "").trim();
              const expanded = !!ai;
              return (
                <div key={c.index} className="option-item">
                  <div className="option-header">
                    <div className="option-number">
                      {c.index + 1}. {c.text}
                    </div>
                  </div>
                  {expanded && (
                    <div className="option-details">
                      <p><strong>내 근거</strong>: {userEv || "(입력 없음)"}</p>
                      {ai && (
                        <>
                          <p><strong>AI 판정</strong>: {ai.verdict} (점수 {ai.score})</p>
                          <p><strong>피드백</strong>: {ai.evidence_feedback}</p>
                          <p><strong>모델 근거/이유</strong>: {ai.model_rationale}</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 종합 분석 점수 */}
        <section className="analysis-section summary-scores">
          <h2>종합 분석 점수</h2>
          <div className="scores-grid">
            <div className="score-card">
              <div className="score-value">{analysis?.scores?.correctness ?? (isUserCorrect ? 100 : 0)}%</div>
              <div className="score-label">정답 정확도</div>
            </div>
            <div className="score-card">
              <div className="score-value">{analysis?.scores?.evidence_quality ?? 70}%</div>
              <div className="score-label">근거의 품질</div>
            </div>
            <div className="score-card">
              <div className="score-value">{analysis?.scores?.reasoning ?? 70}%</div>
              <div className="score-label">추론의 타당성</div>
            </div>
            <div className="score-card">
              <div className="score-value">{analysis?.scores?.overall ?? 75}%</div>
              <div className="score-label">종합 사고력</div>
            </div>
          </div>
        </section>

        {/* 하단 액션: 대시보드 + 동일 주제 추가 학습 */}
        <div className="action-buttons" style={{ gap: 12 }}>
          <button className="btn btn-ask-ai" onClick={() => navigate(-1)}>이전으로</button>
          <button className="btn btn-summary-practice" onClick={() => navigate("/dashboard")}>
            대시보드
          </button>
          <button className="btn btn-secondary" onClick={() => setLearnOpen(true)}>
            동일 주제 추가 학습
          </button>
        </div>
      </main>

      {/* 우하단 AI 챗봇 FAB */}
      <button
        className="chat-fab"
        onClick={() => setChatOpen(true)}
        title="AI 학습코치와 대화"
        style={{
          position: "fixed",
          right: 20,
          bottom: 20,
          width: 64,
          height: 64,
          borderRadius: "50%",
          border: "none",
          background: "#1f6fff",
          color: "#fff",
          boxShadow: "0 8px 20px rgba(31,111,255,0.35)",
          zIndex: 9999,
          display: "grid",
          placeItems: "center",
        }}
      >
        <img
          src="https://placehold.co/72x72?text=AI"
          alt="AI"
          style={{ width: 36, height: 36, borderRadius: "50%" }}
        />
      </button>

      {/* 챗봇 팝업 */}
      {chatOpen && (
         <ChatPage
          open
          onClose={() => setChatOpen(false)}
          context={{
            mode: "quiz",
             item,
             correctIndex: correctIndex0,     // 0-based
             selectedAnswer: selectedIndex0,  // 0-based
             evidenceMap: evidenceMap,
          }}
        />
      )}

      {/* 동일 주제 추가 학습 미니 팝업 */}
      <MiniLearnPopup
        open={learnOpen}
        onClose={() => setLearnOpen(false)}
        currentPassage={item?.generated_passage || ""}
      />
    </div>
  );
}
