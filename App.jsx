import { useEffect, useRef, useState } from "react";
import { CreateMLCEngine, prebuiltAppConfig } from "@mlc-ai/web-llm";
import {
  Bot, BrainCircuit, Check, ChevronDown, Copy, Menu, MessageSquarePlus,
  Send, Settings2, ShieldCheck, Trash2, WifiOff, X, Zap
} from "lucide-react";

const MODEL_OPTIONS = [
  {
    id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    name: "Qwen 2.5 · 1.5B",
    detail: "คุณภาพคำตอบดีกว่า เหมาะเป็นตัวหลัก",
  },
  {
    id: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
    name: "Qwen 2.5 · 0.5B",
    detail: "ตัวเลือกสำรอง ใช้ทรัพยากรน้อยกว่า",
  },
];

const SYSTEM_PROMPT = `คุณคือ Ton AI ผู้ช่วยส่วนตัวที่ตอบภาษาเดียวกับผู้ใช้เป็นหลัก
ตอบเป็นภาษาไทยเมื่อผู้ใช้ถามภาษาไทย และตอบภาษาอังกฤษเมื่อผู้ใช้ถามภาษาอังกฤษ
ให้คำตอบชัดเจน มีเหตุผล และละเอียดตามความเหมาะสม
ถ้าไม่แน่ใจให้บอกตามตรง อย่าสร้างข้อเท็จจริงหรือแหล่งอ้างอิงขึ้นมาเอง
คุณไม่มีอินเทอร์เน็ตและอาจไม่มีข้อมูลเหตุการณ์ปัจจุบัน`;

