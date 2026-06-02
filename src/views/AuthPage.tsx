/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  AlertCircle,
  ImagePlus,
  Lock,
  MapPin,
  Phone,
  RotateCcw,
  User,
  Vote,
} from "lucide-react";
import { apiFetch } from "../api";
import { prepareImageUpload } from "../imageUpload";
import votingHero from "../assets/voting-hero.png";

interface AuthPageProps {
  initialMode: "login" | "register";
  onAuthSuccess: (token: string, user: any, voter?: any) => void;
  onNavigate: (view: string) => void;
}

export default function AuthPage({ initialMode, onAuthSuccess, onNavigate }: AuthPageProps) {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const readApiResponse = async (response: Response) => {
    const text = await response.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      throw new Error("The server returned an invalid response. Please confirm the backend is running on port 8080.");
    }
  };

  const requestErrorMessage = (err: any) => {
    if (err?.name === "TypeError") {
      return "Cannot reach the backend server. Please start Spring Boot on http://localhost:8080 and try again.";
    }
    return err?.message || "Something went wrong.";
  };

  const handleProfilePhotoUpload = async (file?: File) => {
    if (!file) return;
    try {
      setProfilePhoto(await prepareImageUpload(file, { maxDimension: 640, quality: 0.82 }));
      setError("");
    } catch (err: any) {
      setError(err.message || "Could not read the selected profile photo.");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername.trim(), password: loginPassword }),
      });

      const data = await readApiResponse(response);
      if (!response.ok) throw new Error(data.error || "Login request failed");
      if (!data.token || !data.user) throw new Error("Login response is missing session details.");
      onAuthSuccess(data.token, data.user, data.voter?.id ? data.voter : undefined);
    } catch (err: any) {
      setError(requestErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await apiFetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: regUsername.trim(),
          email: regEmail.trim(),
          fullName: fullName.trim(),
          password: regPassword,
          phone: phone.trim(),
          address: address.trim(),
          profilePhoto,
        }),
      });

      const data = await readApiResponse(response);
      if (!response.ok) throw new Error(data.error || "Registration request failed");

      setSuccess("Account registered. Please wait for administrator verification.");
      setTimeout(() => {
        setMode("login");
        setLoginUsername(regUsername.trim());
        setLoginPassword("");
        setSuccess("");
      }, 3500);
    } catch (err: any) {
      setError(requestErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 -my-4 min-h-[calc(100vh-3.5rem)] relative flex items-center justify-center overflow-hidden bg-slate-100 px-4 py-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.96),rgba(241,245,249,0.92)_50%,rgba(226,232,240,0.85))]" />

      <div className="relative w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100 lg:grid lg:grid-cols-[1.08fr_0.92fr] min-h-[580px]">
        
        {/* Left Hero Panel */}
        <div className="relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-center">
          <img src={votingHero} alt="" className="absolute inset-0 h-full w-full object-cover brightness-75" />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950/90 via-slate-900/80 to-slate-800/70" />
          
          <div className="relative z-10 max-w-md">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 border border-white/30 shadow-xl">
              <Vote className="h-8 w-8" />
            </div>

            <div className="mt-10">
              <span className="inline-flex rounded-2xl border border-white/20 bg-white/10 px-4 py-1 text-xs font-bold uppercase tracking-widest text-blue-100">
                Election 2026
              </span>
              <h1 className="mt-6 text-6xl font-bold leading-none tracking-tighter">
                Vote with<br />Confidence.
              </h1>
              <p className="mt-3 text-lg text-slate-200">VoteSystem</p>
            </div>

            <p className="mt-8 max-w-sm text-slate-200 leading-relaxed">
              Secure voter registration, verified ballot access, and transparent election management in one trusted portal.
            </p>

            <div className="mt-12 grid grid-cols-3 gap-4">
              {["Secure", "Verified", "Transparent"].map((item) => (
                <div key={item} className="rounded-2xl border border-white/20 bg-white/10 p-4 text-center backdrop-blur-md">
                  <div className="text-xs font-semibold tracking-widest text-white/90">{item}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="relative flex items-center justify-center p-6 sm:p-10 lg:p-12">
          <div className="w-full max-w-md space-y-8">
            
            <div className="text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                {mode === "login" ? "Welcome back" : "Create account"}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {mode === "login" 
                  ? "Sign in to access your secure voting portal" 
                  : "Join the secure digital election system"}
              </p>
            </div>

            {error && <Message tone="error">{error}</Message>}
            {success && <Message tone="success">{success}</Message>}

            {/* Mode Toggle */}
            <div className="flex rounded-3xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => { setMode("login"); setError(""); }}
                className={`flex-1 rounded-3xl py-3 text-sm font-semibold transition-all ${
                  mode === "login" 
                    ? "bg-white text-slate-900 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode("register"); setError(""); }}
                className={`flex-1 rounded-3xl py-3 text-sm font-semibold transition-all ${
                  mode === "register" 
                    ? "bg-white text-slate-900 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Register
              </button>
            </div>

            {/* Forms */}
            {mode === "login" ? (
              <form className="space-y-5" onSubmit={handleLogin}>
                <IconInput icon={User} value={loginUsername} onChange={setLoginUsername} placeholder="Username" required />
                
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-14 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 hover:text-slate-700"
                  >
                    {showPassword ? "HIDE" : "SHOW"}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-slate-900 py-3.5 text-sm font-semibold text-white hover:bg-slate-800 transition-all disabled:bg-slate-400"
                >
                  {loading ? "Signing in..." : "Sign In"}
                </button>
              </form>
            ) : (
              <form className="space-y-5 max-h-[460px] overflow-y-auto pr-2" onSubmit={handleRegister}>
                <IconInput icon={User} value={fullName} onChange={setFullName} placeholder="Full Name" required />
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <PlainInput value={regUsername} onChange={setRegUsername} placeholder="Username" required />
                  <PlainInput value={regEmail} onChange={setRegEmail} placeholder="Email" type="email" required />
                </div>

                <PlainInput value={regPassword} onChange={setRegPassword} placeholder="Password" type="password" required />
                
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                  Voter ID will be generated automatically after registration.
                </div>
                <IconInput icon={Phone} value={phone} onChange={setPhone} placeholder="Phone Number" type="tel" />

                <div className="relative">
                  <span className="absolute left-4 top-3 text-slate-400">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Residential Address"
                    rows={3}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pl-11 text-sm resize-y focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                  />
                </div>

                {/* Profile Photo */}
                <div className="space-y-3">
                  <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500">Profile Photo</label>
                  <div className="flex gap-4">
                    <div className="h-20 w-20 rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden flex-shrink-0">
                      {profilePhoto ? (
                        <img src={profilePhoto} alt="Preview" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <User className="h-8 w-8 text-slate-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 flex-1">
                      <label htmlFor="profile-photo-upload" className="cursor-pointer flex items-center justify-center gap-2 rounded-2xl border border-slate-900 bg-slate-900 px-5 py-3 text-xs font-semibold text-white hover:bg-slate-800">
                        <ImagePlus className="h-4 w-4" />
                        Upload Photo
                      </label>
                      <button type="button" onClick={() => setProfilePhoto("")} className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                        <RotateCcw className="h-4 w-4" />
                        Clear
                      </button>
                      <input
                        id="profile-photo-upload"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          handleProfilePhotoUpload(e.target.files?.[0]);
                          e.currentTarget.value = "";
                        }}
                        className="sr-only"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-green-600 py-3.5 text-sm font-semibold text-white hover:bg-green-700 transition-all disabled:bg-green-400"
                >
                  {loading ? "Creating account..." : "Register E-Voter Card"}
                </button>
              </form>
            )}

            <div className="text-center pt-2">
              <button 
                onClick={() => onNavigate("landing")} 
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 transition"
              >
                ← Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Reusable Components */

function Message({ tone, children }: { tone: "error" | "success"; children: React.ReactNode }) {
  const isError = tone === "error";
  return (
    <div className={`flex gap-3 rounded-2xl border p-4 text-sm ${isError ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}>
      <AlertCircle className={`mt-0.5 h-5 w-5 flex-shrink-0 ${isError ? "text-red-500" : "text-green-600"}`} />
      <span>{children}</span>
    </div>
  );
}

function PlainInput({ value, onChange, placeholder, type = "text", required = false }: any) {
  return (
    <input
      type={type}
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none"
    />
  );
}

function IconInput({ icon: Icon, value, onChange, placeholder, type = "text", required = false }: any) {
  return (
    <div className="relative">
      <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
        <Icon className="h-4 w-4" />
      </span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none"
      />
    </div>
  );
}
