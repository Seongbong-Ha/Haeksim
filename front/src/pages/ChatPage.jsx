import React, { useEffect, useMemo, useRef, useState } from "react";
import "./ChatPage.css";

const API_URL = "http://localhost:8000";
function getAuthHeaders() {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * ChatPage (quiz + summary 겸용)
 */
export default function ChatPage({ open = true, onClose, context = {} }) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "안녕하세요! 이 내용에 대해 무엇이든 물어보세요 😊" },
  ]);
  const [selfOpen, setSelfOpen] = useState(true); // ⬅️ 내부 닫기용
  const scrollRef = useRef(null);

  // 모드 판별
  const mode =
    context.mode ??
    ((context.passage || context.summary || context.mySummary) ? "summary" : "quiz");

  // summary 컨텍스트
  const passage =
    (context.passage ?? context.item?.generated_passage ?? "").replace(/<br\s*\/?>/gi, "\n");
  const mySummary = context.summary ?? context.mySummary ?? "";

  // quiz 컨텍스트
  const item = context.item;
  const correctIndex = context.correctIndex ?? 0;
  const selectedAnswer = context.selectedAnswer ?? 0;
  const evidenceMap = context.evidenceMap ?? {};

  const quizPayloadBase = useMemo(() => {
    if (!item) return null;
    return {
      item_id: String(item.id),
      question: item.question || "다음 글을 읽고 물음에 답하시오.",
      passage,
      choices: (item.choices || []).map((c) => ({ index: c.index, text: c.text })),
      correct_index: correctIndex,
      user_selected_index: selectedAnswer,
      evidence_map: evidenceMap,
    };
  }, [item, passage, correctIndex, selectedAnswer, evidenceMap]);

  // 스크롤 맨 아래로
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open, selfOpen]);

  // 초기 인사말
  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content:
          mode === "summary"
            ? "안녕하세요! 이 지문과 당신의 요약에 대해 무엇이든 물어보세요 😊"
            : "안녕하세요! 이 문제에 대해 무엇이든 물어보세요 😊",
      },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ESC 로 닫기
  useEffect(() => {
    if (!open || !selfOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, selfOpen]);

  const handleClose = () => {
    if (onClose) onClose();
    else setSelfOpen(false); // 부모가 onClose 안 넘겨도 닫히도록
  };

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    if (mode === "quiz" && !quizPayloadBase) return;

    setInput("");
    setBusy(true);

    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);

    try {
      let url = "";
      let body = null;

      const history = newMessages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role, content: m.content }));

      if (mode === "summary") {
        url = `${API_URL}/api/v1/summary/chat`;
        body = { passage, summary: mySummary, messages: history };
      } else {
        url = `${API_URL}/api/v1/chat`;
        body = { ...quizPayloadBase, history, message: text };
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      const reply = data.reply || data.answer || "(빈 응답)";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `오류가 발생했어요: ${String(e)}` },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // 렌더링 조건
  if (!open || !selfOpen) return null;

  return (
    <div className="chat-popup">
      <div className="chat-topbar">
        <span>AI 학습코치</span>
        <button
          className="chat-close-btn"
          onClick={handleClose}
          title="닫기"
          aria-label="채팅 닫기"
        >
          ✕
        </button>
      </div>

      <div className="chat-body" ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} className={`msg-row ${m.role === "user" ? "me" : "ai"}`}>
            <div className="bubble">{m.content}</div>
          </div>
        ))}
      </div>

      <div className="chat-input">
        <input
          placeholder="질문을 입력하고 Enter"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={busy}
        />
        <button onClick={send} disabled={busy}>
          전송
        </button>
      </div>
    </div>
  );
}
