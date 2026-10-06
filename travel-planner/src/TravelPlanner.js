import { useState } from 'react';
import Anthropic from '@anthropic-ai/sdk';
import './TravelPlanner.css';

// 注意: REACT_APP_ で始まる環境変数はビルド時にブラウザ用JSへ埋め込まれ、
// 誰でも閲覧できます。ローカル開発専用とし、公開する場合はサーバー側から呼び出してください。
const apiKey = process.env.REACT_APP_ANTHROPIC_API_KEY;

const client = apiKey
  ? new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
  : null;

const SYSTEM_PROMPT =
  'あなたは経験豊富な旅行プランナーです。ユーザーの条件に合わせて、' +
  '日ごとの具体的な旅程（午前・午後・夜）、移動手段、おすすめの食事、' +
  'おおよその費用、注意点を日本語のMarkdownで簡潔にまとめてください。';

function TravelPlanner() {
  const [destination, setDestination] = useState('');
  const [days, setDays] = useState(3);
  const [budget, setBudget] = useState('');
  const [interests, setInterests] = useState('');
  const [plan, setPlan] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!client) {
      setError('REACT_APP_ANTHROPIC_API_KEY が設定されていません（.env を確認し、npm start を再起動してください）。');
      return;
    }

    setLoading(true);
    setError('');
    setPlan('');

    const prompt = [
      `行き先: ${destination}`,
      `日数: ${days}日`,
      budget && `予算: ${budget}`,
      interests && `興味・希望: ${interests}`,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      const stream = client.beta.messages
        .stream({
          model: 'claude-opus-5-5',
          max_tokens: 16000,
          output_config: { effort: 'medium' },
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: prompt }],
        })
        .on('text', (text) => setPlan((prev) => prev + text));

      const message = await stream.finalMessage();
      if (message.stop_reason === 'refusal') {
        setError('このリクエストには回答できませんでした。条件を変えてお試しください。');
      }
    } catch (err) {
      if (err instanceof Anthropic.AuthenticationError) {
        setError('APIキーが無効です。');
      } else if (err instanceof Anthropic.RateLimitError) {
        setError('リクエストが多すぎます。しばらく待ってから再度お試しください。');
      } else if (err instanceof Anthropic.APIConnectionError) {
        setError('ネットワークエラーが発生しました。');
      } else {
        setError(`エラーが発生しました: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="planner">
      <h1>AI 旅行プランナー</h1>

      <form className="planner-form" onSubmit={handleSubmit}>
        <label>
          行き先
          <input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="例: 京都"
            required
          />
        </label>
        <label>
          日数
          <input
            type="number"
            min="1"
            max="30"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            required
          />
        </label>
        <label>
          予算（任意）
          <input
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="例: 5万円"
          />
        </label>
        <label>
          興味・希望（任意）
          <textarea
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
            placeholder="例: 寺社巡り、和食、のんびりしたペース"
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? '作成中…' : 'プランを作成'}
        </button>
      </form>

      {error && <p className="planner-error">{error}</p>}
      {plan && <pre className="planner-result">{plan}</pre>}
    </div>
  );
}

export default TravelPlanner;
