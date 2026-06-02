/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { ArrowRight, BarChart3, CalendarDays, CheckCircle2, Flag, LockKeyhole, ShieldCheck, UserPlus, Vote } from "lucide-react";
import { Election } from "../types";
import { apiFetch } from "../api";
import votingHero from "../assets/voting-hero.png";

interface LandingPageProps {
  onNavigate: (view: string) => void;
  onSelectElection: (electionId: string) => void;
}

export default function LandingPage({ onNavigate }: LandingPageProps) {
  const [elections, setElections] = useState<Election[]>([]);
  const [loadingElections, setLoadingElections] = useState(true);

  useEffect(() => {
    async function loadPublicElectionList() {
      try {
        const res = await apiFetch("/api/admin/elections");
        if (res.ok) {
          setElections(await res.json());
        }
      } catch (error) {
        console.error("Could not load public election schedule", error);
      } finally {
        setLoadingElections(false);
      }
    }

    loadPublicElectionList();
  }, []);

  const visibleSchedules = elections.filter((election) => election.status !== "CLOSED");
  const closedElections = elections.filter((election) => election.status === "CLOSED");

  return (
    <div id="home" className="relative left-1/2 w-screen -translate-x-1/2 bg-slate-50 -my-6 text-left">
      {/* HERO SECTION */}
      <section className="relative min-h-[calc(100vh-3.5rem)] overflow-hidden bg-slate-950 border-b border-slate-200">
        <img
          src={votingHero}
          alt=""
          className="absolute inset-0 h-full w-full object-cover brightness-[0.65]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-900/40"></div>
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-slate-50 to-transparent"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20 min-h-[calc(100vh-3.5rem)] flex items-center">
          <div className="grid grid-cols-1 lg:grid-cols-[1.02fr_0.98fr] gap-12 lg:gap-16 items-center">
            
            {/* Left Content */}
            <div className="space-y-8 text-white">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-100/30 bg-blue-50/10 backdrop-blur-md text-blue-100 text-xs font-semibold uppercase tracking-widest">
                <ShieldCheck className="w-4 h-4" />
                SECURE ONLINE VOTING
              </div>

              <div className="space-y-6">
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter leading-[1.05] max-w-3xl">
                  Vote with <span className="text-blue-400">confidence</span> from a protected digital ballot.
                </h1>
                <p className="text-lg text-slate-300 max-w-xl leading-relaxed">
                  Register, sign in, and access verified election tools from one quiet, secure workspace.
                </p>
              </div>

              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => onNavigate("login")}
                  className="group px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl border border-blue-700 transition-all duration-200 flex items-center justify-center gap-3 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5"
                >
                  <Vote className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  Sign In to Vote
                </button>
                <button
                  onClick={() => onNavigate("register")}
                  className="px-8 py-3.5 bg-white hover:bg-slate-100 text-slate-900 font-semibold rounded-2xl border border-white/80 transition-all duration-200 flex items-center justify-center gap-3 hover:shadow-lg"
                >
                  <UserPlus className="w-5 h-5" />
                  Register Voter Card
                </button>
              </div>
            </div>

            {/* Right Side: Modern Vote Wisely Card */}
            <div className="relative min-h-[420px] flex items-center justify-center">
              <div className="relative w-full max-w-[380px] rounded-3xl bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-950/70 to-transparent"></div>
                
                <div className="relative p-10 text-center">
                  {/* Ballot Icon */}
                  <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 border border-white/30">
                    <Vote className="h-11 w-11 text-white" />
                  </div>

                  <h2 className="text-4xl font-bold text-white tracking-tighter leading-none">
                    VOTE<br />WISELY
                  </h2>

                  <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2 text-sm border border-white/20">
                    <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-blue-100 font-medium">Secure • Transparent • Fair</span>
                  </div>

                  <div className="mt-10 text-xs text-slate-300 font-medium tracking-widest">
                    UPCOMING ELECTIONS 2026
                  </div>
                </div>

                {/* Subtle bottom highlight */}
                <div className="h-2 bg-gradient-to-r from-blue-400 via-emerald-400 to-blue-400" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
        
        {/* Features Section */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { 
              icon: LockKeyhole, 
              title: "Private Access", 
              text: "Each voter enters through authenticated account credentials before seeing ballot tools." 
            },
            { 
              icon: Flag, 
              title: "Managed Elections", 
              text: "Administrators create elections, parties, positions, and candidates inside the secure portal." 
            },
            { 
              icon: BarChart3, 
              title: "Verified Results", 
              text: "Closed elections can be reviewed from the results area after ballots are finalized." 
            },
          ].map((item) => (
            <div 
              key={item.title} 
              className="group bg-white border border-slate-200 rounded-3xl p-8 shadow-sm hover:shadow-xl hover:border-slate-300 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="h-14 w-14 rounded-2xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <item.icon className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-semibold text-slate-950">{item.title}</h2>
              <p className="text-slate-600 leading-relaxed mt-3 text-[15px]">{item.text}</p>
            </div>
          ))}
        </section>

        {/* Election Schedules */}
        <section id="election-schedules" className="scroll-mt-20 bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-10 items-start">
            <div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
                <CalendarDays className="w-6 h-6" />
              </div>
              <h2 className="text-3xl font-semibold text-slate-950 mt-6">Election Schedules</h2>
              <p className="text-slate-600 leading-relaxed mt-3 text-[15.5px]">
                Upcoming election timelines are protected behind authenticated access. Sign in to view live schedules,
                eligible contests, and voting windows assigned to your account.
              </p>
            </div>

            <div className="space-y-6">
              {loadingElections ? (
                <div className="rounded-3xl border border-slate-100 bg-slate-50 p-8 text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
                  <p className="mt-4 text-slate-500">Loading public election schedule...</p>
                </div>
              ) : visibleSchedules.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
                  <CalendarDays className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-4 text-slate-500">No scheduled or active elections are public right now.</p>
                </div>
              ) : (
                visibleSchedules.map((election) => (
                  <div 
                    key={election.id} 
                    className="group rounded-3xl border border-slate-200 bg-white p-7 hover:shadow-md hover:border-slate-300 transition-all duration-300"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-slate-950">{election.electionName}</h3>
                          <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                            election.status === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                              : "bg-amber-100 text-amber-700 border border-amber-200"
                          }`}>
                            {election.status}
                          </span>
                        </div>
                        <p className="text-slate-600 mt-3 text-sm line-clamp-2">
                          {election.description || "Election details will be available when voting opens."}
                        </p>
                      </div>

                      <button
                        onClick={() => onNavigate(election.status === "ACTIVE" ? "login" : "register")}
                        className="shrink-0 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-2xl transition-all active:scale-[0.97]"
                      >
                        {election.status === "ACTIVE" ? "Sign in to vote" : "Register"}
                      </button>
                    </div>

                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <span className="block text-xs text-slate-400 font-medium">STARTS</span>
                        <span className="font-medium text-slate-700 block mt-0.5">
                          {new Date(election.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <span className="block text-xs text-slate-400 font-medium">ENDS</span>
                        <span className="font-medium text-slate-700 block mt-0.5">
                          {new Date(election.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <span className="block text-xs text-slate-400 font-medium">CONTESTS</span>
                        <span className="font-medium text-slate-700 block mt-0.5">
                          {election.positions?.length || 0} position{(election.positions?.length || 0) !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Closed Elections */}
        <section id="closed-elections" className="scroll-mt-20 bg-gradient-to-br from-slate-950 to-slate-900 text-white rounded-3xl p-8 shadow-xl overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(at_top_right,#1e3a8a_0%,transparent_60%)]" />
          
          <div className="relative grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-10 items-start">
            <div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-blue-100 border border-white/20">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="text-3xl font-semibold mt-6">Closed Elections</h2>
              <p className="text-slate-400 leading-relaxed mt-3 text-[15.5px]">
                Finalized results are available after election administrators close a ballot cycle. 
                These public reports can be opened without signing in.
              </p>
            </div>

            <div className="space-y-6">
              {loadingElections ? (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-white" />
                  <p className="mt-4 text-slate-400">Loading closed elections...</p>
                </div>
              ) : closedElections.length === 0 ? (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-12 text-center">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-white/30" />
                  <p className="mt-4 text-slate-400">No closed elections are available yet.</p>
                </div>
              ) : (
                closedElections.map((election) => (
                  <div 
                    key={election.id} 
                    className="group rounded-3xl border border-white/10 bg-white/5 hover:bg-white/10 p-7 transition-all duration-300"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                      <div>
                        <h3 className="text-xl font-semibold text-white">{election.electionName}</h3>
                        <p className="text-slate-400 text-sm mt-2">
                          Closed on {new Date(election.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} • {election.positions?.length || 0} contest{(election.positions?.length || 0) !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <button
                        onClick={() => onNavigate(`results-${election.id}`)}
                        className="shrink-0 px-7 py-3.5 bg-white text-slate-950 font-semibold rounded-2xl hover:bg-blue-50 flex items-center gap-2 transition-all group-hover:shadow-lg"
                      >
                        View Results
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}