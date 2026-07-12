'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { DataLoading } from '@/components/DataLoading';

type CourseDetail = {
  id: string;
  name: string;
  className: string;
  levelName: string;
  courseKey: string;
};

type CourseDetailResponse = {
  success: boolean;
  course?: CourseDetail;
  games?: {
    grammar?: {
      questionCount: number;
      statuses: string[];
    };
  };
  message?: string;
};

const COMING_SOON_GAMES = [
  'Quiz',
  'Pronunciation',
  'Word Scramble',
  'Word Match',
  'Look and Write',
  'Choose and Circle',
  'Read and Complete',
  'Read and Match',
  'Vocabulary Test',
  'Vocabulary Check',
];

export default function CourseDetailPage() {
  const params = useParams<{ id: string | string[] }>();
  const courseId = useMemo(() => {
    return Array.isArray(params.id) ? params.id[0] : params.id;
  }, [params.id]);

  const [data, setData] = useState<CourseDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function loadCourse() {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const res = await fetch(`/api/courses/${courseId}`, {
          signal: controller.signal,
        });
        const json = (await res.json()) as CourseDetailResponse;
        if (!res.ok || !json.success) {
          throw new Error(json.message || 'Không tải được khóa học');
        }
        setData(json);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setData(null);
        setErrorMessage(err instanceof Error ? err.message : 'Không tải được khóa học');
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    if (courseId) {
      loadCourse();
    }

    return () => controller.abort();
  }, [courseId]);

  if (isLoading) {
    return <DataLoading />;
  }

  if (errorMessage || !data?.course) {
    return <DataLoading variant="message" message={errorMessage || 'Không tìm thấy khóa học'} />;
  }

  const grammar = data.games?.grammar;
  const completedCount = (grammar?.statuses || []).filter((status) => status !== 'empty').length;

  return (
    <section className="space-y-6">
      <Link
        href="/"
        className="inline-flex rounded-full bg-[var(--primary-light)] px-4 py-2 text-sm font-black text-[var(--primary)] transition hover:bg-[var(--primary-hover)]"
      >
        Quay lại danh sách
      </Link>

      <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--white)] p-8 shadow-[0_20px_60px_rgba(13,43,110,0.08)]">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-[var(--accent-gold)]">
          {data.course.className} · {data.course.levelName}
        </p>
        <h1 className="mt-3 text-3xl font-black text-[var(--primary)] sm:text-5xl">
          {data.course.name}
        </h1>
        <p className="mt-4 max-w-2xl text-lg font-bold text-[var(--text-muted)]">
          Chọn trò chơi để luyện tập. Tiến độ được lưu theo khóa {data.course.courseKey}.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href={`/games/grammar/${data.course.id}`}
          className="rounded-[1.5rem] border border-[var(--primary)] bg-[var(--white)] p-5 shadow-[0_14px_40px_rgba(13,43,110,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(13,43,110,0.1)]"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-gold)]">
                Đang mở
              </p>
              <h2 className="mt-3 text-2xl font-black text-[var(--primary)]">Grammar</h2>
              <p className="mt-2 font-bold text-[var(--text-muted)]">
                {grammar?.questionCount || 0} câu hỏi · đã làm {completedCount}
              </p>
            </div>
            <span className="rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-black text-[var(--white)]">
              Vào chơi
            </span>
          </div>
        </Link>

        {COMING_SOON_GAMES.map((game) => (
          <div
            key={game}
            aria-disabled="true"
            className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--white)] p-5 opacity-65 shadow-[0_14px_40px_rgba(13,43,110,0.04)]"
          >
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Sắp có
            </p>
            <h2 className="mt-3 text-2xl font-black text-[var(--primary)]">{game}</h2>
            <p className="mt-2 font-bold text-[var(--text-muted)]">
              Trò chơi này sẽ được mở trong các task tiếp theo.
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
