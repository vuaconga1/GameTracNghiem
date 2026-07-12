import { LeaderboardPanel } from '@/features/leaderboard/LeaderboardPanel';

export default function LeaderboardPage() {
  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--white)] p-8 shadow-[0_20px_60px_rgba(13,43,110,0.08)]">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-[var(--accent-gold)]">
          WeWIN
        </p>
        <h1 className="mt-3 text-3xl font-black text-[var(--primary)] sm:text-5xl">
          Bảng xếp hạng
        </h1>
        <p className="mt-4 max-w-2xl text-lg font-bold text-[var(--text-muted)]">
          Tổng điểm từ ScoreLog theo ngày, tuần, tháng hoặc toàn bộ thời gian.
        </p>
      </div>

      <LeaderboardPanel />
    </section>
  );
}
