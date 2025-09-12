'use client';

import Image from 'next/image';
import { useState } from 'react';

interface CharacterImageProps {
  initialSrc: string;
  alt: string;
}

export function CharacterImage({ initialSrc, alt }: CharacterImageProps) {
  const fallbackSrc = 'https://mdc.gta.world/img/persons/No-Avatar.png';
  const [src, setSrc] = useState(initialSrc);

  return (
    <Image
        src={src}
        alt={alt}
        width={150}
        height={150}
        className="object-cover rounded-md border"
        priority
        unoptimized
        onError={() => {
            if (src !== fallbackSrc) {
                setSrc(fallbackSrc);
            }
        }}
    />
  );
}
