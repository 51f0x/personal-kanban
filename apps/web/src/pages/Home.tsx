import { EmptyState } from "@/components/application/empty-state/empty-state";
import { SearchLg } from "@untitledui/icons";

export function Home() {
    return (
        <main className="min-h-screen flex items-center justify-center p-4 md:p-8 bg-secondary">
            <EmptyState size="lg" className="max-w-[640px]">
                <EmptyState.Header pattern="circle" patternSize="lg">
                    <EmptyState.FeaturedIcon 
                        icon={SearchLg} 
                        color="gray" 
                        theme="modern" 
                        size="xl"
                    />
                </EmptyState.Header>
                <EmptyState.Content>
                    <EmptyState.Title className="font-extrabold text-center" style={{
                        fontSize: 'clamp(36px, 5vw, 72px)',
                        lineHeight: '1.1111111111111112em',
                        letterSpacing: '-0.02em',
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontWeight: 800,
                    }}>
                        This is an empty page.
                    </EmptyState.Title>
                    <EmptyState.Description className="text-center max-w-2xl" style={{
                        fontSize: 'clamp(16px, 2vw, 24px)',
                        lineHeight: '1.6em',
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontWeight: 400,
                    }}>
                        This page is left blank for organization purposes.<br />
                        Go find some more stuff on the left &ldquo;layer&rdquo; panel.
                    </EmptyState.Description>
                </EmptyState.Content>
            </EmptyState>
        </main>
    );
}
