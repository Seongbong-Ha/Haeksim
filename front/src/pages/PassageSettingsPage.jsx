// src/pages/PassageSettingsPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PassageSettingsPage.css";
import LoadingPage from "./LoadingPage"; // ⬅️ 로딩 페이지

// 백엔드 주소 (.env로 빼도 됨)
const API_URL = "http://localhost:8000";

// 로그인 토큰을 헤더에 싣기
function getAuthHeaders() {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function PassageSettingsPage() {
  const navigate = useNavigate();

  // 상태
  const [difficulty, setDifficulty] = useState("어려움");
  const [topic, setTopic] = useState("사회");
  const [features, setFeatures] = useState("실제 문제 풀이"); // "실제 문제 풀이" | "지문의 핵심 파악하기"
  const [passageLength, setPassageLength] = useState(1000);   // 기본 1000자

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // 옵션
  const difficultyOptions = ["기초", "보통", "어려움"];
  const topicOptions = ["과학기술", "인문", "사회", "예술/문학", "시사"];
  const featureOptions = ["실제 문제 풀이", "지문의 핵심 파악하기"];

  // 프런트 UI '기능' → 백엔드 generate mode
  const toMode = (f) => (f === "실제 문제 풀이" ? "B" : "A");

  const handleCreatePassage = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1) 지문 생성 (길이 800~1200자로 클램프)
      const mode = toMode(features);
      const target_chars = Math.max(800, Math.min(1200, Number(passageLength) || 1000));

      const genRes = await fetch(`${API_URL}/api/v1/items/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, difficulty, topic, target_chars }),
      });
      if (!genRes.ok) {
        const t = await genRes.text();
        throw new Error(`생성 실패: ${genRes.status} ${t}`);
      }
      const generated = await genRes.json();

      // 2) 저장 (로그인 필요)
      const saveRes = await fetch(`${API_URL}/api/v1/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          payload: generated,
          tags: ["web"],
          author: "frontend",
        }),
      });
      if (!saveRes.ok) {
        const t = await saveRes.text();
        throw new Error(`저장 실패: ${saveRes.status} ${t}`);
      }
      const { item_id } = await saveRes.json();

      // 3) 페이지 이동 (성공 시 로딩 해제 없이 바로 이동 → 컴포넌트 언마운트)
      if (features === "실제 문제 풀이") {
        navigate("/quiz-page", { state: { itemId: item_id } });
      } else {
        navigate("/summary-practice", {
          state: {
            itemId: item_id,
            source: "passage-settings",
            enterFrom: "passage-settings",
            practiceType: "핵심파악",
            mode,
            difficulty,
            topic,
            target_chars,
            studyPack: {
              title: generated.title || "학습 요약 지문",
              generated_passage: generated.generated_passage,
              study_questions: generated.study_questions || [],
              sentences: generated.sentences || [],
              question: generated.question,
              base_group_id: generated.base_group_id ?? null,
              db_key: generated.db_key,
            },
          },
        });
      }
      // ⚠️ 여기서는 setIsLoading(false)를 호출하지 않음(곧바로 navigate로 언마운트)
    } catch (e) {
      console.error(e);
      setError(e.message || "요청 처리 중 오류가 발생했습니다.");
      setIsLoading(false); // 실패 시에만 로딩 해제
    }
  };

  // ⬇️ raw 파일처럼 로딩 중에는 전용 페이지를 보여줌
  if (isLoading) {
    return <LoadingPage />;
  }

  return (
    <div className="passage-settings-container">
      {/* 상단 헤더 */}
      <header className="settings-header">
        <div className="logo">Su-Neung Gen</div>
        <nav className="header-nav">
          <a href="/" onClick={(e)=>{e.preventDefault(); navigate("/");}}>홈</a>
          <a className="active" href="/" onClick={(e)=>e.preventDefault()}>설정</a>
          <img className="profile-img" src="https://placehold.co/80x80" alt="profile" />
        </nav>
      </header>

      <main className="settings-main">
        <h1 className="main-title">지문 생성 설정</h1>

        {/* 난이도 */}
        <section className="setting-section">
          <h2>난이도</h2>
          <div className="option-group">
            {difficultyOptions.map((d) => (
              <button
                key={d}
                className={`option-button ${difficulty === d ? "selected" : ""}`}
                onClick={() => setDifficulty(d)}
              >
                {d}
              </button>
            ))}
          </div>
        </section>

        {/* 주제 */}
        <section className="setting-section">
          <h2>주제</h2>
          <div className="option-group">
            {topicOptions.map((t) => (
              <button
                key={t}
                className={`option-button ${topic === t ? "selected" : ""}`}
                onClick={() => setTopic(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </section>

        {/* 기능 */}
        <section className="setting-section">
          <h2>기능</h2>
          <div className="option-group">
            {featureOptions.map((f) => (
              <button
                key={f}
                className={`option-button ${features === f ? "selected" : ""}`}
                onClick={() => setFeatures(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </section>

        {/* 길이 */}
        <section className="setting-section">
          <h2>지문 길이 (문자)</h2>
          <div className="length-slider-container">
            <input
              className="length-slider"
              type="range"
              min={800}
              max={1200}
              step={50}
              value={passageLength}
              onChange={(e) => setPassageLength(Number(e.target.value))}
            />
            <div className="current-length">{passageLength}자 </div>
          </div>
        </section>

        {/* 액션 */}
        <div className="action-buttons">
          <button className="btn btn-back" onClick={() => navigate(-1)}>
            뒤로가기
          </button>
          <button className="btn btn-create" onClick={handleCreatePassage} disabled={isLoading}>
            {isLoading ? "생성 중..." : "지문 생성"}
          </button>
        </div>

        {error && (
          <p style={{ marginTop: 12, color: "crimson", whiteSpace: "pre-wrap" }}>
            {error}
          </p>
        )}
      </main>
    </div>
  );
}
