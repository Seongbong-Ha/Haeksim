// src/pages/QuizPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./QuizPage.css";

const API_URL = "http://localhost:8000";

function getAuthHeaders() {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/* ---------- 지문 단락화 유틸 ---------- */
function splitSentencesFromText(raw = "") {
  const t = String(raw)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/\r\n?/g, "\n")
    .trim();

  const roughParas = t.split(/\n{2,}/).map(x => x.trim()).filter(Boolean);

  const out = [];
  const SENT_RX = /[^.!?。\n]+[.!?。]?(?=\s|$)/g;
  for (const rp of roughParas) {
    const pieces = rp.match(SENT_RX) || [rp];
    for (const s of pieces) {
      const s2 = s.replace(/\s+/g, " ").trim();
      if (s2) out.push(s2);
    }
  }
  return out;
}

function extractSentencesFromItem(item) {
  if (Array.isArray(item?.sentences) && item.sentences.length) {
    return item.sentences
      .map(s => (s.text ?? s.content ?? "").trim())
      .filter(Boolean);
  }
  return splitSentencesFromText(item?.generated_passage || "");
}

function chunkSentences(sentences, maxPerPara = 3) {
  const paras = [];
  for (let i = 0; i < sentences.length; i += maxPerPara) {
    paras.push(sentences.slice(i, i + maxPerPara).join(" "));
  }
  return paras.length ? paras : [""];
}
/* -------------------------------------- */

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

  // === 진행률 계산 ===
  // 채워진 근거 개수
  const filledEvidenceCount = useMemo(() => {
    if (!currentItem?.choices?.length) return 0;
    return currentItem.choices.reduce((acc, c) => {
      const v = (evidenceMap[c.index] || "").trim();
      return acc + (v.length > 0 ? 1 : 0);
    }, 0);
  }, [currentItem, evidenceMap]);

  const numChoices = currentItem?.choices?.length || 0;
  const totalSteps = numChoices + 1;                    // 근거 N개 + 답 선택 1개
  const completedSteps = filledEvidenceCount + (selectedAnswer !== null ? 1 : 0);
  const progressPercent = Math.max(
    0,
    Math.min(100, Math.round((completedSteps / Math.max(totalSteps, 1)) * 100))
  );

  const allEvidenceFilled = filledEvidenceCount === numChoices;

  const handleNumberSelect = (idx) => setSelectedAnswer(idx);

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
      const res = await fetch(
        `${API_URL}/api/v1/items/${encodeURIComponent(String(currentItem.id))}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify({ choice_index: selectedAnswer }),
        }
      );
      if (!res.ok) {
        const msg = await res.text();
        alert("제출 실패: " + msg);
        return;
      }

      navigate("/quiz-results", {
        state: {
          itemId: String(currentItem.id),
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

  const sentences = extractSentencesFromItem(currentItem);
  const paragraphs = chunkSentences(sentences, 3);

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

        {/* 진행률: 제목 바로 아래 */}
        <section className="progress-section">
          <div className="progress-text2">진행률 {progressPercent}%</div>
          <progress className="progress-bar" max={100} value={progressPercent} />
        </section>
        <div className="progress-details">
          근거 {filledEvidenceCount}/{numChoices} · 답 {selectedAnswer !== null ? "선택됨" : "미선택"}
        </div>

        <div className="quiz-grid">
          {/* 왼쪽: 지문 */}
          <section className="passage-section">
            <article className="passage-block">
              {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
            </article>
          </section>

          {/* 오른쪽: 선지 */}
          <section className="choices-section">
            <div className="choices-card">
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
                          placeholder="이 선지를 선택/배제한 근거를 입력하세요. (입력 시 진행률이 올라갑니다)"
                          value={evidence}
                          onChange={(e) =>
                            setEvidenceMap((prev) => ({ ...prev, [c.index]: e.target.value }))
                          }
                        />
                      </div>
                    </li>
                  );
                })}
              </ol>

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
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
