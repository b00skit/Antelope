import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { BarChart, ClipboardList, Users, ArrowRight, CheckCircle, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const features = [
    {
        icon: BarChart,
        title: "Statistics",
        description: "Provides a general overview of your faction, it's membership and ranks.",
    },
    {
        icon: ClipboardList,
        title: "Activity Rosters",
        description: "Setup rosters specific to your need to track member activity.",
    },
    {
        icon: Users,
        title: "Character Sheets",
        description: "Search for a specific character and provide an activity breakdown.",
    },
    {
        icon: Settings,
        title: "Faction Administration",
        description: "An intigrated permission-based / user system.",
    }
];

export default function LandingPage() {
    return (
        <main className="flex-grow">
            {/* Hero Section */}
            <section className="relative py-20 md:py-32 text-center bg-background overflow-hidden">
                <div className="absolute inset-0 bg-grid-slate-900/[0.04] bg-[bottom_1px_center] dark:bg-grid-slate-400/[0.05] dark:bg-bottom dark:border-b dark:border-slate-100/5 [mask-image:linear-gradient(to_bottom,transparent,black)]"></div>
                <div className="container relative z-10">
                    <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
                        Streamline Your Faction's Workflow
                    </h1>
                    <p className="mt-6 text-lg md:text-xl max-w-3xl mx-auto text-muted-foreground">
                        Antelope is an all-in-one toolkit designed for factions in the GTA:World community, providing essential tools to make your duties more efficient.
                    </p>
                    <div className="mt-8 flex justify-center gap-4">
                        <Button asChild size="lg">
                            <Link href="/login">Get Started <ArrowRight className="ml-2" /></Link>
                        </Button>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-16 sm:py-24 bg-secondary/50">
                <div className="container">
                    <div className="text-center">
                        <h2 className="text-3xl font-bold tracking-tight">Everything You Need, All in One Place</h2>
                        <p className="mt-4 text-lg text-muted-foreground">Manage your faction exactly however you need, the panel provides a lot of customization options.</p>
                    </div>
                    <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
                        {features.map((feature) => (
                            <Card key={feature.title} className="text-center">
                                <CardHeader>
                                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                                        <feature.icon className="h-6 w-6" />
                                    </div>
                                    <CardTitle className="mt-4">{feature.title}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground">{feature.description}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it Works Section */}
            <section className="py-16 sm:py-24">
                <div className="container grid md:grid-cols-2 gap-12 items-center">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Integrated with GTA:World</h2>
                        <p className="mt-4 text-lg text-muted-foreground">
                            Antelope securely connects with your GTA:World account to synchronize your faction memberships and character data, ensuring your information is always up-to-date.
                        </p>
                        <ul className="mt-6 space-y-4">
                            <li className="flex items-start">
                                <CheckCircle className="h-6 w-6 text-primary mr-3 mt-1 flex-shrink-0" />
                                <span>
                                    <strong className="font-semibold">Automatic Sync:</strong> Your faction roles and permissions are automatically updated.
                                </span>
                            </li>
                            <li className="flex items-start">
                                <CheckCircle className="h-6 w-6 text-primary mr-3 mt-1 flex-shrink-0" />
                                <span>
                                    <strong className="font-semibold">Character Data:</strong> View detailed character sheets with information pulled directly from the UCP.
                                </span>
                            </li>
                            <li className="flex items-start">
                                <CheckCircle className="h-6 w-6 text-primary mr-3 mt-1 flex-shrink-0" />
                                <span>
                                    <strong className="font-semibold">Secure Authentication:</strong> Log in seamlessly and securely using your existing GTA:World credentials via OAuth2.
                                </span>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <Image
                            src="/img/statistics.png"
                            alt="Faction Statistics"
                            width={600}
                            height={500}
                            className="rounded-lg shadow-xl"
                            data-ai-hint="data integration"
                        />
                    </div>
                </div>
            </section>

            {/* Call to Action */}
            <section className="py-16 sm:py-24 bg-secondary/50">
                <div className="container text-center">
                    <h2 className="text-3xl font-bold tracking-tight">Ready to Get Started?</h2>
                    <p className="mt-4 text-lg text-muted-foreground">Log in with your GTA:World account and enhance your operational efficiency today.</p>
                    <div className="mt-8">
                         <Button asChild size="lg">
                            <Link href="/login">Log In & Access Your Panel</Link>
                        </Button>
                    </div>
                </div>
            </section>
        </main>
    );
}
