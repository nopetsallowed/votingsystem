/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import LandingPage from "./views/LandingPage";
import AuthPage from "./views/AuthPage";
import AdminDashboard from "./views/AdminDashboard";
import VoterDashboard from "./views/VoterDashboard";
import ResultsPage from "./views/ResultsPage";
import { User, Voter } from "./types";
import { Vote, Github, Mail, ShieldCheck, Heart } from "lucide-react";

export default function App() {
  const [currentView, setCurrentView] = useState<string>("landing");
  const [token, setToken] = useState<string | null>(localStorage.getItem("vote_session_token"));
  const [user, setUser] = useState<User | null>(null);
  const [voter, setVoter] = useState<Voter | null>(null);

  // Deep routing parameter
  const [hubSelectedElectionId, setHubSelectedElectionId] = useState<string | null>(null);
  const [voterBoothReturnView, setVoterBoothReturnView] = useState<string | null>(null);
  const [previousView, setPreviousView] = useState<string>("landing");

  // Check and restore logged in user profile on load
  useEffect(() => {
    const savedUser = localStorage.getItem("vote_session_user");
    const savedVoter = localStorage.getItem("vote_session_voter");

    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser) as User;
        setUser(parsedUser);
        
        if (parsedUser.role === "VOTER" && savedVoter && savedVoter !== "undefined") {
          const parsedVoter = JSON.parse(savedVoter) as Voter;
          setVoter(parsedVoter.id ? parsedVoter : null);
        } else {
          localStorage.removeItem("vote_session_voter");
          setVoter(null);
        }

        // Set default redirect view depending on user account permissions
        if (parsedUser.role === "VOTER") {
          setCurrentView("voter-dashboard");
        } else {
          setCurrentView("admin-dashboard");
        }
      } catch (e) {
        console.error("Failed to recover user session cache", e);
        handleLocalLogout();
      }
    } else {
      setCurrentView("landing");
    }
  }, [token]);

  const handleAuthSuccess = (sessionToken: string, sessionUser: User, sessionVoter?: Voter) => {
    localStorage.setItem("vote_session_token", sessionToken);
    localStorage.setItem("vote_session_user", JSON.stringify(sessionUser));
    if (sessionUser.role === "VOTER" && sessionVoter?.id) {
      localStorage.setItem("vote_session_voter", JSON.stringify(sessionVoter));
      setVoter(sessionVoter);
    } else {
      localStorage.removeItem("vote_session_voter");
      setVoter(null);
    }

    setToken(sessionToken);
    setUser(sessionUser);

    if (sessionUser.role === "VOTER") {
      setCurrentView("voter-dashboard");
    } else {
      setCurrentView("admin-dashboard");
    }
  };

  const handleLocalLogout = () => {
    localStorage.removeItem("vote_session_token");
    localStorage.removeItem("vote_session_user");
    localStorage.removeItem("vote_session_voter");
    setToken(null);
    setUser(null);
    setVoter(null);
    setCurrentView("landing");
  };

  const handleProfileUpdated = (updatedUser: User, updatedVoter?: Voter | null) => {
    setUser(updatedUser);
    try {
      localStorage.setItem("vote_session_user", JSON.stringify(updatedUser));
    } catch (error) {
      console.warn("Could not cache updated user profile locally", error);
    }

    if (updatedUser.role === "VOTER" && updatedVoter?.id) {
      setVoter(updatedVoter);
      try {
        localStorage.setItem("vote_session_voter", JSON.stringify(updatedVoter));
      } catch (error) {
        console.warn("Could not cache updated voter profile locally", error);
      }
    } else if (updatedUser.role === "VOTER" && updatedVoter === null) {
      localStorage.removeItem("vote_session_voter");
      setVoter(null);
    }
  };

  const navigateToView = (view: string) => {
    // If guest attempts to open voter-dashboard or admin corridors, reroute to signup authentication
    setPreviousView(currentView);
    if (!token && (view === "voter-dashboard" || view === "admin-dashboard")) {
      setCurrentView("login");
    } else {
      setCurrentView(view);
    }
  };

  // Callback from guest landing page selection card button
  const handleSelectElectionOnLanding = (electionId: string) => {
    if (!token) {
      // If unauthorized guest user clicks vote, prompt login first
      setPreviousView(currentView);
      setCurrentView("login");
    } else if (user?.role === "VOTER") {
      // Voter, open their station booth
      setHubSelectedElectionId(electionId);
      setVoterBoothReturnView(currentView);
      setPreviousView(currentView);
      setCurrentView("voter-dashboard");
    } else {
      // Admin corridor, let them examine metrics or manage it
      setPreviousView(currentView);
      setCurrentView("admin-dashboard");
    }
  };

  const clearSelectedElectionOnLanding = () => {
    setHubSelectedElectionId(null);
  };

  const clearVoterBoothReturnView = () => {
    setVoterBoothReturnView(null);
  };

  // Match the core container based on currentView route
  const renderCurrentView = () => {
    if (currentView.startsWith("results-")) {
      const parts = currentView.split("-");
      const electionId = parts.slice(1).join("-");
      return (
        <ResultsPage 
          electionId={electionId} 
          onNavigateBack={() => navigateToView(previousView || "landing")} 
        />
      );
    }

    switch (currentView) {
      case "landing":
        return (
          <LandingPage 
            onNavigate={navigateToView} 
            onSelectElection={handleSelectElectionOnLanding} 
          />
        );
      case "login":
        return (
          <AuthPage 
            initialMode="login" 
            onAuthSuccess={handleAuthSuccess} 
            onNavigate={navigateToView} 
          />
        );
      case "register":
        return (
          <AuthPage 
            initialMode="register" 
            onAuthSuccess={handleAuthSuccess} 
            onNavigate={navigateToView} 
          />
        );
      case "voter-dashboard":
        return token && user?.role === "VOTER" ? (
          <VoterDashboard 
            voterToken={token} 
            voterUser={user} 
            onNavigate={navigateToView}
            selectedElectionIdOnHub={hubSelectedElectionId}
            onClearSelectedElection={clearSelectedElectionOnLanding}
            returnView={voterBoothReturnView}
            onClearReturnView={clearVoterBoothReturnView}
          />
        ) : (
          <AuthPage initialMode="login" onAuthSuccess={handleAuthSuccess} onNavigate={navigateToView} />
        );
      case "admin-dashboard":
        return token && user && user.role !== "VOTER" ? (
          <AdminDashboard 
            adminToken={token} 
            adminUser={user} 
            onNavigate={navigateToView} 
          />
        ) : (
          <AuthPage initialMode="login" onAuthSuccess={handleAuthSuccess} onNavigate={navigateToView} />
        );
      default:
        return (
          <LandingPage 
            onNavigate={navigateToView} 
            onSelectElection={handleSelectElectionOnLanding} 
          />
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-900">
      {/* Navigation Header */}
      <Navbar 
        user={user} 
        voter={voter}
        onLogout={handleLocalLogout} 
        onNavigate={navigateToView} 
        onProfileUpdated={handleProfileUpdated}
        currentView={currentView} 
      />

      {/* Primary container page block */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {renderCurrentView()}
      </main>

      {/* High Density flat footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-4 print:hidden">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center text-[11px] text-slate-400 gap-3">
          <div className="flex items-center space-x-2 text-white font-sans font-bold">
            <div className="p-1 px-2 bg-blue-600 text-white rounded text-[10px] flex items-center">
              <Vote className="w-3.5 h-3.5 shrink-0 inline mr-1" /> VoteSystem
            </div>
          </div>
          
          <div className="flex items-center space-x-1.5 text-slate-400">
            <span className="text-emerald-500">●</span>
            <span className="font-mono">Cryptographic E-voting Card Ledger System | Fully Privileged Secure Logs</span>
          </div>

          <p className="text-[10px] text-slate-500 font-mono">&copy; {new Date().getFullYear()} VoteSystem. v2.14.5-STABLE</p>
        </div>
      </footer>
    </div>
  );
}
