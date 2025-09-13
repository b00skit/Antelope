
import { promises as fs } from 'fs';
import path from 'path';
import Image from 'next/image';
import Link from 'next/link';
import { Separator } from '../ui/separator';

export async function Footer() {
    const file = await fs.readFile(path.join(process.cwd(), 'data/config.json'), 'utf8');
    const config = JSON.parse(file);

    return (
      <footer className="relative z-10 py-4 mt-auto">
        <div className="container mx-auto flex flex-col items-center justify-center gap-2">
            <Image 
                src={config.SITE_IMAGE}
                width={120}
                height={80}
                alt="MDC Panel Logo"
            />
          <p className="text-center text-sm text-muted-foreground">
            &copy; 2025-{new Date().getFullYear() + 1} {config.SITE_NAME}. All rights reserved. Version: <Link href="/changelog" className="hover:text-primary transition-colors">{config.SITE_VERSION}</Link>
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <Link href="/about" className="hover:text-primary transition-colors">About Page</Link>
              <Separator orientation="vertical" className="h-4" />
              <Link href="/credits" className="hover:text-primary transition-colors">Credits and Contributions</Link>
          </div>
        </div>
      </footer>
    );
}
