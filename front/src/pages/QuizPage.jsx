// src/pages/QuizPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./QuizPage.css";

const API_URL = "http://localhost:8000";

function getAuthHeaders() {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function QuizPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const itemIdFromState = location.state?.itemId || null;

  const [currentItem, setCurrentItem] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [loading, setLoading] = useState(true);

  // 선지 근거 { [choiceIndex]: string }
  const [evidenceMap, setEvidenceMap] = useState({});
  // 펼침 상태: Set<number>
  const [expanded, setExpanded] = useState(new Set());

  const localKeyEvidence = currentItem ? `evidence_${String(currentItem.id)}` : null;
  const localKeyAnswer = currentItem ? `answer_${String(currentItem.id)}` : null;

  // 아이템 로딩
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/items`, {
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        });
        if (!res.ok) throw new Error(await res.text());
        const items = await res.json();

        let found = null;
        if (itemIdFromState) {
          found = items.find((it) => String(it.id) === String(itemIdFromState));
        } else if (items.length > 0) {
          found = items[0];
        }
        setCurrentItem(found || null);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [itemIdFromState]);

  // 로컬 복원
  useEffect(() => {
    if (!localKeyEvidence && !localKeyAnswer) return;
    try {
      if (localKeyEvidence) {
        const savedEv = localStorage.getItem(localKeyEvidence);
        setEvidenceMap(savedEv ? JSON.parse(savedEv) : {});
      }
      if (localKeyAnswer) {
        const savedAns = localStorage.getItem(localKeyAnswer);
        if (savedAns !== null) setSelectedAnswer(Number(savedAns));
      }
    } catch {
      setEvidenceMap({});
    }
  }, [localKeyEvidence, localKeyAnswer]);

  // 자동 저장
  useEffect(() => {
    if (localKeyEvidence) localStorage.setItem(localKeyEvidence, JSON.stringify(evidenceMap));
  }, [localKeyEvidence, evidenceMap]);
  useEffect(() => {
    if (localKeyAnswer && selectedAnswer !== null) localStorage.setItem(localKeyAnswer, String(selectedAnswer));
  }, [localKeyAnswer, selectedAnswer]);

  // 모든 근거 입력?
  const allEvidenceFilled = useMemo(() => {
    if (!currentItem?.choices?.length) return false;
    return currentItem.choices.every((c) => (evidenceMap[c.index] || "").trim().length > 0);
  }, [currentItem, evidenceMap]);

  const progressValue =
    selectedAnswer !== null && allEvidenceFilled ? 100 : selectedAnswer !== null ? 70 : 40;

  // 번호 버튼으로만 정답 선택
  const handleNumberSelect = (idx) => setSelectedAnswer(idx);

  // 문장 클릭으로 근거 토글
  const toggleEvidence = (idx) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!currentItem) return;
    if (selectedAnswer === null) {
      alert("정답 번호를 먼저 선택하세요.");
      return;
    }
    if (!allEvidenceFilled) {
      alert("모든 선지의 근거를 입력해야 합니다.");
      return;
    }

    try {
      // 서버 채점(선택): 이미 사용 중이면 유지
      await fetch(`${API_URL}/api/v1/items/${encodeURIComponent(String(currentItem.id))}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ choice_index: selectedAnswer }),
      }).catch(() => null);

      // 결과 페이지로 이동 (문자열 id 그대로 전달)
      navigate("/quiz-results", {
        state: {
          itemId: String(currentItem.id),   // ★ 슬러그/문자열 id
          selectedAnswer,
          evidenceMap,
        },
      });
    } catch (e) {
      console.error(e);
      alert("제출 실패: " + e.message);
    }
  };

  if (loading) return <p>불러오는 중...</p>;
  if (!currentItem) return <p>문항이 없습니다.</p>;

  return (
    <div className="quiz-container">
      <header className="quiz-header">
        <div className="logo">Su-Neung Gen</div>
        <nav className="header-nav">
          <a href="/" onClick={(e)=>{e.preventDefault(); navigate("/");}}>홈</a>
          <a className="active" href="/" onClick={(e)=>e.preventDefault()}>퀴즈</a>
          <img className="profile-img" src="https://placehold.co/80x80" alt="profile" />
        </nav>
      </header>

      <main className="quiz-main">
        <h1 className="main-title">{currentItem.title}</h1>

        <section className="progress-section">
          <div className="progress-text">진행률</div>
          <progress className="progress-bar" max={100} value={progressValue} />
        </section>

        <div className="quiz-grid">
          {/* 왼쪽: 지문 (sticky는 CSS에서 처리) */}
          <section className="passage-section">
            <div
              style={{ whiteSpace: "pre-wrap" }}
              dangerouslySetInnerHTML={{ __html: currentItem.generated_passage?.replace(/\n/g, "<br/>") }}
            />
          </section>

          {/* 오른쪽: 선지 (번호 버튼 = 선택 / 텍스트 = 토글) */}
          <section className="choices-section">
            <h2 className="choices-title">{currentItem.question}</h2>
            <ol className="choices-list">
              {currentItem.choices.map((c) => {
                const idx = c.index + 1;
                const isSelected = selectedAnswer === c.index;
                const isOpen = expanded.has(c.index);
                const evidence = evidenceMap[c.index] || "";
                return (
                  <li key={c.index} className={`choice-item ${isOpen ? "open" : ""}`}>
                    <div className={`choice-row ${isSelected ? "selected" : ""}`}>
                      <button
                        type="button"
                        className={`num-select ${isSelected ? "on" : ""}`}
                        onClick={() => handleNumberSelect(c.index)}
                        aria-pressed={isSelected}
                        title={`${idx}번 선택`}
                      >
                        {idx}
                      </button>
                      <button
                        type="button"
                        className="choice-text-btn"
                        onClick={() => toggleEvidence(c.index)}
                        aria-expanded={isOpen}
                        aria-controls={`evi-wrap-${c.index}`}
                        title="근거 입력란 펼치기/접기"
                      >
                        {c.text}
                      </button>
                    </div>

                    <div id={`evi-wrap-${c.index}`} className={`evidence-collapse ${isOpen ? "show" : ""}`}>
                      <textarea
                        className="evidence-input"
                        placeholder="이 선지를 선택/배제한 근거를 입력하세요."
                        value={evidence}
                        onChange={(e) => setEvidenceMap((prev) => ({ ...prev, [c.index]: e.target.value }))}
                      />
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>

        <div className="action-buttons-container">
          <button className="btn btn-back" onClick={() => navigate(-1)}>뒤로가기</button>
          <button
            className="btn btn-submit"
            onClick={handleSubmit}
            disabled={selectedAnswer === null || !allEvidenceFilled}
          >
            제출
          </button>
        </div>
      </main>
    </div>
  );
}
