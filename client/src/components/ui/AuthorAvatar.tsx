import { useState } from 'react';

export function AuthorAvatar({
  image,
  emoji,
  name,
  className,
}: {
  image?: string | null;
  emoji?: string;
  name?: string;
  className: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(image) && !failed;
  if (showImage) {
    return (
      <img
        src={image!}
        alt=""
        className={`${className} object-cover`}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    );
  }
  return <span className={className}>{emoji || name?.trim().slice(0, 1) || '🍽️'}</span>;
}
