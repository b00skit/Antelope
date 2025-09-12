'use client';

import Image from 'next/image';
import { useState } from 'react';

interface CharacterImageProps {
  initialSrc: string;
  alt: string;
  characterId: number;
}

export function CharacterImage({ initialSrc, alt, characterId }: CharacterImageProps) {
  const [src, setSrc] = useState(initialSrc);
  const placeholder = `https://picsum.photos/seed/${characterId}/400/400`;

  return (
    <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        className="object-cover"
        priority
        unoptimized
        onError={() => {
            if (src !== placeholder) {
                setSrc(placeholder);
            }
        }}
    />
  );
}
