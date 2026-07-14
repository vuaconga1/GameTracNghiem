'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';

import { AdminShell } from '@/components/admin/AdminShell';
import { DataLoading } from '@/components/DataLoading';
import { EXERCISE_GAMES, type AdminGameKey, isAdminGameKey } from '@/lib/admin/payloadSchemas';
import { GAME_CATALOG } from '@/lib/gameCatalog';

function splitLines(value: string): string[] {
  return value
    .split(/\r?\n|,|\|/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="admin-field">
      <label>{label}</label>
      {children}
      {help ? <div className="help">{help}</div> : null}
    </div>
  );
}

type QuestionEditorProps = {
  displayName: string;
  courseId: string;
  game: string;
  questionId?: string;
};

export function QuestionEditor({
  displayName,
  courseId,
  game,
  questionId,
}: QuestionEditorProps) {
  const router = useRouter();
  const meta = GAME_CATALOG.find((item) => item.key === game);
  const isExercise = isAdminGameKey(game) && EXERCISE_GAMES.has(game as AdminGameKey);
  const [loading, setLoading] = useState(Boolean(questionId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [courseName, setCourseName] = useState('');
  const [sortOrder, setSortOrder] = useState(1);
  const [active, setActive] = useState(true);
  const [externalId, setExternalId] = useState('');
  const [payload, setPayload] = useState<Record<string, unknown>>({});

  const title = useMemo(
    () => `${questionId ? 'Sửa' : 'Thêm'} · ${meta?.label || game}`,
    [questionId, meta, game]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!questionId) {
        const res = await fetch(`/api/admin/courses/${courseId}`);
        const data = await res.json();
        if (!cancelled && data.success) {
          setCourseName(data.course.name);
          setPayload(defaultPayload(game));
          setLoading(false);
        }
        return;
      }
      const res = await fetch(`/api/admin/questions/${questionId}`);
      const data = await res.json();
      if (cancelled) return;
      if (!data.success) {
        setError(data.message || 'Không tải được');
        setLoading(false);
        return;
      }
      setCourseName(data.item.course.name);
      setSortOrder(data.item.sortOrder || 1);
      setActive(data.item.active);
      setExternalId(data.item.externalId || '');
      setPayload((data.item.payload || {}) as Record<string, unknown>);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId, game, questionId]);

  function setField(key: string, value: unknown) {
    setPayload((prev) => ({ ...prev, [key]: value }));
  }

  function items(): Array<Record<string, unknown>> {
    return Array.isArray(payload.items) ? (payload.items as Array<Record<string, unknown>>) : [];
  }

  function setItems(next: Array<Record<string, unknown>>) {
    setField('items', next);
  }

  function updateItem(index: number, patch: Record<string, unknown>) {
    const next = items().map((item, i) => (i === index ? { ...item, ...patch } : item));
    setItems(next);
  }

  function addItem(template: Record<string, unknown>) {
    const next = [...items(), { ...template, order: items().length + 1 }];
    setItems(next);
  }

  function removeItem(index: number) {
    const next = items()
      .filter((_, i) => i !== index)
      .map((item, i) => ({ ...item, order: i + 1 }));
    setItems(next);
  }

  function moveItem(index: number, dir: -1 | 1) {
    const next = [...items()];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    const tmp = next[index];
    next[index] = next[target];
    next[target] = tmp;
    setItems(next.map((item, i) => ({ ...item, order: i + 1 })));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = {
        game,
        sortOrder,
        active,
        externalId: externalId || null,
        payload: normalizePayload(game, payload),
      };
      const res = await fetch(
        questionId
          ? `/api/admin/questions/${questionId}`
          : `/api/admin/courses/${courseId}/questions`,
        {
          method: questionId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'Không lưu được');
        return;
      }
      router.push(`/admin/courses/${courseId}/games/${game}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (!isAdminGameKey(game)) {
    return (
      <AdminShell displayName={displayName} title="Game không hợp lệ">
        <div className="admin-alert error">Loại game không được hỗ trợ.</div>
      </AdminShell>
    );
  }

  return (
    <AdminShell displayName={displayName} title={title}>
      <div className="admin-toolbar">
        <Link className="admin-btn" href={`/admin/courses/${courseId}/games/${game}`}>
          ← {courseName || 'Danh sách'}
        </Link>
      </div>
      {error ? <div className="admin-alert error">{error}</div> : null}
      {loading ? (
        <DataLoading />
      ) : (
        <div className="admin-panel">
          <form className={`admin-form ${isExercise ? 'wide' : ''}`} onSubmit={onSubmit}>
            <div className="admin-form-row">
              <Field label="Thứ tự">
                <input
                  type="number"
                  min={0}
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
                />
              </Field>
              <Field label="Mã (tuỳ chọn)" help="Ví dụ mã bài từ Excel: HK2-NV-01">
                <input value={externalId} onChange={(e) => setExternalId(e.target.value)} />
              </Field>
              <div className="admin-field">
                <label className="admin-checks">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                  />
                  Đang dùng (hiện cho học sinh)
                </label>
              </div>
            </div>

            {game === 'grammar' ? (
              <>
                <Field label="Câu gốc (tuỳ chọn)">
                  <input
                    value={String(payload.source || '')}
                    onChange={(e) => setField('source', e.target.value)}
                  />
                </Field>
                <div className="admin-form-row">
                  <Field label="Phần trước chỗ trống">
                    <input
                      value={String(payload.prefix || '')}
                      onChange={(e) => setField('prefix', e.target.value)}
                      required
                    />
                  </Field>
                  <Field label="Phần sau chỗ trống">
                    <input
                      value={String(payload.suffix || '')}
                      onChange={(e) => setField('suffix', e.target.value)}
                    />
                  </Field>
                </div>
                <Field label="Gợi ý">
                  <input
                    value={String(payload.hint || '')}
                    onChange={(e) => setField('hint', e.target.value)}
                  />
                </Field>
                <Field
                  label="Đáp án đúng"
                  help="Mỗi đáp án một dòng (hoặc cách nhau bằng | )"
                >
                  <textarea
                    value={Array.isArray(payload.answers) ? payload.answers.join('\n') : ''}
                    onChange={(e) => setField('answers', splitLines(e.target.value))}
                    required
                  />
                </Field>
              </>
            ) : null}

            {game === 'quiz' ? (
              <>
                <div className="admin-form-row">
                  <Field label="Loại câu">
                    <select
                      value={String(payload.type || 'multiple_choice')}
                      onChange={(e) => setField('type', e.target.value)}
                    >
                      <option value="multiple_choice">Trắc nghiệm</option>
                      <option value="fill_blank">Điền từ</option>
                      <option value="word_form">Word form</option>
                    </select>
                  </Field>
                  <Field label="Nhãn loại (tuỳ chọn)">
                    <input
                      value={String(payload.typeLabel || '')}
                      onChange={(e) => setField('typeLabel', e.target.value)}
                    />
                  </Field>
                </div>
                <Field label="Nội dung câu hỏi">
                  <textarea
                    value={String(payload.question || '')}
                    onChange={(e) => setField('question', e.target.value)}
                    required
                  />
                </Field>
                {String(payload.type || 'multiple_choice') === 'multiple_choice' ? (
                  <Field label="Các lựa chọn" help="Mỗi lựa chọn một dòng">
                    <textarea
                      value={Array.isArray(payload.options) ? payload.options.join('\n') : ''}
                      onChange={(e) => setField('options', splitLines(e.target.value))}
                    />
                  </Field>
                ) : null}
                <Field label="Đáp án đúng">
                  <input
                    value={String(payload.answer || '')}
                    onChange={(e) => setField('answer', e.target.value)}
                    required
                  />
                </Field>
                <Field label="Đáp án chấp nhận thêm" help="Tuỳ chọn, mỗi dòng một đáp án">
                  <textarea
                    value={Array.isArray(payload.accept) ? payload.accept.join('\n') : ''}
                    onChange={(e) => setField('accept', splitLines(e.target.value))}
                  />
                </Field>
              </>
            ) : null}

            {game === 'pronunciation' ? (
              <>
                <Field label="Chế độ">
                  <select
                    value={String(payload.mode || 'phoneme')}
                    onChange={(e) => setField('mode', e.target.value)}
                  >
                    <option value="phoneme">Luyện âm</option>
                    <option value="word">Luyện từ</option>
                    <option value="sentence">Luyện câu</option>
                  </select>
                </Field>
                <Field label="Hướng dẫn">
                  <input
                    value={String(payload.prompt || '')}
                    onChange={(e) => setField('prompt', e.target.value)}
                  />
                </Field>
                <Field label="Nội dung cần đọc">
                  <input
                    value={String(payload.targetText || '')}
                    onChange={(e) => setField('targetText', e.target.value)}
                    required
                  />
                </Field>
                <div className="admin-form-row">
                  <Field label="IPA (tuỳ chọn)">
                    <input
                      value={String(payload.targetIpa || '')}
                      onChange={(e) => setField('targetIpa', e.target.value)}
                    />
                  </Field>
                  <Field label="Link audio (tuỳ chọn)">
                    <input
                      value={String(payload.referenceAudioUrl || '')}
                      onChange={(e) => setField('referenceAudioUrl', e.target.value)}
                    />
                  </Field>
                </div>
                <Field label="Gợi ý">
                  <input
                    value={String(payload.hint || '')}
                    onChange={(e) => setField('hint', e.target.value)}
                  />
                </Field>
              </>
            ) : null}

            {game === 'scramble' || game === 'word_match' ? (
              <>
                <Field label="Từ">
                  <input
                    value={String(payload.word || '')}
                    onChange={(e) => setField('word', e.target.value)}
                    required
                  />
                </Field>
                <Field label="Gợi ý">
                  <input
                    value={String(payload.hint || '')}
                    onChange={(e) => setField('hint', e.target.value)}
                  />
                </Field>
                <Field label="Link hình (tuỳ chọn)">
                  <input
                    value={String(payload.image || '')}
                    onChange={(e) => setField('image', e.target.value)}
                  />
                </Field>
              </>
            ) : null}

            {isExercise ? (
              <>
                <Field label="Tiêu đề bài">
                  <input
                    value={String(payload.title || '')}
                    onChange={(e) => setField('title', e.target.value)}
                    required
                  />
                </Field>
                <Field label="Hướng dẫn">
                  <input
                    value={String(payload.instruction || '')}
                    onChange={(e) => setField('instruction', e.target.value)}
                  />
                </Field>
                {game === 'look_and_write' ||
                game === 'read_and_complete' ||
                game === 'vocabulary_test' ? (
                  <Field label="Hộp từ gợi ý" help="Mỗi từ một dòng hoặc cách nhau bằng |">
                    <textarea
                      value={
                        Array.isArray(payload.word_bank) ? payload.word_bank.join('\n') : ''
                      }
                      onChange={(e) => setField('word_bank', splitLines(e.target.value))}
                    />
                  </Field>
                ) : null}

                <div className="admin-item-list">
                  <div className="admin-toolbar">
                    <strong>Các dòng trong bài</strong>
                    <button
                      type="button"
                      className="admin-btn"
                      onClick={() => addItem(defaultItem(game))}
                    >
                      + Thêm dòng
                    </button>
                  </div>
                  {items().map((item, index) => (
                    <div className="admin-item-card" key={index}>
                      <div className="admin-item-card-head">
                        <span>Dòng {index + 1}</span>
                        <div className="admin-toolbar-actions">
                          <button
                            type="button"
                            className="admin-btn"
                            onClick={() => moveItem(index, -1)}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="admin-btn"
                            onClick={() => moveItem(index, 1)}
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            className="admin-btn danger"
                            onClick={() => removeItem(index)}
                          >
                            Xóa dòng
                          </button>
                        </div>
                      </div>

                      {game === 'look_and_write' || game === 'vocabulary_test' ? (
                        <div className="admin-form-row">
                          <Field label="Link hình">
                            <input
                              value={String(item.image || '')}
                              onChange={(e) => updateItem(index, { image: e.target.value })}
                            />
                          </Field>
                          <Field label="Đáp án">
                            <input
                              value={String(item.answer || '')}
                              onChange={(e) => updateItem(index, { answer: e.target.value })}
                              required
                            />
                          </Field>
                        </div>
                      ) : null}

                      {game === 'choose_and_circle' ? (
                        <div className="admin-form-row">
                          <Field label="Link hình">
                            <input
                              value={String(item.image || '')}
                              onChange={(e) => updateItem(index, { image: e.target.value })}
                            />
                          </Field>
                          <Field label="Lựa chọn A">
                            <input
                              value={
                                Array.isArray(item.options) ? String(item.options[0] || '') : ''
                              }
                              onChange={(e) => {
                                const options = Array.isArray(item.options)
                                  ? [...item.options]
                                  : ['', ''];
                                options[0] = e.target.value;
                                updateItem(index, { options });
                              }}
                              required
                            />
                          </Field>
                          <Field label="Lựa chọn B">
                            <input
                              value={
                                Array.isArray(item.options) ? String(item.options[1] || '') : ''
                              }
                              onChange={(e) => {
                                const options = Array.isArray(item.options)
                                  ? [...item.options]
                                  : ['', ''];
                                options[1] = e.target.value;
                                updateItem(index, { options });
                              }}
                              required
                            />
                          </Field>
                          <Field label="Đáp án đúng">
                            <input
                              value={String(item.answer || '')}
                              onChange={(e) => updateItem(index, { answer: e.target.value })}
                              required
                            />
                          </Field>
                        </div>
                      ) : null}

                      {game === 'read_and_complete' ? (
                        <div className="admin-form-row">
                          <Field label="Câu (dùng ___ cho chỗ trống)">
                            <input
                              value={String(item.sentence || '')}
                              onChange={(e) => updateItem(index, { sentence: e.target.value })}
                              required
                            />
                          </Field>
                          <Field label="Đáp án">
                            <input
                              value={String(item.answer || '')}
                              onChange={(e) => updateItem(index, { answer: e.target.value })}
                              required
                            />
                          </Field>
                          <Field label="Link hình (tuỳ chọn)">
                            <input
                              value={String(item.image || '')}
                              onChange={(e) => updateItem(index, { image: e.target.value })}
                            />
                          </Field>
                        </div>
                      ) : null}

                      {game === 'read_and_match' ? (
                        <div className="admin-form-row">
                          <Field label="Câu">
                            <input
                              value={String(item.sentence || '')}
                              onChange={(e) => updateItem(index, { sentence: e.target.value })}
                              required
                            />
                          </Field>
                          <Field label="Link hình">
                            <input
                              value={String(item.image || '')}
                              onChange={(e) => updateItem(index, { image: e.target.value })}
                            />
                          </Field>
                          <Field label="Nhãn hình">
                            <input
                              value={String(item.label || '')}
                              onChange={(e) => updateItem(index, { label: e.target.value })}
                              required
                            />
                          </Field>
                          <Field label="Đáp án (nhãn đúng)">
                            <input
                              value={String(item.answer || '')}
                              onChange={(e) => updateItem(index, { answer: e.target.value })}
                              required
                            />
                          </Field>
                        </div>
                      ) : null}

                      {game === 'vocabulary_check' ? (
                        <div className="admin-form-row">
                          <Field label="Link hình">
                            <input
                              value={String(item.image || '')}
                              onChange={(e) => updateItem(index, { image: e.target.value })}
                            />
                          </Field>
                          <Field label="Từ hiển thị">
                            <input
                              value={String(item.word || '')}
                              onChange={(e) => updateItem(index, { word: e.target.value })}
                              required
                            />
                          </Field>
                          <Field label="Câu mô tả">
                            <input
                              value={String(item.sentence || '')}
                              onChange={(e) => updateItem(index, { sentence: e.target.value })}
                              required
                            />
                          </Field>
                          <Field label="Đúng hay sai?">
                            <select
                              value={item.is_correct ? 'true' : 'false'}
                              onChange={(e) =>
                                updateItem(index, { is_correct: e.target.value === 'true' })
                              }
                            >
                              <option value="true">Đúng</option>
                              <option value="false">Sai</option>
                            </select>
                          </Field>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            <div className="admin-form-actions">
              <button className="admin-btn primary" type="submit" disabled={saving}>
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
              <Link className="admin-btn" href={`/admin/courses/${courseId}/games/${game}`}>
                Hủy
              </Link>
            </div>
          </form>
        </div>
      )}
    </AdminShell>
  );
}

function defaultPayload(game: string): Record<string, unknown> {
  if (game === 'grammar') {
    return { source: '', prefix: '', suffix: '', hint: '', answers: [] };
  }
  if (game === 'quiz') {
    return {
      type: 'multiple_choice',
      typeLabel: '',
      question: '',
      answer: '',
      options: [],
      accept: [],
    };
  }
  if (game === 'pronunciation') {
    return {
      mode: 'phoneme',
      modeLabel: '',
      prompt: '',
      targetText: '',
      targetIpa: '',
      referenceAudioUrl: '',
      hint: '',
    };
  }
  if (game === 'scramble' || game === 'word_match') {
    return { word: '', hint: '', image: '' };
  }
  return {
    title: '',
    instruction: '',
    word_bank: [],
    items: [defaultItem(game)],
  };
}

function defaultItem(game: string): Record<string, unknown> {
  if (game === 'choose_and_circle') {
    return { order: 1, image: '', options: ['', ''], answer: '' };
  }
  if (game === 'read_and_complete') {
    return { order: 1, sentence: '', image: '', answer: '' };
  }
  if (game === 'read_and_match') {
    return { order: 1, sentence: '', image: '', label: '', answer: '' };
  }
  if (game === 'vocabulary_check') {
    return { order: 1, image: '', word: '', sentence: '', is_correct: true };
  }
  return { order: 1, image: '', answer: '' };
}

function normalizePayload(game: string, payload: Record<string, unknown>) {
  if (game === 'quiz') {
    const type = String(payload.type || 'multiple_choice');
    return {
      ...payload,
      type,
      fillMode: type === 'fill_blank' || type === 'word_form',
      accept:
        Array.isArray(payload.accept) && payload.accept.length
          ? payload.accept
          : payload.answer
            ? [String(payload.answer)]
            : [],
    };
  }
  if (game === 'pronunciation') {
    const mode = String(payload.mode || 'phoneme');
    return {
      ...payload,
      mode,
      modeLabel:
        mode === 'sentence' ? 'Luyện câu' : mode === 'word' ? 'Luyện từ' : 'Luyện âm',
    };
  }
  return payload;
}
