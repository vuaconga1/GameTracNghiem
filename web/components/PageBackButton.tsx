import Link from 'next/link';

type PageBackButtonProps = {
  href?: string;
  onClick?: () => void;
  title?: string;
  label?: string;
};

export function PageBackButton({
  href,
  onClick,
  title = 'Quay lại',
  label = 'Quay lại',
}: PageBackButtonProps) {
  const content = (
    <>
      <i className="fas fa-arrow-left" aria-hidden="true" />
      {label}
    </>
  );

  return (
    <div className="page-back-bar">
      {href ? (
        <Link href={href} className="page-back" title={title} aria-label={title}>
          {content}
        </Link>
      ) : (
        <button type="button" className="page-back" title={title} aria-label={title} onClick={onClick}>
          {content}
        </button>
      )}
    </div>
  );
}
