/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Vote, Calendar, User, Check, AlertTriangle, Play, Award, 
  ArrowLeft, ShieldAlert, Sparkles, UserCheck, Star, Mail, Landmark 
} from "lucide-react";
import { User as UserType, Voter, Election, Position, Candidate } from "../types";
import { apiFetch } from "../api";

type BallotCandidate = Candidate & { party?: any };
type BallotPosition = Position & {
  voted: boolean;
  voteCount?: number;
  votedCandidateIds?: string[];
  candidates?: BallotCandidate[];
};

interface VoterDashboardProps {
  voterToken: string;
  voterUser: UserType;
  onNavigate: (view: string) => void;
  selectedElectionIdOnHub: string | null;
  onClearSelectedElection: () => void;
  returnView?: string | null;
  onClearReturnView?: () => void;
}

export default function VoterDashboard({ 
  voterToken, 
  voterUser, 
  onNavigate, 
  selectedElectionIdOnHub,
  onClearSelectedElection,
  returnView,
  onClearReturnView
}: VoterDashboardProps) {

  // Dashboard listings
  const [voterProfile, setVoterProfile] = useState<Voter | null>(null);
  const [activeElections, setActiveElections] = useState<Election[]>([]);
  const [votingHistory, setVotingHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Voting Room states (current active selection)
  const [activeElectionId, setActiveElectionId] = useState<string | null>(selectedElectionIdOnHub);
  const [electionDetail, setElectionDetail] = useState<Election | null>(null);
  const [electionPositions, setElectionPositions] = useState<BallotPosition[]>([]);
  
  // Selected position voting board states
  const [votedPositionId, setVotedPositionId] = useState<string | null>(null);
  const [positionDetail, setPositionDetail] = useState<Position | null>(null);
  const [candidatesForPosition, setCandidatesForPosition] = useState<BallotCandidate[]>([]);
  
  // Selection checkout
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);
  const [selectedPositionForVote, setSelectedPositionForVote] = useState<Position | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // General notification banner helpers
  const [successNotice, setSuccessNotice] = useState("");
  const [errorNotice, setErrorNotice] = useState("");

  const refreshDashboardData = async () => {
    try {
      const res = await apiFetch("/api/voter/dashboard-data", {
        headers: { "x-user-id": voterUser.id }
      });
      if (res.ok) {
        const data = await res.json();
        setVoterProfile(data.voter);
        setActiveElections(data.activeElections);
        setVotingHistory(data.votingHistory);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshDashboardData();
  }, [voterUser]);

  // Handle auto routing from landing selection trigger
  useEffect(() => {
    if (selectedElectionIdOnHub) {
      enterVotingRoom(selectedElectionIdOnHub);
      onClearSelectedElection(); // clear so we don't trigger re-entry infinitely
    }
  }, [selectedElectionIdOnHub]);

  // Entering Voting Booth for an election
  const enterVotingRoom = async (electionId: string) => {
    setErrorNotice("");
    try {
      const res = await apiFetch(`/api/voter/elections/${electionId}`, {
        headers: { "x-user-id": voterUser.id }
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Could not retrieve ballot status");
      }

      const data = await res.json();
      setElectionDetail(data.election);
      setElectionPositions(data.positions);
      setActiveElectionId(electionId);
    } catch (err: any) {
      setErrorNotice(err.message || "Could not connect to voting booth.");
    }
  };

  const leaveVotingRoom = () => {
    setActiveElectionId(null);
    setElectionDetail(null);
    setElectionPositions([]);
    setVotedPositionId(null);
    setPositionDetail(null);
    setCandidatesForPosition([]);
    setSelectedPositionForVote(null);
    refreshDashboardData();
    if (returnView) {
      onNavigate(returnView);
      onClearReturnView?.();
    }
  };

  // View Candidates contesting for a specific position seat
  const openPositionVoting = async (posId: string) => {
    setErrorNotice("");
    try {
      const res = await apiFetch(`/api/voter/elections/${activeElectionId}/position/${posId}`, {
        headers: { "x-user-id": voterUser.id }
      });
      if (!res.ok) throw new Error("Could not retrieve candidates portfolio");

      const data = await res.json();
      setElectionDetail(data.election);
      setPositionDetail(data.position);
      setCandidatesForPosition(data.candidates);
      setVotedPositionId(posId);
    } catch (err: any) {
      setErrorNotice(err.message || "Failed to initiate voting form.");
    }
  };

  const leavePositionVoting = () => {
    setVotedPositionId(null);
    setPositionDetail(null);
    setCandidatesForPosition([]);
    setSelectedCandidate(null);
    setSelectedPositionForVote(null);
    // Refresh election room detail to pick up any recorded changes
    if (activeElectionId) {
      enterVotingRoom(activeElectionId);
    }
  };

  // Cast vote trigger
  const handleCastVote = async () => {
    const positionId = selectedPositionForVote?.id || votedPositionId;
    if (!selectedCandidate || !activeElectionId || !positionId) return;
    setErrorNotice("");
    
    try {
      const res = await apiFetch("/api/voter/vote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": voterUser.id
        },
        body: JSON.stringify({
          electionId: activeElectionId,
          positionId,
          candidateId: selectedCandidate.id
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Vote processing error");

      setSuccessNotice("Your ballot choice has been successfully cryptographically signed!");
      setShowConfirmModal(false);
      setSelectedCandidate(null);
      setSelectedPositionForVote(null);
      setElectionPositions(positions => positions.map(pos => {
        if (pos.id !== positionId) return pos;
        const winnerSlots = Math.max(1, pos.winnerSlots || 1);
        const votedCandidateIds = Array.from(new Set([...(pos.votedCandidateIds || []), selectedCandidate.id]));
        return {
          ...pos,
          voteCount: votedCandidateIds.length,
          votedCandidateIds,
          voted: votedCandidateIds.length >= winnerSlots
        };
      }));
      
      // Auto return to voting room overview
      setTimeout(() => {
        setSuccessNotice("");
        if (votedPositionId) {
          leavePositionVoting();
        } else if (activeElectionId) {
          enterVotingRoom(activeElectionId);
          refreshDashboardData();
        }
      }, 500);

    } catch (err: any) {
      setErrorNotice(err.message || "Ballot cast was rejected.");
      setShowConfirmModal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 space-x-2 text-gray-500">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
        <span className="font-medium text-sm">Authenticating voter card registry...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-4 text-left text-xs">
      
      {/* Alert Notices */}
      {successNotice && (
        <div className="bg-green-50 border border-green-200 text-green-800 p-2.5 rounded text-xs font-semibold flex items-center space-x-1.5 animate-pulse">
          <span className="w-1.5 h-1.5 bg-green-600 rounded"></span>
          <span>{successNotice}</span>
        </div>
      )}
      {errorNotice && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-2.5 rounded text-xs flex items-center space-x-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
          <span>{errorNotice}</span>
          <button onClick={() => setErrorNotice("")} className="ml-auto font-bold hover:text-red-950 cursor-pointer">✕</button>
        </div>
      )}

      {/* RENDER VIEW 1: NORMAL DASHBOARD */}
      {!activeElectionId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Voter Profile Left column */}
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded p-4 space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2">
                <span className="text-[8px] font-mono font-bold tracking-wider text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded leading-none">VOTER CARD</span>
              </div>
              <div className="flex flex-col items-center space-y-3">
                <div className="relative">
                  {voterProfile?.profilePhoto ? (
                    <img 
                      src={voterProfile.profilePhoto} 
                      alt={voterUser.fullName} 
                      className="w-16 h-16 rounded border border-slate-300 shadow-sm object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded border border-slate-300 shadow-sm bg-blue-50 text-blue-700 flex items-center justify-center">
                      <User className="w-7 h-7" />
                    </div>
                  )}
                  {voterProfile?.approved && (
                    <span className="absolute bottom-0 right-0 p-0.5 bg-green-600 text-white rounded-sm border border-white" title="Keys fully verified">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <div className="text-center">
                  <h3 className="text-sm font-bold text-slate-900 leading-none">{voterUser.fullName}</h3>
                  <p className="text-[10px] text-slate-500 font-mono mt-1">@{voterUser.username}</p>
                </div>

                <div className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-3 divide-y divide-slate-150 space-y-2 text-slate-600">
                  <div className="flex justify-between pt-0.5">
                    <span className="text-slate-400 font-mono uppercase tracking-wider text-[8px] font-bold">Voter Id</span>
                    <span className="font-mono text-slate-900 font-bold">{voterProfile?.voterIdNumber || "UNKNOWN_ID"}</span>
                  </div>
                  <div className="flex justify-between pt-1.5">
                    <span className="text-slate-400 font-mono uppercase tracking-wider text-[8px] font-bold">Decryption Keys</span>
                    <span>
                      {voterProfile?.approved ? (
                        <span className="text-green-700 font-bold uppercase tracking-wide text-[9px]">VERIFIED LIVE</span>
                      ) : (
                        <span className="text-amber-700 font-bold uppercase tracking-wide text-[9px]">PENDING AUDIT</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1.5">
                    <span className="text-slate-400 font-mono uppercase tracking-wider text-[8px] font-bold">Account status</span>
                    <span className="text-slate-900 font-bold leading-none">Permitted voter</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Hold authorization alert for Pending Approvals */}
            {voterProfile && !voterProfile.approved && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded space-y-2">
                <div className="flex items-center space-x-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <h4 className="font-bold text-[10px] tracking-tight uppercase">Registration Audit Pending</h4>
                </div>
                <p className="text-[10px] text-amber-800 leading-relaxed">
                  Your registered profile is currently being reviewed by election administrators to confirm details. 
                  Decryption keys authorizing ballot registrations will be updated shortly after validation.
                </p>
              </div>
            )}
          </div>

          {/* Active Polls column: size 2 */}
          <div className="lg:col-span-2 space-y-4">
            <div>
              <h2 className="text-base font-bold tracking-tight text-slate-950 mb-1">Electronic Ballots Dispatch</h2>
              <p className="text-[11px] text-slate-500 mb-4">Enter secure voting booths below to cast choices on ongoing contested government positions.</p>

              {activeElections.length === 0 ? (
                <div className="bg-white p-6 text-center border border-slate-200 rounded space-y-2">
                  <ShieldAlert className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="font-bold text-slate-900 text-xs">No ongoing polls active currently.</p>
                  <p className="text-[10px] text-slate-500 max-w-sm mx-auto">
                    The electronic voting portals open on set scheduling terms. Feel free to review political parties from the public catalog.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {activeElections.map(election => (
                    <div key={election.id} className="bg-white border border-slate-200 rounded overflow-hidden shadow-sm flex flex-col hover:shadow-sm transition">
                      <div className="h-24 bg-slate-100 overflow-hidden relative">
                        {election.banner ? (
                          <img 
                            src={election.banner} 
                            alt="banner" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-100 text-slate-400 flex items-center justify-center">
                            <Calendar className="w-7 h-7" />
                          </div>
                        )}
                        <span className="absolute top-2 right-2 bg-green-600 text-white text-[8px] font-bold tracking-wider px-1.5 py-0.5 rounded uppercase">
                          Live Open
                        </span>
                      </div>
                      <div className="p-3 flex-1 flex flex-col justify-between space-y-3">
                        <div className="space-y-0.5">
                          <h4 className="font-bold text-slate-900 text-xs leading-tight line-clamp-1">{election.electionName}</h4>
                          <p className="text-[10px] text-slate-400 font-bold">CLOSES: {new Date(election.endDate).toLocaleDateString()}</p>
                        </div>
                        <button
                          onClick={() => enterVotingRoom(election.id)}
                          className="w-full py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] rounded border border-blue-700 cursor-pointer shadow-sm transition text-center"
                        >
                          Enter Voting Booth
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Voting records receipt list */}
            <div>
              <h3 className="text-xs font-bold text-slate-950 mb-1 ml-0.5 uppercase tracking-wide">Electoral Verification Ledger</h3>
              <p className="text-[10px] text-slate-500 mb-3 ml-0.5">Your cryptographically signed ballots recorded in our verification database:</p>

              {votingHistory.length === 0 ? (
                <div className="p-4 border border-dashed border-slate-200 rounded text-center text-[10px] text-slate-400 bg-slate-50/50">
                  No voting logs found on this account card yet.
                </div>
              ) : (
                <div className="border border-slate-200 rounded divide-y divide-slate-150 bg-white shadow-sm">
                  {votingHistory.map(vt => (
                    <div key={vt.id} className="p-2.5 flex flex-col sm:flex-row justify-between sm:items-center text-[11px] gap-2">
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-900">{vt.election?.electionName || "General Ballot"}</p>
                        <div className="flex flex-wrap gap-1.5 text-[9px] text-slate-400 font-mono">
                          <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-bold uppercase border border-blue-100">{vt.position?.positionName}</span>
                          <span className="font-bold text-slate-600">VOTED: {vt.candidate?.fullName}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono text-[8px] font-bold text-slate-400">HASH: #{vt.id.toUpperCase()}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">{new Date(vt.timestamp).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RENDER VIEW 2: VOTING ROOM OVERVIEW */}
      {activeElectionId && !votedPositionId && (
        <div className="max-w-4xl mx-auto space-y-4">
          <button 
            onClick={leaveVotingRoom}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded flex items-center space-x-1 border border-slate-300 cursor-pointer transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Exit Booth (Dashboard)</span>
          </button>

          {electionDetail && (
            <div className="bg-white border border-slate-200 text-left rounded overflow-hidden shadow-sm">
              <div className="h-32 bg-slate-100 overflow-hidden relative">
                {electionDetail.banner ? (
                  <img 
                    src={electionDetail.banner} 
                    alt="banner" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-100 text-slate-400 flex items-center justify-center">
                    <Calendar className="w-8 h-8" />
                  </div>
                )}
                <span className="absolute top-3 left-3 bg-blue-600 text-white font-bold text-[9px] tracking-widest font-mono px-2 py-0.5 rounded">
                  BALLOT HUB
                </span>
              </div>
              
              <div className="p-4 md:p-6 space-y-4">
                <div className="space-y-1 pb-4 border-b border-slate-100">
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">{electionDetail.electionName}</h2>
                  <p className="text-slate-500 text-xs">{electionDetail.description || "Pick candidates carefully."}</p>
                </div>

                {!voterProfile?.approved ? (
                  <div className="bg-red-50 border border-red-200 text-red-900 p-4 rounded flex items-start space-x-2.5 text-[11px] leading-relaxed">
                    <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-xs tracking-tight mb-0.5 uppercase">Sigs Unverified (Booths Locked)</h4>
                      <p>
                        Your voter account registration card is still PENDING verification status. 
                        You may review listed positions but you are strictly BLOCKED from casting database logs until active approvals exist.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h3 className="font-bold text-slate-950 font-sans text-xs uppercase tracking-tight flex items-center">
                      <Landmark className="w-3.5 h-3.5 mr-1 text-blue-500" />
                      <span>Official Ballot ({electionPositions.length})</span>
                    </h3>
                    <p className="text-[10px] text-slate-400">All positions are unlocked. For multi-slot positions, select the required number of candidates to complete that seat.</p>

                    <div className="space-y-5">
                      {electionPositions.map(pos => {
                        const winnerSlots = Math.max(1, pos.winnerSlots || 1);
                        const voteCount = Math.min(pos.voteCount || pos.votedCandidateIds?.length || 0, winnerSlots);
                        const isPositionComplete = voteCount >= winnerSlots;
                        return (
                        <div key={pos.id} className="border border-slate-200 rounded bg-white overflow-hidden shadow-sm">
                          <div>
                            <div className="flex justify-between items-start gap-3 bg-slate-50 border-b border-slate-200 px-4 py-3">
                              <div>
                                <h4 className="font-bold text-slate-950 text-base leading-tight">{pos.positionName}</h4>
                                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{pos.description || "Select one candidate for this position."}</p>
                                <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-blue-600">
                                  Select {winnerSlots} candidate{winnerSlots === 1 ? "" : "s"} for this position
                                </p>
                                <p className="mt-0.5 text-[9px] font-mono text-slate-400">
                                  Choices signed: {voteCount}/{winnerSlots}
                                </p>
                              </div>
                              {isPositionComplete ? (
                                <span className="px-1.5 py-0.5 bg-green-100 text-green-800 text-[8px] font-bold rounded uppercase tracking-wide border border-green-200">
                                  ✓ Signed
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 text-[8px] font-bold rounded uppercase tracking-wide border border-amber-200">
                                  ● Blanks
                                </span>
                              )}
                            </div>

                            {(pos.candidates || []).length === 0 ? (
                              <div className="p-4 text-center text-[11px] text-slate-400">
                                No candidates are currently contested for this position.
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
                                {(pos.candidates || []).map(cand => {
                                  const alreadySelected = (pos.votedCandidateIds || []).includes(cand.id);
                                  const isChoiceDisabled = alreadySelected || isPositionComplete;
                                  return (
                                  <div
                                    key={cand.id}
                                    className="border border-slate-200 rounded bg-white p-3 flex flex-col justify-between gap-3 shadow-sm"
                                    style={{ borderTop: cand.party ? `3px solid ${cand.party.color}` : "3px solid #64748b" }}
                                  >
                                    <div className="flex items-center gap-3">
                                      {cand.photo ? (
                                        <img
                                        src={cand.photo}
                                        alt={cand.fullName}
                                        className="h-14 w-14 rounded border border-slate-200 object-cover shrink-0"
                                      />
                                    ) : (
                                      <div className="h-14 w-14 rounded border border-slate-200 bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                                        <UserCheck className="w-5 h-5" />
                                      </div>
                                    )}
                                      <div className="min-w-0">
                                        <h5 className="font-bold text-slate-950 text-xs leading-tight truncate">{cand.fullName}</h5>
                                        <p className="text-[10px] text-slate-500 mt-1 truncate">
                                          {cand.party ? cand.party.partyName : "Independent"}
                                        </p>
                                        {cand.party?.acronym && (
                                          <span
                                            className="mt-1 inline-block rounded px-1.5 py-0.5 text-[8px] font-bold text-white"
                                            style={{ backgroundColor: cand.party.color }}
                                          >
                                            {cand.party.acronym}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {cand.platformStatement && (
                                      <p className="text-[10px] text-slate-600 leading-snug line-clamp-2">{cand.platformStatement}</p>
                                    )}

                                    <button
                                      disabled={isChoiceDisabled}
                                      onClick={() => {
                                        setSelectedCandidate(cand);
                                        setSelectedPositionForVote(pos);
                                        setShowConfirmModal(true);
                                      }}
                                      className={`w-full py-1.5 text-[10px] font-bold rounded border shadow-sm transition text-center ${
                                        isChoiceDisabled
                                          ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                          : "bg-blue-600 hover:bg-blue-500 text-white border-blue-700 cursor-pointer"
                                      }`}
                                    >
                                      {alreadySelected ? "Selected" : isPositionComplete ? "Slots Filled" : "Select Candidate"}
                                    </button>
                                  </div>
                                )})}
                              </div>
                            )}
                          </div>
                        </div>
                      )})}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* RENDER VIEW 3: POSITION VOTING (CANDIDACY SECTIONS) */}
      {activeElectionId && votedPositionId && (
        <div className="max-w-5xl mx-auto space-y-4">
          <button 
            onClick={leavePositionVoting}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded border border-slate-300 flex items-center space-x-1 cursor-pointer transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Ballots list</span>
          </button>

          <div className="space-y-0.5">
            <span className="text-[9px] font-mono font-bold tracking-wider text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase">CONTEST CATEGORY seat</span>
            <h2 className="text-base font-bold text-slate-950 tracking-tight leading-none mt-1.5">{positionDetail?.positionName}</h2>
            <p className="text-slate-500 text-[11px] mt-1">{positionDetail?.description || "Pick the platform candidate matching your alignment."}</p>
          </div>

          {candidatesForPosition.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded p-10 text-center text-slate-400">
              No candidates are currently contested for this seat.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
              {candidatesForPosition.map(cand => (
                <div 
                  key={cand.id} 
                  className="bg-white border border-slate-200 text-left rounded overflow-hidden shadow-sm hover:shadow-sm transition flex flex-col justify-between"
                  style={{ borderTop: cand.party ? `3px solid ${cand.party.color}` : "3px solid #6b7280" }}
                >
                  <div className="p-4 space-y-3">
                    <div className="flex items-center space-x-3">
                      {cand.photo ? (
                        <img 
                          src={cand.photo} 
                          alt={cand.fullName} 
                          className="w-14 h-14 rounded border border-slate-200 object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded border border-slate-200 bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                          <UserCheck className="w-5 h-5" />
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-slate-950 text-xs leading-none">{cand.fullName}</h4>
                        {cand.party ? (
                          <span 
                            className="text-[8px] font-bold px-1.5 py-0.5 rounded mt-1 inline-block text-white"
                            style={{ backgroundColor: cand.party.color }}
                          >
                            {cand.party.acronym}
                          </span>
                        ) : (
                          <span className="text-[8px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded mt-1 inline-block uppercase">
                            Independent
                          </span>
                        )}
                        {cand.education && <p className="text-[9px] text-slate-400 italic mt-1 font-sans line-clamp-1 truncate max-w-[120px]">{cand.education}</p>}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[11px] text-indigo-700 italic font-bold">"{cand.platformStatement || "No custom platform quote"}"</p>
                      <p className="text-slate-600 text-xs leading-normal line-clamp-3">{cand.biography || "Candidacy details in review summary."}</p>
                    </div>

                    {cand.achievements && (
                      <div className="bg-slate-50 p-2 border border-slate-200 rounded">
                        <span className="text-[8px] font-mono font-bold tracking-wider text-slate-400 uppercase">Key Milestones</span>
                        <p className="text-[10px] text-slate-700 line-clamp-2 mt-0.5">{cand.achievements}</p>
                      </div>
                    )}
                  </div>

                  <div className="p-4 pt-0">
                    <button
                      onClick={() => {
                        setSelectedCandidate(cand);
                        setShowConfirmModal(true);
                      }}
                      className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded border border-blue-700 cursor-pointer shadow-sm text-center transition"
                    >
                      Select Candidate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CONFIRM BILLS MODAL INTERFACE */}
      {showConfirmModal && selectedCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded max-w-sm w-full border border-slate-300 shadow-xl p-4 space-y-4 text-center">
            <div className="inline-flex p-2.5 bg-blue-50 rounded text-blue-600 mx-auto justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-slate-950 uppercase tracking-tight">Verify Digital Sign</h3>
              <p className="text-slate-500 text-[11px]">You are about to cryptographically lock the following ballot selection:</p>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3 rounded flex flex-col items-center space-y-1.5">
              {selectedCandidate.photo ? (
                <img 
                  src={selectedCandidate.photo} 
                  alt="cad" 
                  className="w-10 h-10 rounded border border-slate-200 object-cover shadow-sm"
                />
              ) : (
                <div className="w-10 h-10 rounded border border-slate-200 bg-white text-slate-500 flex items-center justify-center shadow-sm">
                  <UserCheck className="w-4 h-4" />
                </div>
              )}
              <div>
                <h4 className="font-bold text-blue-600 text-xs">{selectedCandidate.fullName}</h4>
                <p className="text-[9px] text-slate-400 font-mono tracking-wide uppercase font-bold">ROLE: {selectedPositionForVote?.positionName || positionDetail?.positionName}</p>
              </div>
            </div>

            <div className="bg-amber-50 rounded text-amber-800 flex space-x-1 border border-amber-200 text-left p-3 leading-normal">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[9px] text-amber-800">
                ATTENTION: Database locks are permanent. Your choice is signed with unlinked identity blocks 
                ensuring constitutional privacy, but your seat credit is permanently marked.
              </p>
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setSelectedCandidate(null);
                  setSelectedPositionForVote(null);
                }}
                className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded cursor-pointer border border-slate-300 shadow-sm transition"
              >
                Cancel choice
              </button>
              <button
                onClick={handleCastVote}
                className="flex-1 py-1.5 bg-blue-600 text-white bg-blue-600 hover:bg-blue-500 font-bold text-xs rounded cursor-pointer border border-blue-700 shadow-sm transition"
              >
                Confirm ballot
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
