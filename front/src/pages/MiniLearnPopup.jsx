import React, { useState } from "react";
import "./MiniLearnPopup.css";
import { useNavigate } from "react-router-dom";

const API_URL = "http://localhost:8000";
const authHeaders = () => {
  const t = localStorage.getItem("access_token");
  return t ? { Authorization: `Bearer ${t}` } : {};
};

/**
 * props:
 *  - open: boolean
 *  - onClose: () => void
 *  - currentPassage: string (필수)
 *  - excludeGroupIds?: string[]
 */
export default function MiniLearnPopup({ open, onClose, currentPassage, excludeGroupIds = [] }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  if (!open) return null;

  const submit = async () => {
    const difficulty = text.trim();
    if (!difficulty) {
      setErr("이해가 안 된 부분이나 키워드를 입력해 주세요.");
      return;
    }
    setErr("");
    setBusy(true);
    try {
      const body = {
        current_passage: (currentPassage || "").replace(/<br\s*\/?>/gi, "\n"),
        difficulty_reason: difficulty,
        exclude_group_ids: excludeGroupIds,
        top_k: 8,
        context_top_k: 5,
        min_score: 0.22,
        temperature: 0.4
      };
      const res = await fetch(`${API_URL}/rag/generate_similar`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error(await res.text());
      const pack = await res.json();
      // SummaryPracticePage로 이동 (state로 학습팩 전달)
      navigate("/summary-practice", {
        state: {
          source: "quiz_result_extension",
          studyPack: pack
        }
      });
    } catch (e) {
      setErr(`생성 실패: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mini-learn-popup">
      <div className="mini-learn-header">
        <span>동일 주제 추가 학습</span>
        <button className="mini-learn-close" onClick={onClose} title="닫기">✕</button>
      </div>
      <div className="mini-learn-body">
        <p>지문 중 이해가 어려웠던 부분이나 키워드를 적어 주세요. (예: “용어 A 정의”, “인과 구조가 헷갈림”)</p>
        <textarea
          className="mini-learn-textarea"
          placeholder="예) 사회적 배경과 정책의 상호작용, 불평등의 인과 구조"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={busy}
        />
        {busy && <div className="mini-learn-loading">유사 지문을 찾는 중...</div>}
        {err && <div className="mini-learn-error">{err}</div>}
      </div>
      <div className="mini-learn-footer">
        <button className="mini-btn cancel" onClick={onClose} disabled={busy}>취소</button>
        <button className="mini-btn primary" onClick={submit} disabled={busy}>추가 학습 시작</button>
      </div>
    </div>
  );
}
