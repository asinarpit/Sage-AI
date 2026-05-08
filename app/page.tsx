import { auth } from "@clerk/nextjs/server";
import { SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sparkles, ArrowUpRight, SendHorizontal, Shield, Zap, Brain, LayoutGrid, Search, MessageSquare } from "lucide-react";
import { LiquidMetal } from '@paper-design/shaders-react';

export default async function Home() {
  const { userId } = await auth();

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center relative bg-background overflow-x-hidden selection:bg-primary/30 selection:text-primary py-20 md:py-0">
          
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 [mask-image:radial-gradient(circle_at_50%_50%,transparent_0%,#000_60%)]">
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center" />
        </div>
      </div>

      <nav className="absolute top-0 w-full p-5 md:p-6 flex justify-end items-center gap-4 z-20">
        <ThemeToggle />
        {userId ? (
          <UserButton />
        ) : (
          <SignInButton mode="modal">
            <button className="px-4 py-1.5 rounded-full bg-foreground text-background font-medium hover:opacity-90 transition-all hover:scale-105 active:scale-95 text-xs shadow-lg shadow-black/10">
              Sign In
            </button>
          </SignInButton>
        )}
      </nav>

      <section className="relative z-10 text-center space-y-12 max-w-5xl px-6 flex flex-col items-center">
        

        <div className="space-y-6 flex flex-col items-center">
          <Image
            src="/sage-full-logo.svg"
            alt="Sage Logo"
            width={140}
            height={45}
            priority
            className="mb-4 drop-shadow-xl animate-in delay-100 md:w-[180px]"
          />
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter text-balance leading-[1.1] animate-in delay-200">
            AI Agent <span className="text-primary drop-shadow-[0_0_30px_rgba(16,185,129,0.2)]">Workspace</span>
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-xl text-balance leading-relaxed animate-in delay-300">
            A powerful, agentic AI workspace designed for document analysis, research, and collaborative intelligence.
          </p>
        </div>

        <div className="relative w-full max-w-lg p-[3px] rounded-[18px] overflow-hidden shadow-2xl transition-all duration-500 hover:scale-[1.01] hover:shadow-primary/30 group animate-in delay-400">
          <div className="absolute inset-0 z-0">
            <LiquidMetal
              width={"100%"}
              height={"100%"}
              colorBack="#1a2e26"
              colorTint="#10b981"
              shape="none"
              repetition={2}
              softness={0.05}
              shiftRed={0.05}
              shiftBlue={0.05}
              distortion={0.2}
              contour={0.4}
              angle={45}
              scale={1}
              speed={0.5}
              fit="cover"
            />
          </div>

          <div className="relative z-10 bg-background/95 backdrop-blur-3xl rounded-[15px] p-1.5 flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2.5 px-3.5 py-2.5 bg-muted/20 rounded-[10px] transition-colors group-hover:bg-muted/40">
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              <input 
                type="text" 
                placeholder="Ask Sage anything..." 
                className="bg-transparent border-none outline-none w-full text-foreground placeholder:text-muted-foreground/60 text-sm"
                readOnly
              />
            </div>
            <button className="p-3 bg-primary text-white rounded-[10px] hover:opacity-90 transition-all hover:scale-110 active:scale-95 shadow-xl shadow-primary/40">
              <SendHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4 animate-in delay-500">
          {userId ? (
            <Link 
              href="/dashboard" 
              className="group inline-flex items-center gap-0 bg-primary rounded-full p-1.5 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/25"
            >
              <span className="text-white font-bold px-5 md:px-7 py-2.5 tracking-tight text-xs md:text-sm uppercase">Go to Dashboard</span>
              <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-full flex items-center justify-center transition-all group-hover:rotate-12">
                <ArrowUpRight className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              </div>
            </Link>
          ) : (
            <Link 
              href="/sign-in" 
              className="group inline-flex items-center gap-0 bg-primary rounded-full p-1.5 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/25"
            >
              <span className="text-white font-bold px-5 md:px-7 py-2.5 tracking-tight text-xs md:text-sm uppercase">Get Started for Free</span>
              <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-full flex items-center justify-center transition-all group-hover:rotate-12">
                <ArrowUpRight className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              </div>
            </Link>
          )}
        </div>
      </section>

     
    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="group p-8 rounded-3xl bg-muted/30 border border-white/5 hover:border-primary/20 hover:bg-muted/50 transition-all duration-300 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-right from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="mb-6 p-3 w-fit rounded-2xl bg-background border border-border shadow-inner group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3 tracking-tight">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}