function App() {
  const [modelId, setModelId] = useState(MODEL_OPTIONS[0].id);
  const [engine, setEngine] = useState(null);
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("ยังไม่ได้โหลดโมเดล");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(900);
  const [copiedIndex, setCopiedIndex] = useState(-1);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const engineRef = useRef(null);

  const selectedModel = MODEL_OPTIONS.find((m) => m.id === modelId) || MODEL_OPTIONS[0];
  const hasWebGPU = typeof navigator !== "undefined" && !!navigator.gpu;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    return () => {
      // Release engine resources when this page is closed/unmounted.
      try { engineRef.current?.unload(); } catch {}
    };
  }, []);

  async function loadModel(nextModel = modelId) {
    if (engineRef.current) {
      setError("มีโมเดลทำงานอยู่แล้ว หากต้องการเปลี่ยนโมเดลให้รีเฟรชหน้าเว็บก่อน");
      return;
    }
    setError("");
    setStatus("loading");
    setProgress(0);
    setProgressText("กำลังเตรียมระบบ AI...");
    try {
      if (!navigator.gpu) {
        throw new Error("Safari ยังไม่เปิดใช้ WebGPU บนอุปกรณ์นี้ หรือเบราว์เซอร์ไม่รองรับ กรุณาอัปเดต iOS และ Safari แล้วลองใหม่");
      }
      const appConfig = {
        ...prebuiltAppConfig,
        cacheBackend: "indexeddb",
      };
      const created = await CreateMLCEngine(nextModel, {
        appConfig,
        initProgressCallback: (report) => {
          const p = Math.max(0, Math.min(1, report.progress ?? 0));
          setProgress(p);
          setProgressText(report.text || "กำลังดาวน์โหลดและเตรียมโมเดล...");
        },
      });
      engineRef.current = created;
      setEngine(created);
      setStatus("ready");
      setProgress(1);
      setProgressText("พร้อมใช้งานบนอุปกรณ์นี้");
    } catch (e) {
      console.error(e);
      setStatus("error");
      setError(e?.message || "โหลดโมเดลไม่สำเร็จ");
      setProgressText("โหลดโมเดลไม่สำเร็จ");
    }
  }

  async function sendMessage(event) {
    event?.preventDefault();
    const text = input.trim();
    if (!text || !engineRef.current || busy) return;

    const userMessage = { role: "user", content: text };
    const assistantMessage = { role: "assistant", content: "" };
    const nextMessages = [...messages, userMessage, assistantMessage];
    setMessages(nextMessages);
    setInput("");
    setBusy(true);
    setError("");

    try {
      const context = [
        { role: "system", content: SYSTEM_PROMPT },
        ...nextMessages.slice(-13, -1).map(({ role, content }) => ({ role, content })),
        userMessage,
      ];
      const chunks = await engineRef.current.chat.completions.create({
        messages: context,
        temperature,
        max_tokens: maxTokens,
        stream: true,
      });

      let answer = "";
      for await (const chunk of chunks) {
        answer += chunk.choices?.[0]?.delta?.content || "";
        setMessages((current) => {
          const updated = [...current];
          updated[updated.length - 1] = { role: "assistant", content: answer };
          return updated;
        });
      }
    } catch (e) {
      console.error(e);
      setError(`ตอบไม่สำเร็จ: ${e?.message || "เกิดข้อผิดพลาด"}`);
      setMessages((current) => current.slice(0, -1));
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  function newChat() {
    if (busy) return;
    setMessages([]);
    setInput("");
    setShowSidebar(false);
  }

  async function copyMessage(content, index) {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(-1), 1500);
    } catch {
      setError("คัดลอกไม่ได้ในเบราว์เซอร์นี้");
    }
  }

  const installHelp = /iphone|ipad|ipod/i.test(navigator.userAgent)
    ? "ติดตั้ง: กดปุ่มแชร์ใน Safari แล้วเลือก “เพิ่มไปยังหน้าจอโฮม”"
    : "เปิดผ่าน HTTPS เพื่อให้เบราว์เซอร์อนุญาตการประมวลผล AI";

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="icon-btn" onClick={() => setShowSidebar(!showSidebar)} aria-label="เมนู">
          <Menu size={21} />
        </button>
        <div className="brand">
          <div className="brand-icon"><BrainCircuit size={21} /></div>
          <div><strong>Ton AI</strong><span>PRIVATE · ON-DEVICE AI</span></div>
        </div>
        <button className="icon-btn" onClick={() => setShowSettings(true)} aria-label="ตั้งค่า">
          <Settings2 size={21} />
        </button>
      </header>

      {showSidebar && (
        <div className="drawer-backdrop" onClick={() => setShowSidebar(false)}>
          <aside className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head"><strong>Ton AI</strong><button className="icon-btn" onClick={() => setShowSidebar(false)}><X /></button></div>
            <button className="new-chat" onClick={newChat}><MessageSquarePlus size={18} /> เริ่มบทสนทนาใหม่</button>
            <div className="drawer-note">เวอร์ชันนี้ไม่เก็บประวัติแชตถาวร เมื่อปิดหรือรีเฟรชหน้าเว็บ บทสนทนาจะเริ่มใหม่</div>
          </aside>
        </div>
      )}

      <main className="main">
        {messages.length === 0 ? (
          <section className="welcome">
            <div className="hero-icon"><Bot size={34} /></div>
            <p className="eyebrow">YOUR PRIVATE AI ASSISTANT</p>
            <h1>สวัสดีครับ<br /><span>มีอะไรให้ช่วยไหม?</span></h1>
            <p className="welcome-sub">ถามได้ทั้งภาษาไทยและภาษาอังกฤษ<br />ทุกคำตอบประมวลผลบน iPhone ของคุณ</p>

            <div className="privacy-card">
              <ShieldCheck size={19} />
              <div><strong>ความเป็นส่วนตัวเป็นอันดับแรก</strong><span>ไม่มี API · ไม่ส่งข้อความไป Server AI · ไม่เก็บประวัติข้ามแชต</span></div>
            </div>

            <div className="model-card">
              <div className="model-card-head">
                <div><span className="label">โมเดล AI</span><strong>{selectedModel.name}</strong></div>
                <span className={`status-dot ${status}`} />
              </div>
              <p>{selectedModel.detail}</p>
              {status === "idle" || status === "error" ? (
                <button className="primary-btn full" onClick={() => loadModel()}><Zap size={17} /> ดาวน์โหลดและเริ่มใช้งาน</button>
              ) : (
                <>
                  <div className="progress-track"><div style={{ width: `${Math.round(progress * 100)}%` }} /></div>
                  <div className="progress-label"><span>{progressText}</span><b>{Math.round(progress * 100)}%</b></div>
                </>
              )}
              {error && <div className="error-box">{error}</div>}
              {!hasWebGPU && <div className="warning-box">ยังตรวจไม่พบ WebGPU ในเบราว์เซอร์นี้</div>}
            </div>

            <div className="suggestions">
              <span className="label">ลองถามได้เลย</span>
              {["ช่วยอธิบายเรื่องหลุมดำแบบเข้าใจง่าย", "ช่วยวางแผนเรียนภาษาอังกฤษ 30 วัน", "อธิบายความแตกต่างระหว่าง AI กับ Machine Learning"].map((q) => (
                <button key={q} onClick={() => { setInput(q); inputRef.current?.focus(); }}>{q}<span>↗</span></button>
              ))}
            </div>
          </section>
        ) : (
          <section className="chat-list">
            <div className="chat-meta"><span className="live-dot" /> สนทนากับ {selectedModel.name}</div>
            {messages.map((message, index) => (
              <article className={`message ${message.role}`} key={index}>
                {message.role === "assistant" && <div className="avatar"><BrainCircuit size={17} /></div>}
                <div className="bubble-wrap">
                  <div className="bubble">
                    {message.content || (busy && index === messages.length - 1 ? <span className="typing">กำลังคิด...</span> : "")}
                  </div>
                  {message.role === "assistant" && message.content && (
                    <button className="copy-btn" onClick={() => copyMessage(message.content, index)}>
                      {copiedIndex === index ? <Check size={14} /> : <Copy size={14} />}
                      {copiedIndex === index ? "คัดลอกแล้ว" : "คัดลอก"}
                    </button>
                  )}
                </div>
              </article>
            ))}
            {error && <div className="error-box">{error}</div>}
            <div ref={bottomRef} />
          </section>
        )}
      </main>

      <footer className="composer-area">
        {status !== "ready" && messages.length > 0 && (
          <div className="composer-hint">ต้องโหลดโมเดลให้เสร็จก่อนจึงจะส่งข้อความได้</div>
        )}
        <form className="composer" onSubmit={sendMessage}>
          <textarea
            ref={inputRef}
            rows="1"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(e); } }}
            placeholder={status === "ready" ? "ถาม Ton AI ได้เลย..." : "โหลดโมเดล AI ก่อนเริ่มแชต"}
            disabled={status !== "ready" || busy}
          />
          <button className="send-btn" type="submit" disabled={status !== "ready" || busy || !input.trim()} aria-label="ส่งข้อความ">
            <Send size={19} />
          </button>
        </form>
        <div className="footer-note"><WifiOff size={12} /> ทำงานในอุปกรณ์ · คำตอบอาจไม่ใช่ข้อมูลล่าสุด</div>
      </footer>

      {showSettings && (
        <div className="modal-backdrop" onClick={() => setShowSettings(false)}>
          <section className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head"><div><span className="label">TON AI</span><h2>ตั้งค่า</h2></div><button className="icon-btn" onClick={() => setShowSettings(false)}><X /></button></div>
            <label className="field-label">เลือกโมเดล</label>
            <div className="model-options">
              {MODEL_OPTIONS.map((m) => (
                <button key={m.id} className={modelId === m.id ? "model-option selected" : "model-option"} onClick={() => setModelId(m.id)} disabled={status === "loading" || status === "ready"}>
                  <span><strong>{m.name}</strong><small>{m.detail}</small></span>{modelId === m.id && <Check size={18} />}
                </button>
              ))}
            </div>
            <label className="field-label">ความละเอียดในการตอบ: {maxTokens} tokens</label>
            <input type="range" min="256" max="1400" step="100" value={maxTokens} onChange={(e) => setMaxTokens(Number(e.target.value))} />
            <label className="field-label">ความสร้างสรรค์: {temperature.toFixed(1)}</label>
            <input type="range" min="0.1" max="1" step="0.1" value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} />
            <div className="settings-info"><ShieldCheck size={17} /> ประวัติแชตเก็บไว้ในหน่วยความจำของหน้าเว็บเท่านั้น ส่วนไฟล์โมเดลจะถูกแคชไว้เพื่อใช้ Offline</div>
            <p className="install-help">{installHelp}</p>
            <button className="secondary-btn full" onClick={() => { setShowSettings(false); newChat(); }}>ล้างบทสนทนาปัจจุบัน</button>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;