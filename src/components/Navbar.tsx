/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from "react";
import { Vote, LogOut, Home, LayoutDashboard, CalendarDays, CheckCircle2, ChevronDown, UserCircle, Camera, Trash2, KeyRound, Save, X } from "lucide-react";
import { User, Voter } from "../types";
import { apiFetch } from "../api";
import { prepareImageUpload } from "../imageUpload";

interface NavbarProps {
  user: User | null;
  voter: Voter | null;
  onLogout: () => void;
  onNavigate: (view: string) => void;
  onProfileUpdated: (user: User, voter?: Voter | null) => void;
  currentView: string;
}

export default function Navbar({ user, voter, onLogout, onNavigate, onProfileUpdated, currentView }: NavbarProps) {
  const navRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileNotice, setProfileNotice] = useState("");
  const [profileError, setProfileError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const openProfileEditor = () => {
    if (!user) return;
    setProfileName(user.fullName);
    setProfileEmail(user.email);
    setProfilePhoto(user.profilePhoto || voter?.profilePhoto || "");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setProfileNotice("");
    setProfileError("");
    setShowUserDropdown(false);
    setShowProfileEditor(true);
  };

  const readApiResponse = async (response: Response) => {
    const text = await response.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      throw new Error("The server returned an invalid response.");
    }
  };

  const handleProfilePhotoUpload = async (file?: File) => {
    if (!file) return;
    try {
      setProfilePhoto(await prepareImageUpload(file, { maxDimension: 640, quality: 0.82 }));
      setProfileError("");
      setProfileNotice("");
    } catch (err: any) {
      setProfileError(err.message || "Could not read the selected photo.");
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    const fullName = profileName.trim();
    const email = profileEmail.trim();
    if (!fullName || !email) {
      setProfileError("Full name and email are required.");
      setProfileNotice("");
      return;
    }

    setSavingProfile(true);
    setProfileError("");
    setProfileNotice("");
    try {
      const res = await apiFetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id
        },
        body: JSON.stringify({
          fullName,
          email,
          profilePhoto
        })
      });
      const data = await readApiResponse(res);
      if (!res.ok) throw new Error(data.error || "Could not save profile.");
      onProfileUpdated(data.user, data.voter || null);
      setProfileNotice("Profile updated.");
    } catch (err: any) {
      setProfileError(err.message || "Could not save profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async () => {
    if (!user) return;
    if (!currentPassword || !newPassword) {
      setProfileError("Current and new password are required.");
      setProfileNotice("");
      return;
    }
    if (newPassword !== confirmPassword) {
      setProfileError("New passwords do not match.");
      setProfileNotice("");
      return;
    }
    setSavingProfile(true);
    setProfileError("");
    setProfileNotice("");
    try {
      const res = await apiFetch("/api/profile/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await readApiResponse(res);
      if (!res.ok) throw new Error(data.error || "Could not update password.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setProfileNotice("Password updated.");
    } catch (err: any) {
      setProfileError(err.message || "Could not update password.");
    } finally {
      setSavingProfile(false);
    }
  };

  const openLandingSection = (sectionId: string) => {
    if (currentView !== "landing") {
      onNavigate("landing");
    }
    setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const updateIndicator = () => {
    if (!navRef.current) return;

    let activeButton: HTMLElement | null = null;

    if (currentView === "landing") {
      activeButton = navRef.current.querySelector('button[data-active="true"]') as HTMLElement;
    } 
    else if (currentView === "voter-dashboard") {
      activeButton = navRef.current.querySelector('button[data-active="true"]') as HTMLElement;
    } 
    else if (currentView === "admin-dashboard") {
      activeButton = navRef.current.querySelector('button[data-active="true"]') as HTMLElement;
    }

    if (activeButton) {
      const navRect = navRef.current.getBoundingClientRect();
      const btnRect = activeButton.getBoundingClientRect();

      setIndicatorStyle({
        left: btnRect.left - navRect.left,
        width: btnRect.width,
      });
    } else {
      activeButton = navRef.current.querySelector('[data-active="true"]') as HTMLElement;
      if (activeButton) {
        const navRect = navRef.current.getBoundingClientRect();
        const btnRect = activeButton.getBoundingClientRect();
        setIndicatorStyle({
          left: btnRect.left - navRect.left,
          width: btnRect.width,
        });
      }
    }
  };

  useEffect(() => {
    updateIndicator();
    const timer = setTimeout(updateIndicator, 50);
    
    window.addEventListener('resize', updateIndicator);
    
    return () => {
      window.removeEventListener('resize', updateIndicator);
      clearTimeout(timer);
    };
  }, [currentView]);

  const navItems = [
    { 
      id: "home", 
      label: "Home", 
      icon: Home, 
      action: () => openLandingSection("home"), 
      active: currentView === "landing" 
    },
    { 
      id: "schedules", 
      label: "Schedules", 
      icon: CalendarDays, 
      action: () => openLandingSection("election-schedules"), 
      active: false 
    },
    { 
      id: "results", 
      label: "Results", 
      icon: CheckCircle2, 
      action: () => openLandingSection("closed-elections"), 
      active: false 
    },
  ];

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
          
          {/* Logo */}
          <div className="flex items-center">
            <button
              onClick={() => onNavigate("landing")}
              className="flex items-center gap-3 group pr-6 border-r border-slate-200"
            >
              <div className="h-9 w-9 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/40 transition-all group-hover:scale-105 group-active:scale-95">
                <Vote className="h-5 w-5 text-white" />
              </div>
              <span className="font-sans font-bold tracking-tighter text-2xl text-slate-900">VoteSystem</span>
            </button>

            {/* Navigation with Enhanced Indicator */}
            <div className="hidden md:flex ml-8 relative" ref={navRef}>
              {/* Modern Indicator */}
              <div
                className="absolute top-1 bottom-1 bg-white rounded-3xl shadow-lg shadow-slate-300/60 border border-slate-100 transition-all duration-500 ease-out z-0"
                style={{
                  left: `${indicatorStyle.left}px`,
                  width: `${indicatorStyle.width}px`,
                }}
              />

              <div className="flex items-center gap-1 bg-slate-100/80 backdrop-blur-md rounded-3xl p-1 border border-slate-200 relative z-10">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    data-active={item.active}
                    onClick={item.action}
                    className={`relative px-6 py-2.5 rounded-3xl text-sm font-semibold flex items-center gap-2 z-10 transition-all duration-300 ${
                      item.active 
                        ? "text-indigo-700 font-semibold" 
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </button>
                ))}

                {/* Dashboard Buttons */}
                {user?.role === "VOTER" && (
                  <button
                    onClick={() => onNavigate("voter-dashboard")}
                    data-active={currentView === "voter-dashboard"}
                    className={`relative px-6 py-2.5 rounded-3xl text-sm font-semibold flex items-center gap-2 z-10 transition-all duration-300 ${
                      currentView === "voter-dashboard" 
                        ? "text-indigo-700 font-semibold" 
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Voter Station
                  </button>
                )}

                {user && user.role !== "VOTER" && (
                  <button
                    onClick={() => onNavigate("admin-dashboard")}
                    data-active={currentView === "admin-dashboard"}
                    className={`relative px-6 py-2.5 rounded-3xl text-sm font-semibold flex items-center gap-2 z-10 transition-all duration-300 ${
                      currentView === "admin-dashboard" 
                        ? "text-indigo-700 font-semibold" 
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Admin Portal
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* User Dropdown */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-3 pl-6 border-l border-slate-200 hover:bg-slate-50 rounded-3xl py-1.5 pr-4 transition-all duration-200"
              >
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-semibold text-slate-900">{user.fullName}</p>
                  <div className="mt-0.5">
                    {user.role === "SUPER_ADMIN" ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-3 py-0.5 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-full shadow-sm">
                        SUPER ADMIN
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500 font-medium">{user.role.replace("_", " ")}</span>
                    )}
                  </div>
                </div>

                {user.profilePhoto || voter?.profilePhoto ? (
                  <img src={user.profilePhoto || voter?.profilePhoto} alt={user.fullName} className="h-9 w-9 rounded-2xl object-cover border border-slate-200 shadow-sm" />
                ) : (
                  <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-white font-semibold shadow-inner border border-slate-700">
                    {user.fullName.charAt(0).toUpperCase()}
                  </div>
                )}
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>

              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-3xl shadow-2xl border border-slate-100 py-2 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="font-medium text-slate-900">{user.fullName}</p>
                    <p className="text-xs text-slate-500">{user.role.replace("_", " ")}</p>
                  </div>
                  <button
                    onClick={openProfileEditor}
                    className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-slate-50 text-slate-700 hover:text-slate-950 rounded-2xl mx-1 transition-all duration-200"
                  >
                    <UserCircle className="w-4 h-4" />
                    Edit Profile
                  </button>
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      onLogout();
                    }}
                    className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-red-50 text-red-600 hover:text-red-700 rounded-2xl mx-1 transition-all duration-200"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button 
                onClick={() => onNavigate("login")} 
                className="px-5 py-2.5 text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-3xl transition-all duration-200"
              >
                Sign In
              </button>
              <button 
                onClick={() => onNavigate("register")} 
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold rounded-3xl hover:brightness-105 active:scale-95 transition-all duration-200 shadow-md shadow-indigo-500/30"
              >
                Register
              </button>
            </div>
          )}
          </div>
        </div>
      </nav>

      {showProfileEditor && user && (
        <div className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-sm font-bold text-slate-950">Edit Profile</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">Manage account details, photo, and password.</p>
              </div>
              <button onClick={() => setShowProfileEditor(false)} className="p-2 rounded hover:bg-slate-100 text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-5">
              <div className="space-y-3">
                <div className="h-36 w-36 rounded border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="Profile preview" className="h-full w-full object-cover" />
                  ) : (
                    <UserCircle className="h-14 w-14 text-slate-400" />
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex items-center gap-2 px-3 py-2 rounded bg-blue-600 text-white text-[11px] font-bold cursor-pointer hover:bg-blue-500">
                    <Camera className="w-3.5 h-3.5" />
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => {
                        handleProfilePhotoUpload(e.target.files?.[0]);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                  <button onClick={() => setProfilePhoto("")} className="inline-flex items-center gap-2 px-3 py-2 rounded border border-slate-200 text-slate-600 text-[11px] font-bold hover:bg-slate-50">
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {profileError && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">{profileError}</div>}
                {profileNotice && <div className="rounded border border-green-200 bg-green-50 px-3 py-2 text-[11px] text-green-700">{profileNotice}</div>}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-500">Full Name</span>
                    <input value={profileName} onChange={(e) => setProfileName(e.target.value)} className="w-full rounded border border-slate-200 px-3 py-2 text-xs outline-none focus:border-blue-500" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-500">Email</span>
                    <input value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} className="w-full rounded border border-slate-200 px-3 py-2 text-xs outline-none focus:border-blue-500" />
                  </label>
                </div>

                <button onClick={saveProfile} disabled={savingProfile} className="inline-flex items-center gap-2 rounded bg-slate-950 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-60">
                  <Save className="w-3.5 h-3.5" />
                  {savingProfile ? "Saving Profile..." : "Save Profile"}
                </button>

                <div className="border-t border-slate-200 pt-4 space-y-3">
                  <h3 className="flex items-center gap-2 text-xs font-bold text-slate-950">
                    <KeyRound className="w-4 h-4 text-blue-600" />
                    Change Password
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Current password" className="w-full rounded border border-slate-200 px-3 py-2 text-xs outline-none focus:border-blue-500" />
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" className="w-full rounded border border-slate-200 px-3 py-2 text-xs outline-none focus:border-blue-500" />
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm password" className="w-full rounded border border-slate-200 px-3 py-2 text-xs outline-none focus:border-blue-500" />
                  </div>
                  <button onClick={savePassword} disabled={savingProfile} className="inline-flex items-center gap-2 rounded border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-60">
                    <KeyRound className="w-3.5 h-3.5" />
                    Update Password
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
