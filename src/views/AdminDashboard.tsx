/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Users, Flag, Award, Calendar, Terminal, Check, AlertTriangle, 
  Trash2, UserPlus, Plus, Edit3, Eye, FileSpreadsheet, Lock, X, Play, Square, UserMinus,
  ImagePlus, RotateCcw, Search
} from "lucide-react";
import { User, Voter, Party, Position, Election, Candidate, AuditLog } from "../types";
import { apiFetch } from "../api";
import { prepareImageUpload } from "../imageUpload";

interface AdminDashboardProps {
  adminToken: string;
  adminUser: User;
  onNavigate: (view: string) => void;
}

export default function AdminDashboard({ adminToken, adminUser, onNavigate }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<"metrics" | "voters" | "elections" | "parties" | "candidates" | "audit">("metrics");
  const [tabSearch, setTabSearch] = useState<Record<string, string>>({
    metrics: "",
    voters: "",
    elections: "",
    parties: "",
    candidates: "",
    audit: ""
  });
  
  // Data lists state
  const [voters, setVoters] = useState<(Voter & { user?: User })[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [elections, setElections] = useState<Election[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [metrics, setMetrics] = useState<any>({
    totalVoters: 0,
    totalCandidates: 0,
    totalParties: 0,
    activeElections: 0,
    totalVotes: 0,
    pendingVoters: 0
  });

  // Modal displays
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [editingPartyId, setEditingPartyId] = useState<string | null>(null);
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
  
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);
  
  const [showElectionModal, setShowElectionModal] = useState(false);
  const [showPositionModal, setShowPositionModal] = useState(false);
  const [editingPositionId, setEditingPositionId] = useState<string | null>(null);
  const [editingElectionId, setEditingElectionId] = useState<string | null>(null);

  // Form Fields State
  // Party Form
  const [partyName, setPartyName] = useState("");
  const [partyAcronym, setPartyAcronym] = useState("");
  const [partyLogo, setPartyLogo] = useState("");
  const [partyDescription, setPartyDescription] = useState("");
  const [partySlogan, setPartySlogan] = useState("");
  const [partyLeader, setPartyLeader] = useState("");
  const [partyColor, setPartyColor] = useState("#3b82f6");

  // Position Form
  const [positionName, setPositionName] = useState("");
  const [positionDesc, setPositionDesc] = useState("");
  const [positionWinnerSlots, setPositionWinnerSlots] = useState(1);

  // Election Form
  const [elName, setElName] = useState("");
  const [elDesc, setElDesc] = useState("");
  const [elStart, setElStart] = useState("");
  const [elEnd, setElEnd] = useState("");
  const [elBanner, setElBanner] = useState("");
  const [elSelectedParties, setElSelectedParties] = useState<string[]>([]);
  const [elSelectedPositions, setElSelectedPositions] = useState<string[]>([]);
  const [elPositionWinnerSlots, setElPositionWinnerSlots] = useState<Record<string, number>>({});

  // Candidate Form
  const [candName, setCandName] = useState("");
  const [candPartyId, setCandPartyId] = useState("");
  const [candPosId, setCandPosId] = useState("");
  const [candPhoto, setCandPhoto] = useState("");
  const [candPhotoChanged, setCandPhotoChanged] = useState(false);
  const [candPoster, setCandPoster] = useState("");
  const [candBio, setCandBio] = useState("");
  const [candPlatform, setCandPlatform] = useState("");
  const [candAchievements, setCandAchievements] = useState("");
  const [candEdu, setCandEdu] = useState("");
  const [candContact, setCandContact] = useState("");
  const [candSocial, setCandSocial] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorNotice, setErrorNotice] = useState("");
  const [successNotice, setSuccessNotice] = useState("");

  const readApiResponse = async (response: Response) => {
    const text = await response.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      throw new Error("The server returned an invalid response.");
    }
  };

  const adminErrorMessage = (err: any, fallback: string) => {
    if (err?.name === "TypeError") {
      return "Cannot reach the backend server. Please start Spring Boot on http://localhost:8080 and confirm MySQL is running.";
    }
    return err?.message || fallback;
  };

  const handleImageUpload = async (
    file: File | undefined,
    label: string,
    setImage: (value: string) => void,
    maxDimension = 720
  ) => {
    if (!file) return;
    try {
      setImage(await prepareImageUpload(file, { maxDimension, quality: 0.82 }));
      setErrorNotice("");
    } catch (err: any) {
      setErrorNotice(err.message || `Could not read the selected ${label}.`);
    }
  };

  // Reload all resources
  const reloadAll = async () => {
    try {
      const headers = { 
        "Content-Type": "application/json",
        "x-admin-id": adminUser.id
      };
      
      const [mtRes, vtRes, ptRes, psRes, elRes, cdRes, lgRes] = await Promise.all([
        apiFetch("/api/admin/metrics", { headers }),
        apiFetch("/api/admin/voters", { headers }),
        apiFetch("/api/admin/parties", { headers }),
        apiFetch("/api/admin/positions", { headers }),
        apiFetch("/api/admin/elections", { headers }),
        apiFetch("/api/admin/candidates", { headers }),
        apiFetch("/api/admin/audit-logs", { headers })
      ]);

      if (mtRes.ok) setMetrics(await mtRes.json());
      if (vtRes.ok) setVoters(await vtRes.json());
      if (ptRes.ok) setParties(await ptRes.json());
      if (psRes.ok) setPositions(await psRes.json());
      if (elRes.ok) setElections(await elRes.json());
      if (cdRes.ok) setCandidates(await cdRes.json());
      if (lgRes.ok) setAuditLogs(await lgRes.json());
    } catch (e) {
      console.error("Failed to refresh admin resource directory", e);
    }
  };

  useEffect(() => {
    reloadAll();
  }, [adminUser]);

  // Voters Approvals Trigger
  const handleApproveVoter = async (voterId: string) => {
    try {
      const res = await apiFetch(`/api/admin/voters/${voterId}/approve`, {
        method: "POST",
        headers: { "x-admin-id": adminUser.id }
      });
      if (res.ok) {
        setSuccessNotice("Voter key approved successfully and activated.");
        reloadAll();
        setTimeout(() => setSuccessNotice(""), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSuspendVoter = async (voterId: string) => {
    try {
      const res = await apiFetch(`/api/admin/voters/${voterId}/suspend`, {
        method: "POST",
        headers: { "x-admin-id": adminUser.id }
      });
      if (res.ok) {
        setSuccessNotice("Voter identity status suspended/revoked.");
        reloadAll();
        setTimeout(() => setSuccessNotice(""), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteVoter = async (voterId: string) => {
    if (!window.confirm("Are you sure you want to delete this voter and their associated credentials completely?")) return;
    try {
      const res = await apiFetch(`/api/admin/voters/${voterId}`, {
        method: "DELETE",
        headers: { "x-admin-id": adminUser.id }
      });
      if (res.ok) {
        setSuccessNotice("Electoral card registry entry removed.");
        reloadAll();
        setTimeout(() => setSuccessNotice(""), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Party Management
  const submitParty = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNotice("");
    const normalizedPartyName = partyName.trim();
    const normalizedPartyAcronym = partyAcronym.trim();
    if (!normalizedPartyName || !normalizedPartyAcronym) {
      setErrorNotice("Party name and acronym shortcut are required.");
      return;
    }

    setLoading(true);

    try {
      const method = editingPartyId ? "PUT" : "POST";
      const url = editingPartyId ? `/api/admin/parties/${editingPartyId}` : "/api/admin/parties";

      const res = await apiFetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          "x-admin-id": adminUser.id
        },
        body: JSON.stringify({
          partyName: normalizedPartyName,
          acronym: normalizedPartyAcronym,
          logo: partyLogo,
          description: partyDescription.trim(),
          slogan: partySlogan.trim(),
          leader: partyLeader.trim(),
          color: partyColor
        })
      });

      const data = await readApiResponse(res);
      if (!res.ok) {
        throw new Error(data.error || "Party operation failed");
      }

      setPartyName("");
      setPartyAcronym("");
      setPartyLogo("");
      setPartyDescription("");
      setPartySlogan("");
      setPartyLeader("");
      setShowPartyModal(false);
      setEditingPartyId(null);
      setSuccessNotice(`Political party saved successfully.`);
      await reloadAll();
      setTimeout(() => setSuccessNotice(""), 3000);
    } catch (err: any) {
      setErrorNotice(adminErrorMessage(err, "An error occurred."));
    } finally {
      setLoading(false);
    }
  };

  const editPartyOpen = (party: Party) => {
    setErrorNotice("");
    setSuccessNotice("");
    setEditingPartyId(party.id);
    setPartyName(party.partyName);
    setPartyAcronym(party.acronym);
    setPartyLogo(party.logo || "");
    setPartyDescription(party.description || "");
    setPartySlogan(party.slogan || "");
    setPartyLeader(party.leader || "");
    setPartyColor(party.color);
    setShowPartyModal(true);
  };

  const openAddPartyMember = (partyId: string) => {
    setErrorNotice("");
    setSuccessNotice("");
    setEditingCandidateId(null);
    setCandName("");
    setCandPartyId(partyId);
    setCandPosId("");
    setCandPhoto("");
    setCandPhotoChanged(false);
    setCandPoster("");
    setCandBio("");
    setCandPlatform("");
    setCandAchievements("");
    setCandEdu("");
    setCandContact("");
    setCandSocial("");
    setSelectedPartyId(null);
    setShowCandidateModal(true);
  };

  const deleteParty = async (partyId: string) => {
    if (!window.confirm("Are you sure you want to delete this party? All candidate links will revert to Independent.")) return;
    try {
      const res = await apiFetch(`/api/admin/parties/${partyId}`, {
        method: "DELETE",
        headers: { "x-admin-id": adminUser.id }
      });
      if (res.ok) {
        setSuccessNotice("Party deleted successfully.");
        reloadAll();
        setTimeout(() => setSuccessNotice(""), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Submit Candidate Management
  const submitCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNotice("");
    setLoading(true);

    try {
      const method = editingCandidateId ? "PUT" : "POST";
      const url = editingCandidateId ? `/api/admin/candidates/${editingCandidateId}` : "/api/admin/candidates";
      const candidatePayload: any = {
        fullName: candName,
        partyId: candPartyId,
        positionId: candPosId,
        poster: candPoster,
        biography: candBio,
        platformStatement: candPlatform,
        achievements: candAchievements,
        education: candEdu,
        contactInfo: candContact,
        socialMediaLinks: candSocial
      };

      if (!editingCandidateId || candPhotoChanged) {
        candidatePayload.photo = candPhoto;
      }

      const res = await apiFetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-admin-id": adminUser.id
        },
        body: JSON.stringify(candidatePayload)
      });

      const data = await readApiResponse(res);
      if (!res.ok) {
        throw new Error(data.error || "Candidate operation failed");
      }

      setCandName("");
      setCandPartyId("");
      setCandPosId("");
      setCandPhoto("");
      setCandPhotoChanged(false);
      setCandPoster("");
      setCandBio("");
      setCandPlatform("");
      setCandAchievements("");
      setCandEdu("");
      setCandContact("");
      setCandSocial("");

      setShowCandidateModal(false);
      setEditingCandidateId(null);
      setSuccessNotice(`Candidate details stored safely.`);
      reloadAll();
      setTimeout(() => setSuccessNotice(""), 3000);
    } catch (err: any) {
      setErrorNotice(adminErrorMessage(err, "Operation failed."));
    } finally {
      setLoading(false);
    }
  };

  const editCandidateOpen = (cand: Candidate) => {
    setErrorNotice("");
    setSuccessNotice("");
    setEditingCandidateId(cand.id);
    setCandName(cand.fullName);
    setCandPartyId(cand.partyId || "");
    setCandPosId(cand.positionId);
    setCandPhoto(cand.photo || "");
    setCandPhotoChanged(false);
    setCandPoster(cand.poster || "");
    setCandBio(cand.biography || "");
    setCandPlatform(cand.platformStatement || "");
    setCandAchievements(cand.achievements || "");
    setCandEdu(cand.education || "");
    setCandContact(cand.contactInfo || "");
    setCandSocial(cand.socialMediaLinks || "");
    setShowCandidateModal(true);
  };

  const deleteCandidate = async (candId: string) => {
    if (!window.confirm("Remove this candidate from selection records?")) return;
    try {
      const res = await apiFetch(`/api/admin/candidates/${candId}`, {
        method: "DELETE",
        headers: { "x-admin-id": adminUser.id }
      });
      if (res.ok) {
        setSuccessNotice("Candidate cleared.");
        reloadAll();
        setTimeout(() => setSuccessNotice(""), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Submit Seat Position
  const submitPosition = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNotice("");
    const normalizedPositionName = positionName.trim();
    const normalizedPositionDesc = positionDesc.trim();
    const normalizedWinnerSlots = Math.max(1, Math.floor(Number(positionWinnerSlots) || 1));
    if (!normalizedPositionName) {
      setErrorNotice("Position name is required.");
      return;
    }
    setLoading(true);

    try {
      const method = editingPositionId ? "PUT" : "POST";
      const url = editingPositionId ? `/api/admin/positions/${editingPositionId}` : "/api/admin/positions";
      const res = await apiFetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-admin-id": adminUser.id
        },
        body: JSON.stringify({ positionName: normalizedPositionName, description: normalizedPositionDesc, winnerSlots: normalizedWinnerSlots })
      });
      const data = await readApiResponse(res);
      if (!res.ok) throw new Error(data.error);

      setPositionName("");
      setPositionDesc("");
      setPositionWinnerSlots(1);
      setEditingPositionId(null);
      setShowPositionModal(false);
      setSuccessNotice(editingPositionId ? "Electoral seat position updated." : "New governmental position seat created.");
      reloadAll();
      setTimeout(() => setSuccessNotice(""), 3000);
    } catch (err: any) {
      setErrorNotice(adminErrorMessage(err, "Failed."));
    } finally {
      setLoading(false);
    }
  };

  const editPositionOpen = (position: Position) => {
    setErrorNotice("");
    setSuccessNotice("");
    setEditingPositionId(position.id);
    setPositionName(position.positionName);
    setPositionDesc(position.description || "");
    setPositionWinnerSlots(Math.max(1, position.winnerSlots || 1));
    setShowPositionModal(true);
  };

  const deletePosition = async (posId: string) => {
    if (!window.confirm("This will permanently clear the position seat from registry. Delete?")) return;
    try {
      const res = await apiFetch(`/api/admin/positions/${posId}`, {
        method: "DELETE",
        headers: { "x-admin-id": adminUser.id }
      });
      if (res.ok) {
        setSuccessNotice("Electoral seat position purged.");
        reloadAll();
        setTimeout(() => setSuccessNotice(""), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Submit Election Configuration
  const submitElection = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNotice("");
    setLoading(true);

    if (elSelectedParties.length === 0) {
      setErrorNotice("Select at least one participating party for this election.");
      setLoading(false);
      return;
    }

    if (elSelectedPositions.length === 0) {
      setErrorNotice("Map at least one contested position with candidates from the selected parties.");
      setLoading(false);
      return;
    }

    try {
      const method = editingElectionId ? "PUT" : "POST";
      const url = editingElectionId ? `/api/admin/elections/${editingElectionId}` : "/api/admin/elections";
      const res = await apiFetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-admin-id": adminUser.id
        },
        body: JSON.stringify({
          electionName: elName,
          description: elDesc,
          startDate: elStart,
          endDate: elEnd,
          banner: elBanner,
          partyIds: elSelectedParties,
          positions: sortPositionIds(elSelectedPositions),
          positionWinnerSlots: Object.fromEntries(
            sortPositionIds(elSelectedPositions).map(positionId => [positionId, Math.max(1, Math.floor(Number(elPositionWinnerSlots[positionId]) || defaultWinnerSlotsForPosition(positionId)))])
          )
        })
      });

      const data = await readApiResponse(res);
      if (!res.ok) throw new Error(data.error);

      setElName("");
      setElDesc("");
      setElStart("");
      setElEnd("");
      setElBanner("");
      setElSelectedParties([]);
      setElSelectedPositions([]);
      setElPositionWinnerSlots({});
      setEditingElectionId(null);
      setShowElectionModal(false);
      setSuccessNotice(editingElectionId ? "Electoral profile updated." : "Electoral profile recorded in database.");
      reloadAll();
      setTimeout(() => setSuccessNotice(""), 3000);
    } catch (err: any) {
      setErrorNotice(adminErrorMessage(err, "Failed to save election profile."));
    } finally {
      setLoading(false);
    }
  };

  const editElectionOpen = (election: Election) => {
    setErrorNotice("");
    setSuccessNotice("");
    setEditingElectionId(election.id);
    setElName(election.electionName);
    setElDesc(election.description || "");
    setElStart(toDateTimeLocal(election.startDate));
    setElEnd(toDateTimeLocal(election.endDate));
    setElBanner(election.banner || "");
    setElSelectedParties(election.partyIds || []);
    setElSelectedPositions(sortPositionIds(election.positions || []));
    setElPositionWinnerSlots(Object.fromEntries(
      (election.positions || []).map(positionId => [
        positionId,
        Math.max(1, election.positionWinnerSlots?.[positionId] || defaultWinnerSlotsForPosition(positionId))
      ])
    ));
    setShowElectionModal(true);
  };

  // Activate / Close Elections
  const activateElection = async (id: string) => {
    try {
      const res = await apiFetch(`/api/admin/elections/${id}/activate`, {
        method: "POST",
        headers: { "x-admin-id": adminUser.id }
      });
      if (res.ok) {
        setSuccessNotice("Election active! Voters are now authorized to register ballot cards.");
        reloadAll();
        setTimeout(() => setSuccessNotice(""), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const closeElection = async (id: string) => {
    try {
      const res = await apiFetch(`/api/admin/elections/${id}/close`, {
        method: "POST",
        headers: { "x-admin-id": adminUser.id }
      });
      if (res.ok) {
        setSuccessNotice("Ballot receipts locked. Certified final results calculated.");
        reloadAll();
        setTimeout(() => setSuccessNotice(""), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteElection = async (id: string) => {
    if (!window.confirm("Purging election records clears ballot details. Confirm permanent deletion?")) return;
    try {
      const res = await apiFetch(`/api/admin/elections/${id}`, {
        method: "DELETE",
        headers: { "x-admin-id": adminUser.id }
      });
      if (res.ok) {
        setSuccessNotice("Electoral metadata wiped.");
        reloadAll();
        setTimeout(() => setSuccessNotice(""), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleElectionPositionMapping = (id: string) => {
    if (elSelectedPositions.includes(id)) {
      setElSelectedPositions(sortPositionIds(elSelectedPositions.filter(p => p !== id)));
      setElPositionWinnerSlots(slots => {
        const next = { ...slots };
        delete next[id];
        return next;
      });
    } else {
      setElSelectedPositions(sortPositionIds([...elSelectedPositions, id]));
      setElPositionWinnerSlots(slots => ({ ...slots, [id]: slots[id] || defaultWinnerSlotsForPosition(id) }));
    }
  };

  const toggleElectionPartyMapping = (id: string) => {
    setElSelectedParties((selected) => {
      const next = selected.includes(id) ? selected.filter(partyId => partyId !== id) : [...selected, id];
      setElSelectedPositions((positionIds) => sortPositionIds(positionIds.filter(positionId => positions.some(position => position.id === positionId))));
      return next;
    });
  };

  const positionHasSelectedPartyCandidate = (positionId: string, selectedPartyIds = elSelectedParties) => {
    return candidates.some(candidate => candidate.positionId === positionId && selectedPartyIds.includes(candidate.partyId || ""));
  };

  const positionRank = (positionName?: string) => {
    const normalized = (positionName || "").toLowerCase().replace(/\./g, "").replace(/-/g, " ").trim();
    if (normalized === "president") return 0;
    if (normalized === "vice president") return 1;
    if (normalized === "secretary") return 2;
    if (normalized === "treasurer") return 3;
    if (normalized === "auditor") return 4;
    if (normalized === "pio" || normalized === "public information officer") return 5;
    if (normalized === "business manager") return 6;
    if (normalized === "representative") return 7;
    return 1000;
  };

  const sortedPositions = [...positions].sort((a, b) => {
    const rankDiff = positionRank(a.positionName) - positionRank(b.positionName);
    if (rankDiff !== 0) return rankDiff;
    return a.positionName.localeCompare(b.positionName);
  });

  const sortPositionIds = (positionIds: string[] = []) => {
    return [...positionIds].sort((a, b) => {
      const posA = positions.find(position => position.id === a);
      const posB = positions.find(position => position.id === b);
      const rankDiff = positionRank(posA?.positionName) - positionRank(posB?.positionName);
      if (rankDiff !== 0) return rankDiff;
      return (posA?.positionName || "").localeCompare(posB?.positionName || "");
    });
  };

  const eligibleElectionPositions = sortedPositions;

  const defaultWinnerSlotsForPosition = (positionId: string) => {
    return Math.max(1, positions.find(position => position.id === positionId)?.winnerSlots || 1);
  };

  const setElectionPositionWinnerSlots = (positionId: string, value: number) => {
    setElPositionWinnerSlots(slots => ({ ...slots, [positionId]: Math.max(1, Math.floor(Number(value) || 1)) }));
  };

  const toDateTimeLocal = (value: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value.slice(0, 16);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  };

  const getPositionName = (id: string) => {
    return positions.find(p => p.id === id)?.positionName || "Dynamic Seat";
  };

  const getPartyName = (id?: string) => {
    if (!id) return "Independent";
    return parties.find(p => p.id === id)?.partyName || "Party Team";
  };

  const currentSearch = tabSearch[activeTab] || "";
  const normalizedSearch = currentSearch.trim().toLowerCase();
  const matchesSearch = (...values: unknown[]) => {
    if (!normalizedSearch) return true;
    return values
      .filter(value => value !== null && value !== undefined)
      .some(value => String(value).toLowerCase().includes(normalizedSearch));
  };

  const filteredVoters = voters.filter(v => matchesSearch(
    v.user?.fullName,
    v.user?.username,
    v.user?.email,
    v.voterIdNumber,
    v.phone,
    v.address,
    v.approved ? "approved" : "pending"
  ));

  const filteredElections = elections.filter(election => matchesSearch(
    election.id,
    election.electionName,
    election.description,
    election.status,
    election.startDate,
    election.endDate,
    ...(election.partyIds || []).map(getPartyName),
    ...(election.positions || []).map(getPositionName)
  ));

  const filteredParties = parties.filter(party => matchesSearch(
    party.partyName,
    party.acronym,
    party.slogan,
    party.description,
    party.leader,
    party.color
  ));

  const filteredCandidates = candidates.filter(cand => matchesSearch(
    cand.fullName,
    cand.id,
    getPartyName(cand.partyId),
    getPositionName(cand.positionId),
    cand.platformStatement,
    cand.education,
    cand.contactInfo,
    cand.biography
  ));

  const selectedParty = selectedPartyId ? parties.find(party => party.id === selectedPartyId) || null : null;
  const selectedPartyMembers = selectedPartyId
    ? candidates.filter(candidate => candidate.partyId === selectedPartyId)
    : [];

  const filteredAuditLogs = auditLogs.filter(log => matchesSearch(
    log.action,
    log.details,
    log.username,
    log.userId,
    log.ipAddress,
    log.timestamp
  ));

  const searchMeta: Record<string, { label: string; count: number; total: number; placeholder: string }> = {
    voters: {
      label: "Search Voter Approvals",
      count: filteredVoters.length,
      total: voters.length,
      placeholder: "Name, username, email, voter ID, phone, address, status..."
    },
    elections: {
      label: "Search Active Elections",
      count: filteredElections.length,
      total: elections.length,
      placeholder: "Election name, status, party, seat, date..."
    },
    parties: {
      label: "Search Parties",
      count: filteredParties.length,
      total: parties.length,
      placeholder: "Party name, acronym, slogan, leader, color..."
    },
    candidates: {
      label: "Search Candidates",
      count: filteredCandidates.length,
      total: candidates.length,
      placeholder: "Candidate, party, position, platform, contact..."
    },
    audit: {
      label: "Search Audit Trails",
      count: filteredAuditLogs.length,
      total: auditLogs.length,
      placeholder: "Action, operator, details, IP, timestamp..."
    }
  };

  return (
    <div className="space-y-4 py-4 text-xs font-sans">
      
      {/* Dynamic Notifications Banner */}
      {successNotice && (
        <div className="bg-green-50 border border-green-200 text-green-800 p-2.5 rounded text-xs font-semibold flex items-center space-x-1.5 animate-pulse">
          <span className="w-1.5 h-1.5 bg-green-600 rounded"></span>
          <span>{successNotice}</span>
        </div>
      )}
      {errorNotice && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-2.5 rounded text-xs flex items-center space-x-1.5">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <span>{errorNotice}</span>
          <button onClick={() => setErrorNotice("")} className="ml-auto text-red-500 hover:text-red-700">✕</button>
        </div>
      )}

      {/* Header Overview panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-3.5 border border-slate-200 rounded shadow-sm">
        <div>
          <h1 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Electoral Management Portal</h1>
          <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
            OPERATOR: <span className="font-bold text-slate-700 uppercase">{adminUser.fullName}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs">
          <button 
            onClick={() => {
              setErrorNotice("");
              setSuccessNotice("");
              setEditingElectionId(null);
              setElName("");
              setElDesc("");
              setElBanner("");
              setElStart(new Date().toISOString().substring(0,16));
              setElEnd(new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().substring(0,16));
              setElSelectedParties([]);
              setElSelectedPositions([]);
              setElPositionWinnerSlots({});
              setShowElectionModal(true);
            }}
            className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded border border-blue-700 cursor-pointer text-[10px] uppercase shadow-sm transition inline-flex items-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5" />
            Create Election
          </button>
          <button 
            onClick={() => {
              setErrorNotice("");
              setSuccessNotice("");
              setEditingCandidateId(null);
              setCandName("");
              setCandPartyId("");
              setCandPosId("");
              setCandPhoto("");
              setCandPoster("");
              setCandBio("");
              setCandPlatform("");
              setCandAchievements("");
              setCandEdu("");
              setCandContact("");
              setCandSocial("");
              setShowCandidateModal(true);
            }}
            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded border border-emerald-700 cursor-pointer text-[10px] uppercase shadow-sm transition inline-flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add Candidate
          </button>
          <button 
            onClick={() => {
              setErrorNotice("");
              setSuccessNotice("");
              setEditingPartyId(null);
              setPartyName("");
              setPartyAcronym("");
              setPartyLogo("");
              setPartyDescription("");
              setPartySlogan("");
              setPartyLeader("");
              setPartyColor("#2563eb");
              setShowPartyModal(true);
            }}
            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded border border-slate-950 cursor-pointer text-[10px] uppercase shadow-sm transition inline-flex items-center gap-1.5"
          >
            <Flag className="w-3.5 h-3.5" />
            Add Party
          </button>
          <button 
            onClick={() => {
              setErrorNotice("");
              setSuccessNotice("");
              setEditingPositionId(null);
              setPositionName("");
              setPositionDesc("");
              setPositionWinnerSlots(1);
              setShowPositionModal(true);
            }}
            className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded border border-slate-200 cursor-pointer text-[10px] uppercase transition inline-flex items-center gap-1.5"
          >
            <Award className="w-3.5 h-3.5" />
            Add Position
          </button>
        </div>
      </div>

      {/* Tabs Menu Navigation Bar */}
      <div className="border-b border-slate-200">
        <div className="flex flex-wrap -mb-px space-x-1.5">
          {[
            { id: "metrics", label: "Overview Metrics", icon: FileSpreadsheet },
            { id: "voters", label: "Voter Approvals", icon: Users, badge: voters.filter(v => !v.approved).length },
            { id: "elections", label: "Active Elections", icon: Calendar },
            { id: "parties", label: "Parties", icon: Flag },
            { id: "candidates", label: "Candidates Contestants", icon: Award },
            { id: "audit", label: "Audit Trails", icon: Terminal }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setErrorNotice("");
              }}
              className={`py-2 px-3 text-xs font-bold uppercase tracking-tight border-b-2 transition flex items-center space-x-1.5 cursor-pointer ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
              {!!tab.badge && (
                <span className="px-1.5 py-0.5 bg-red-600 text-white text-[8px] font-bold rounded-sm animate-pulse">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {activeTab !== "metrics" && (
        <div className="flex flex-col gap-2 rounded border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={currentSearch}
              onChange={(e) => setTabSearch((search) => ({ ...search, [activeTab]: e.target.value }))}
              placeholder={searchMeta[activeTab]?.placeholder || "Search this tab..."}
              className="h-9 w-full rounded border border-slate-200 bg-slate-50 pl-9 pr-9 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
            />
            {currentSearch && (
              <button
                type="button"
                onClick={() => setTabSearch((search) => ({ ...search, [activeTab]: "" }))}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </label>
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            {searchMeta[activeTab]?.label}:{" "}
            <span className="text-slate-900">{searchMeta[activeTab]?.count ?? 0}</span>
            <span className="text-slate-400"> / {searchMeta[activeTab]?.total ?? 0}</span>
          </div>
        </div>
      )}

      {/* Tab Panels */}
      {activeTab === "metrics" && (
        <div className="space-y-4">
          {/* Dynamic metrics widgets bento-grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-2.5 border border-slate-200 rounded">
              <p className="text-[8px] text-slate-400 font-mono tracking-wider font-bold uppercase">TOTAL VOTERS</p>
              <h2 className="text-lg font-bold text-slate-900 mt-0.5">{metrics.totalVoters}</h2>
              <div className="flex justify-between text-[8px] text-slate-400 font-mono mt-1">
                <span>APPROVED: {voters.filter(v => v.approved).length}</span>
                <span>PENDING: {voters.filter(v => !v.approved).length}</span>
              </div>
            </div>
            <div className="bg-white p-2.5 border border-slate-200 rounded text-emerald-800">
              <p className="text-[8px] text-slate-400 font-mono tracking-wider font-bold uppercase">CANDIDATES</p>
              <h2 className="text-lg font-bold mt-0.5 text-slate-900">{metrics.totalCandidates}</h2>
              <p className="text-[8px] text-slate-500 mt-1 font-mono uppercase">On Platforms</p>
            </div>
            <div className="bg-white p-2.5 border border-slate-200 rounded text-blue-800">
              <p className="text-[8px] text-slate-400 font-mono tracking-wider font-bold uppercase">POLITICAL PARTIES</p>
              <h2 className="text-lg font-bold mt-0.5 text-slate-900">{metrics.totalParties}</h2>
              <p className="text-[8px] text-slate-500 mt-1 font-mono uppercase">Parties</p>
            </div>
            <div className="bg-white p-2.5 border border-slate-200 rounded text-amber-800 text-amber-800">
              <p className="text-[8px] text-slate-400 font-mono tracking-wider font-bold uppercase">ACTIVE POLLS</p>
              <h2 className="text-lg font-bold mt-0.5 text-slate-900">{metrics.activeElections}</h2>
              <p className="text-[8px] text-slate-500 mt-1 font-mono uppercase">Live Events</p>
            </div>
            <div className="bg-white p-2.5 border border-slate-200 rounded text-indigo-800 text-indigo-800">
              <p className="text-[8px] text-slate-400 font-mono tracking-wider font-semibold uppercase">TOTAL BALLOTS CAST</p>
              <h2 className="text-lg font-bold mt-0.5 text-slate-900">{metrics.totalVotes}</h2>
              <p className="text-[8px] text-indigo-500 mt-1 font-mono uppercase">Signed System</p>
            </div>
            <div className="bg-white p-2.5 border border-slate-200 rounded text-red-800">
              <p className="text-[8px] text-red-500 font-mono tracking-wider font-bold uppercase flex items-center">
                <span className="w-1.5 h-1.5 rounded bg-red-500 shrink-0 mr-1 animate-pulse"></span>
                <span>PENDING AUDIT</span>
              </p>
              <h2 className="text-lg font-bold mt-0.5 text-slate-900">{metrics.pendingVoters}</h2>
              <p className="text-[8px] text-slate-400 mt-1 font-mono uppercase">Registry Logs</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded p-4 space-y-3">
              <h4 className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">Electoral Seat Positions Dashboard</h4>
              {positions.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No structural positions created yet.</p>
              ) : (
                <div className="divide-y divide-slate-150 text-xs text-left">
                  {sortedPositions.map(p => (
                    <div key={p.id} className="py-2 flex justify-between items-center bg-white">
                      <div>
                        <p className="font-bold text-slate-800">{p.positionName}</p>
                        <p className="text-[10px] text-slate-400">{p.description || "No description provided."}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => editPositionOpen(p)}
                          className="p-1 hover:bg-slate-100 hover:text-slate-800 rounded border border-transparent hover:border-slate-200 transition cursor-pointer text-slate-500 pointer-events-auto"
                          title="Edit position"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deletePosition(p.id)}
                          className="p-1 hover:bg-red-50 hover:text-red-600 rounded border border-transparent hover:border-red-100 transition cursor-pointer text-red-500 pointer-events-auto"
                          title="Delete position"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-gradient-to-tr from-slate-900 to-indigo-950 text-white rounded p-4 space-y-3 relative overflow-hidden flex flex-col justify-between text-left">
              <div className="space-y-1">
                <div className="text-[9px] uppercase tracking-wider text-indigo-300 font-mono font-bold">CRYPTO-SECURE SIGNATURE ENGINES</div>
                <h4 className="text-sm font-bold uppercase font-sans">Verification Hub Status</h4>
                <p className="text-slate-300 text-[11px] leading-normal pt-1">
                  Our network operates decentralized logging files verifying electoral credentials. 
                  Voter registration profiles are checked for secure physical tokens before balloting cards can be legally decrypted.
                </p>
              </div>
              <div className="pt-2">
                <button 
                  onClick={() => setActiveTab("voters")}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] rounded border border-blue-700 shadow-sm cursor-pointer text-center uppercase"
                >
                  Inspect Pending Approvals ({voters.filter(v => !v.approved).length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}      {/* Voter approvals tab */}
      {activeTab === "voters" && (
        <div className="bg-white border border-slate-200 rounded overflow-hidden shadow-sm">
          <div className="p-3 border-b border-slate-200 text-left">
            <h4 className="font-bold text-slate-950 text-xs uppercase tracking-tight">Electoral Registry List ({filteredVoters.length})</h4>
            <p className="text-slate-500 text-[10px] mt-0.5">Review applicant profiles, check national citizenship voter numbers, and toggle permit privileges.</p>
          </div>
          {voters.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-8">No voter credentials registered yet.</p>
          ) : filteredVoters.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-8">No voter credentials match your search.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 border-collapse">
                <thead className="bg-slate-50 text-slate-700 text-[9px] font-mono uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Applicant details</th>
                    <th className="p-2.5">Electoral ID Number</th>
                    <th className="p-2.5">Phone / Residency</th>
                    <th className="p-2.5">Verification status</th>
                    <th className="p-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {filteredVoters.map(v => (
                    <tr key={v.id} className="hover:bg-slate-55/40">
                      <td className="p-2.5">
                        <div className="flex items-center space-x-2">
                          {v.profilePhoto ? (
                            <img 
                              src={v.profilePhoto} 
                              alt={v.user?.fullName} 
                              className="w-7 h-7 rounded border object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded border bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                              <UserPlus className="w-3.5 h-3.5" />
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-slate-900 text-[11px] leading-tight">{v.user?.fullName}</p>
                            <p className="text-[9px] text-slate-400 font-mono">@{v.user?.username} / {v.user?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-2.5 font-mono text-[10px] text-slate-900 font-bold">
                        {v.voterIdNumber}
                      </td>
                      <td className="p-2.5">
                        <p className="text-[10px] text-slate-800 font-bold font-mono">{v.phone || "No phone input"}</p>
                        <p className="text-[8px] text-slate-400 line-clamp-1 truncate max-w-[150px]" title={v.address}>
                          {v.address || "No address details available"}
                        </p>
                      </td>
                      <td className="p-2.5">
                        {v.approved ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 bg-green-50 text-green-700 text-[8px] font-bold rounded uppercase tracking-wide border border-green-200">
                            ✓ Approved / Keys Live
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[8px] font-bold rounded uppercase tracking-wide border border-amber-200">
                            ● Pending Approval
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 text-right font-mono">
                        <div className="flex items-center justify-end space-x-1">
                          {v.approved ? (
                            <button
                              onClick={() => handleSuspendVoter(v.id)}
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-[9px] font-bold rounded cursor-pointer transition uppercase"
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              onClick={() => handleApproveVoter(v.id)}
                              className="px-2 py-1 bg-green-600 hover:bg-green-500 text-white text-[9px] font-bold rounded border border-green-700 cursor-pointer shadow-sm transition uppercase"
                            >
                              Approve
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteVoter(v.id)}
                            title="Purge record"
                            className="p-1 text-red-500 hover:bg-red-50 rounded transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Elections tab */}
      {activeTab === "elections" && (
        <div className="space-y-4">
          {elections.length === 0 ? (
            <p className="rounded border border-slate-200 bg-white py-8 text-center text-xs text-slate-400">No elections configured yet.</p>
          ) : filteredElections.length === 0 ? (
            <p className="rounded border border-slate-200 bg-white py-8 text-center text-xs text-slate-400">No elections match your search.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredElections.map(election => (
              <div key={election.id} className="bg-white border border-slate-200 rounded overflow-hidden shadow-sm flex flex-col justify-between">
                <div>
                  <div className="h-28 overflow-hidden relative">
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
                    <div className="absolute top-2 left-2 bg-white/90 px-1.5 py-0.5 rounded text-[8px] font-bold font-mono text-slate-900 border border-slate-200">
                      ID: {election.id.toUpperCase()}
                    </div>
                    <div className="absolute top-2 right-2 text-[9px] font-bold tracking-wider uppercase py-0.5 px-2 rounded-sm border border-white/20 shadow-sm transition backdrop-blur-md text-white">
                      {election.status === "ACTIVE" && <span className="bg-green-600 px-1.5 py-0.5 rounded-sm">ACTIVE</span>}
                      {election.status === "SCHEDULED" && <span className="bg-amber-600 px-1.5 py-0.5 rounded-sm">SCHEDULED</span>}
                      {election.status === "CLOSED" && <span className="bg-slate-950/75 border border-slate-500 text-slate-300 px-1.5 py-0.5 rounded-sm">CLOSED</span>}
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="space-y-0.5 text-left">
                      <h4 className="font-bold text-slate-900 text-sm leading-tight">{election.electionName}</h4>
                      <p className="text-slate-500 text-[11px] leading-snug line-clamp-2">{election.description || "No overview statement provided."}</p>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-1 text-[10px] text-slate-700 font-mono text-left">
                      <div>
                        <span className="font-bold text-slate-400">START: </span>
                        <span>{new Date(election.startDate).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-400">BOUND CLOSE: </span>
                        <span>{new Date(election.endDate).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Mapped seats list */}
                    <div className="space-y-1 text-left">
                      <span className="text-[8px] font-mono tracking-wider font-bold text-slate-400 uppercase">PARTIES INCLUDED</span>
                      <div className="flex flex-wrap gap-1">
                        {(election.partyIds || []).length > 0 ? election.partyIds?.map(partyId => (
                          <span key={partyId} className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 font-semibold text-[9px] border border-emerald-100 rounded-sm">
                            {getPartyName(partyId)}
                          </span>
                        )) : (
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 font-semibold text-[9px] border border-slate-200 rounded-sm">
                            All existing parties
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1 text-left">
                      <span className="text-[8px] font-mono tracking-wider font-bold text-slate-400 uppercase">BALLOT SEATS GRANTED</span>
                      <div className="flex flex-wrap gap-1">
                        {sortPositionIds(election.positions).map(pid => (
                          <span key={pid} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 font-semibold text-[9px] border border-blue-100 rounded-sm">
                            {getPositionName(pid)} - {Math.max(1, election.positionWinnerSlots?.[pid] || defaultWinnerSlotsForPosition(pid))} slot{Math.max(1, election.positionWinnerSlots?.[pid] || defaultWinnerSlotsForPosition(pid)) === 1 ? "" : "s"}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-4 py-2.5 border-t border-slate-100 mt-2 bg-slate-50/50 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {election.status === "SCHEDULED" && (
                      <button
                        onClick={() => activateElection(election.id)}
                        className="min-h-7 px-2.5 py-1 bg-green-655 bg-green-600 hover:bg-green-500 text-white text-[10px] font-bold rounded border border-green-700 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                      >
                        <Play className="w-3 h-3" />
                        <span>Launch live</span>
                      </button>
                    )}
                    {election.status === "ACTIVE" && (
                      <button
                        onClick={() => closeElection(election.id)}
                        className="min-h-7 px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold rounded border border-red-700 inline-flex items-center gap-1 cursor-pointer animate-pulse whitespace-nowrap"
                      >
                        <Square className="w-3 h-3" />
                        <span>Lock counts</span>
                      </button>
                    )}
                    <button
                      onClick={() => onNavigate(`results-${election.id}`)}
                      className="min-h-7 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold rounded inline-flex items-center gap-1 cursor-pointer transition whitespace-nowrap"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Results & Turnout</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => editElectionOpen(election)}
                      className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 cursor-pointer"
                      title="Edit election"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteElection(election.id)}
                      className="p-1 hover:bg-red-50 rounded text-red-400 hover:text-red-700 cursor-pointer"
                      title="Delete election"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Political Parties Tab */}
      {activeTab === "parties" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {parties.length === 0 ? (
            <p className="col-span-full rounded border border-slate-200 bg-white py-8 text-center text-xs text-slate-400">No political parties created yet.</p>
          ) : filteredParties.length === 0 ? (
            <p className="col-span-full rounded border border-slate-200 bg-white py-8 text-center text-xs text-slate-400">No parties match your search.</p>
          ) : filteredParties.map(party => {
            const memberCount = candidates.filter(candidate => candidate.partyId === party.id).length;
            return (
            <div 
              key={party.id} 
              onClick={() => setSelectedPartyId(party.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedPartyId(party.id);
                }
              }}
              className="bg-white border text-left border-slate-200 rounded overflow-hidden shadow-sm flex flex-col justify-between cursor-pointer hover:border-slate-300 transition"
              style={{ borderTop: `3px solid ${party.color}` }}
            >
              <div className="p-3.5 space-y-2.5">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs uppercase leading-tight">{party.partyName}</h5>
                    <span className="text-[9px] uppercase font-mono tracking-wider text-slate-400 font-bold">{party.acronym}</span>
                  </div>
                  {party.logo ? (
                    <img 
                      src={party.logo} 
                      alt="logo" 
                      className="w-10 h-10 rounded border object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded border bg-slate-50 text-slate-500 flex items-center justify-center shrink-0">
                      <Flag className="w-5 h-5" />
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] text-blue-700 italic font-semibold">"{party.slogan || "Party agenda pending"}"</p>
                  <p className="text-slate-500 text-[11px] leading-snug line-clamp-3">{party.description || "No overview statement submitted."}</p>
                </div>

                <div className="text-[10px] border-t border-slate-100 pt-2">
                  <span className="font-bold text-slate-600">Party Leader: </span>
                  <span className="text-slate-800 font-bold uppercase">{party.leader || "Under review"}</span>
                </div>
                <div className="text-[10px]">
                  <span className="font-bold text-slate-600">Members: </span>
                  <span className="text-slate-800 font-bold">{memberCount} candidate{memberCount === 1 ? "" : "s"}</span>
                </div>
              </div>

              <div className="px-3.5 py-2.5 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-end gap-2">
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    editPartyOpen(party);
                  }}
                  className="min-h-7 px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 rounded-sm inline-flex items-center gap-1 cursor-pointer transition uppercase whitespace-nowrap"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit details</span>
                </button>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    deleteParty(party.id);
                  }}
                  className="min-h-7 px-2.5 py-1 bg-red-50 hover:bg-red-100 border border-red-200 text-[10px] font-bold text-red-700 rounded-sm inline-flex items-center gap-1 cursor-pointer transition uppercase whitespace-nowrap"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Purge</span>
                </button>
              </div>
            </div>
          )})}
        </div>
      )}
      {/* Candidates List Tab */}
      {activeTab === "candidates" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {candidates.length === 0 ? (
            <p className="col-span-full rounded border border-slate-200 bg-white py-8 text-center text-xs text-slate-400">No candidates enlisted yet.</p>
          ) : filteredCandidates.length === 0 ? (
            <p className="col-span-full rounded border border-slate-200 bg-white py-8 text-center text-xs text-slate-400">No candidates match your search.</p>
          ) : filteredCandidates.map(cand => (
            <div key={cand.id} className="bg-white border border-slate-200 rounded overflow-hidden shadow-sm flex flex-col justify-between">
              <div className="p-3.5 space-y-3">
                <div className="flex items-center space-x-3 text-left">
                  {cand.photo ? (
                    <img 
                      src={cand.photo} 
                      alt={cand.fullName} 
                      className="w-14 h-14 rounded border object-cover bg-slate-100 shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded border bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs uppercase leading-tight">{cand.fullName}</h5>
                    <p className="text-[9px] text-blue-600 font-bold tracking-tight font-mono uppercase bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 inline-block mt-0.5">
                      {getPositionName(cand.positionId)}
                    </p>
                    <p className="text-[8px] text-slate-400 font-mono mt-0.5">PLATFORM-ID: {cand.id}</p>
                  </div>
                </div>

                <div className="text-[10px] space-y-1 text-slate-700 bg-slate-50 p-2 border border-slate-200 rounded text-left">
                  <p><span className="font-bold text-slate-600">Party:</span> <span className="font-semibold text-slate-800">{getPartyName(cand.partyId)}</span></p>
                  <p className="text-[10px] italic">"{cand.platformStatement || "Platform agenda statements waiting input"}"</p>
                </div>

                <div className="divide-y divide-slate-105 text-[10px] text-slate-500 text-left">
                  <p className="py-1"><span className="font-bold text-slate-600">Education:</span> {cand.education || "Non specified"}</p>
                  <p className="py-1"><span className="font-bold text-slate-600">Mail contact:</span> {cand.contactInfo || "No email info"}</p>
                </div>
              </div>

              <div className="px-3.5 py-2.5 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-end gap-2">
                <button
                  onClick={() => editCandidateOpen(cand)}
                  className="min-h-7 px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 rounded-sm inline-flex items-center gap-1 cursor-pointer transition uppercase whitespace-nowrap"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Update portfolio</span>
                </button>
                <button
                  onClick={() => deleteCandidate(cand.id)}
                  className="min-h-7 px-2.5 py-1 bg-red-50 hover:bg-red-100 text-[10px] text-red-700 font-bold border border-red-200 hover:border-red-300 rounded-sm cursor-pointer uppercase transition whitespace-nowrap"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Audit Trails log tab */}
      {activeTab === "audit" && (
        <div className="bg-slate-950 text-slate-300 font-mono rounded p-4 border border-slate-800 shadow-xl relative overflow-hidden text-left">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-3">
            <div>
              <p className="text-[8px] font-bold text-slate-500 tracking-wider">SYSTEM CENTRAL VERIFICATION REGISTRY Ledger</p>
              <h4 className="text-[10px] font-bold text-slate-200 uppercase flex items-center mt-0.5">
                <span className="w-1.5 h-1.5 rounded-sm bg-emerald-500 mr-2 animate-pulse shrink-0"></span>
                <span>Audit Logs Ledger</span>
              </h4>
            </div>
            <button 
              onClick={reloadAll}
              className="text-[9px] bg-slate-900 hover:bg-slate-800 text-slate-300 px-2.5 py-1 rounded cursor-pointer transition border border-slate-800 font-bold uppercase"
            >
              Refresh trails
            </button>
          </div>

          <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1 text-[11px] leading-relaxed">
            {auditLogs.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-500">No audit trails recorded yet.</p>
            ) : filteredAuditLogs.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-500">No audit trails match your search.</p>
            ) : filteredAuditLogs.map((log, i) => (
              <div key={log.id || i} className="border-b border-slate-900 pb-2 space-y-0.5">
                <div className="flex flex-col sm:flex-row justify-between text-slate-500 text-[9px]">
                  <span className="text-blue-400 font-semibold uppercase">[{log.action}]</span>
                  <span>{new Date(log.timestamp).toLocaleString()}</span>
                </div>
                <p className="text-slate-300 font-bold">{log.details}</p>
                {log.username && (
                  <div className="text-[9px] text-slate-500 flex justify-between font-mono">
                    <span>OPERATOR: @{log.username} ({log.userId})</span>
                    <span>CLIENT IP: {log.ipAddress || "127.0.0.1"}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {/* Position modal */}
      {showPositionModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded max-w-sm w-full shadow-lg border border-slate-200 p-4 space-y-4 text-left">
            <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-tight">{editingPositionId ? "Edit Electoral Seat" : "Electoral Seat Categories"}</h3>
              <button onClick={() => setShowPositionModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>
            <form onSubmit={submitPosition} className="space-y-3">
              {errorNotice && (
                <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700">
                  {errorNotice}
                </div>
              )}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Official Seat title</label>
                <input 
                  type="text" 
                  required 
                  value={positionName} 
                  onChange={(e) => setPositionName(e.target.value)} 
                  placeholder="e.g. CEO, Auditor, Faculty Rep" 
                  className="w-full px-2 py-1.5 border border-slate-200 rounded focus:outline-none focus:border-slate-400 text-xs font-sans"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Scope description</label>
                <textarea 
                  value={positionDesc} 
                  onChange={(e) => setPositionDesc(e.target.value)} 
                  placeholder="Responsibilities description..." 
                  rows={2}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded focus:outline-none focus:border-slate-400 text-xs font-sans"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Winner slots needed</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  required
                  value={positionWinnerSlots}
                  onChange={(e) => setPositionWinnerSlots(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded focus:outline-none focus:border-slate-400 text-xs font-mono"
                />
                <p className="text-[9px] text-slate-400 leading-snug">Applies to every election using this seat. Results will mark the top candidates up to this number as winners.</p>
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] rounded border border-blue-700 uppercase cursor-pointer transition shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Saving Seat..." : editingPositionId ? "Save Electoral Seat" : "Submit New Electoral Seat"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Party Detail Modal */}
      {selectedParty && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-lg border border-slate-200 text-left">
            <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-4" style={{ borderTop: `4px solid ${selectedParty.color}` }}>
              <div className="flex items-center gap-3 min-w-0">
                {selectedParty.logo ? (
                  <img src={selectedParty.logo} alt="Party logo" className="h-14 w-14 rounded border border-slate-200 object-cover shrink-0" />
                ) : (
                  <div className="h-14 w-14 rounded border border-slate-200 bg-slate-50 text-slate-500 flex items-center justify-center shrink-0">
                    <Flag className="w-6 h-6" />
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-950 uppercase leading-tight">{selectedParty.partyName}</h3>
                  <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">{selectedParty.acronym}</p>
                  <p className="text-[11px] text-blue-700 italic font-semibold mt-1">"{selectedParty.slogan || "Party agenda pending"}"</p>
                </div>
              </div>
              <button onClick={() => setSelectedPartyId(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2 rounded border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400">Party Details</p>
                  <p className="text-xs text-slate-700 leading-relaxed mt-1">{selectedParty.description || "No overview statement submitted."}</p>
                </div>
                <div className="rounded border border-slate-200 bg-white p-3 space-y-2">
                  <div>
                    <p className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400">Leader</p>
                    <p className="text-xs font-bold text-slate-900">{selectedParty.leader || "Under review"}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400">Members</p>
                    <p className="text-xs font-bold text-slate-900">{selectedPartyMembers.length} candidate{selectedPartyMembers.length === 1 ? "" : "s"}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-tight text-slate-950">Party Members</h4>
                  <p className="text-[10px] text-slate-500">Candidates linked to this party are listed here.</p>
                </div>
                <button
                  type="button"
                  onClick={() => openAddPartyMember(selectedParty.id)}
                  className="min-h-8 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white border border-blue-700 text-[10px] font-bold rounded inline-flex items-center gap-1.5 cursor-pointer uppercase shadow-sm"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Add Member
                </button>
              </div>

              {selectedPartyMembers.length === 0 ? (
                <div className="rounded border border-dashed border-slate-200 bg-slate-50 py-8 text-center text-xs text-slate-400">
                  No members are linked to this party yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedPartyMembers.map(member => (
                    <div key={member.id} className="border border-slate-200 rounded bg-white p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {member.photo ? (
                          <img src={member.photo} alt={member.fullName} className="h-12 w-12 rounded border border-slate-200 object-cover shrink-0" />
                        ) : (
                          <div className="h-12 w-12 rounded border border-slate-200 bg-slate-50 text-slate-500 flex items-center justify-center shrink-0">
                            <Users className="w-4 h-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h5 className="text-xs font-bold text-slate-950 truncate">{member.fullName}</h5>
                          <p className="text-[10px] text-blue-600 font-bold uppercase">{getPositionName(member.positionId)}</p>
                          <p className="text-[9px] text-slate-500 truncate">{member.platformStatement || "No platform statement."}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPartyId(null);
                          editCandidateOpen(member);
                        }}
                        className="p-1.5 rounded border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 cursor-pointer"
                        title="Edit member"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Party Modal */}
      {showPartyModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded max-w-md w-full shadow-lg border border-slate-200 p-4 space-y-4 text-left">
            <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-tight">{editingPartyId ? "Edit Party Details" : "Add Political Party"}</h3>
              <button onClick={() => setShowPartyModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>
            <form onSubmit={submitParty} className="space-y-3">
              {errorNotice && (
                <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700">
                  {errorNotice}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Party Name</label>
                  <input type="text" required value={partyName} onChange={(e) => setPartyName(e.target.value)} placeholder="Progressive Party" className="w-full px-2 py-1.5 border border-slate-200 rounded focus:border-slate-400 text-xs font-sans" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Acronym Shortcut</label>
                  <input type="text" required value={partyAcronym} onChange={(e) => setPartyAcronym(e.target.value)} placeholder="PP" className="w-full px-2 py-1.5 border border-slate-200 rounded focus:border-slate-400 text-xs font-sans" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase font-mono block">Brand Color</label>
                <input type="color" value={partyColor} onChange={(e) => setPartyColor(e.target.value)} className="w-12 h-8 border border-slate-200 rounded p-0.5 cursor-pointer" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Party logo upload</label>
                <div className="grid grid-cols-[64px_1fr] gap-3 items-stretch">
                  <div className="h-16 rounded border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
                    {partyLogo ? (
                      <img src={partyLogo} alt="Party logo preview" className="w-full h-full object-cover" />
                    ) : (
                      <Flag className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input
                      id="party-logo-upload"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        handleImageUpload(e.target.files?.[0], "party logo", setPartyLogo, 512);
                        e.currentTarget.value = "";
                      }}
                      className="sr-only"
                    />
                    <label
                      htmlFor="party-logo-upload"
                      className="w-full px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded border border-slate-950 text-[10px] font-bold uppercase cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <ImagePlus className="w-3.5 h-3.5" />
                      Upload logo
                    </label>
                    <button
                      type="button"
                      onClick={() => setPartyLogo("")}
                      className="w-full px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded border border-slate-200 text-[10px] font-bold uppercase cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Clear logo
                    </button>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Slogan</label>
                <input type="text" value={partySlogan} onChange={(e) => setPartySlogan(e.target.value)} placeholder="Ideology Slogan..." className="w-full px-2 py-1.5 border border-slate-200 rounded focus:border-slate-400 text-xs font-sans" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Official Leader Name</label>
                <input type="text" value={partyLeader} onChange={(e) => setPartyLeader(e.target.value)} placeholder="John Doe" className="w-full px-2 py-1.5 border border-slate-200 rounded focus:border-slate-400 text-xs font-sans" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Manifesto Narrative Summary</label>
                <textarea value={partyDescription} onChange={(e) => setPartyDescription(e.target.value)} placeholder="..." rows={2} className="w-full px-2 py-1.5 border border-slate-200 rounded focus:border-slate-400 text-xs font-sans" />
              </div>
              <button type="submit" disabled={loading} className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] rounded border border-slate-950 uppercase cursor-pointer disabled:cursor-not-allowed disabled:opacity-60">
                {loading ? "Saving Party..." : "Save Party Records"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Candidate Modal */}
      {showCandidateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-lg border border-slate-200 p-5 space-y-4 text-left">
            <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-tight">{editingCandidateId ? "Edit Candidate Contestant" : "Enlist Candidate Contestant"}</h3>
              <button onClick={() => setShowCandidateModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>
            <form onSubmit={submitCandidate} className="space-y-3">
              {errorNotice && (
                <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700">
                  {errorNotice}
                </div>
              )}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase font-mono">Applicant Full Name</label>
                <input type="text" required value={candName} onChange={(e) => setCandName(e.target.value)} placeholder="e.g. Alice Cooper" className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs font-sans" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase font-mono">Contested placement</label>
                  <select required value={candPosId} onChange={(e) => setCandPosId(e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs font-sans bg-white">
                    <option value="">Select placement Seat</option>
                    {sortedPositions.map(p => (
                      <option key={p.id} value={p.id}>{p.positionName}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase font-mono">Party link</label>
                  <select value={candPartyId} onChange={(e) => setCandPartyId(e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs font-sans bg-white">
                    <option value="">Independent / None</option>
                    {parties.map(p => (
                      <option key={p.id} value={p.id}>{p.partyName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-600 uppercase font-mono">Candidate photo upload</label>
                <div className="mx-auto grid w-full max-w-[360px] grid-cols-[112px_1fr] gap-3 items-stretch">
                  <div className="h-28 w-28 rounded border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
                    {candPhoto ? (
                      <img
                        src={candPhoto}
                        alt="Candidate preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Users className="w-8 h-8 text-slate-400" />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="space-y-1.5">
                      <input
                        id="candidate-photo-upload"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          handleImageUpload(e.target.files?.[0], "candidate photo", (value) => {
                            setCandPhoto(value);
                            setCandPhotoChanged(true);
                          }, 720);
                          e.currentTarget.value = "";
                        }}
                        className="sr-only"
                      />
                      <label
                        htmlFor="candidate-photo-upload"
                        className="w-full px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded border border-slate-950 text-[10px] font-bold uppercase cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <ImagePlus className="w-3.5 h-3.5" />
                        Upload photo
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setCandPhoto("");
                          setCandPhotoChanged(true);
                        }}
                        className="w-full px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded border border-slate-200 text-[10px] font-bold uppercase cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Remove photo
                      </button>
                      {editingCandidateId && !candPhotoChanged && candPhoto && (
                        <p className="text-[9px] text-slate-500 leading-snug">Current saved photo will stay unless you upload or remove it.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase font-mono">Education Details</label>
                <input type="text" value={candEdu} onChange={(e) => setCandEdu(e.target.value)} placeholder="Ph.D. in Governance" className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs font-sans" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase font-mono">Platform Slogan Statement</label>
                <input type="text" value={candPlatform} onChange={(e) => setCandPlatform(e.target.value)} placeholder="Platform Agenda slogan..." className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs font-sans" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase font-mono">Biography narrative</label>
                <textarea value={candBio} onChange={(e) => setCandBio(e.target.value)} placeholder="Career biography summary detail..." rows={2} className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs font-sans" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase font-mono">Contact Email</label>
                  <input type="text" value={candContact} onChange={(e) => setCandContact(e.target.value)} placeholder="e.g. name@votesystem.com" className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs font-sans" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase font-mono">Social Media handle</label>
                  <input type="text" value={candSocial} onChange={(e) => setCandSocial(e.target.value)} placeholder="Profile link" className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs font-sans" />
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded border border-emerald-700 uppercase cursor-pointer disabled:cursor-not-allowed disabled:opacity-60">
                {loading ? "Saving Candidate..." : editingCandidateId ? "Save Candidate Profile" : "Enlist Contestant Profile"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Election creation Modal */}
      {showElectionModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-lg border border-slate-200 p-5 space-y-4 text-left">
            <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-tight">{editingElectionId ? "Edit Electoral Profile" : "Configure Electoral Profile"}</h3>
              <button onClick={() => setShowElectionModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>
            <form onSubmit={submitElection} className="space-y-3">
              {errorNotice && (
                <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700">
                  {errorNotice}
                </div>
              )}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Electoral Poll Title</label>
                <input type="text" required value={elName} onChange={(e) => setElName(e.target.value)} placeholder="e.g. Executive Board 2026" className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs font-sans" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Electoral overview brief</label>
                <textarea value={elDesc} onChange={(e) => setElDesc(e.target.value)} placeholder="Specify rules directions..." rows={2} className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs font-sans" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Start Time</label>
                  <input type="datetime-local" required value={elStart} onChange={(e) => setElStart(e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-[10px] font-mono bg-slate-50" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Closing Deadline</label>
                  <input type="datetime-local" required value={elEnd} onChange={(e) => setElEnd(e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-[10px] font-mono bg-slate-50" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Banner image upload</label>
                <div className="space-y-2">
                  <div className="h-28 rounded border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
                    {elBanner ? (
                      <img src={elBanner} alt="Election banner preview" className="w-full h-full object-cover" />
                    ) : (
                      <Calendar className="w-8 h-8 text-slate-400" />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      id="election-banner-upload"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        handleImageUpload(e.target.files?.[0], "election banner", setElBanner, 1280);
                        e.currentTarget.value = "";
                      }}
                      className="sr-only"
                    />
                    <label
                      htmlFor="election-banner-upload"
                      className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded border border-slate-950 text-[10px] font-bold uppercase cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <ImagePlus className="w-3.5 h-3.5" />
                      Upload banner
                    </label>
                    <button
                      type="button"
                      onClick={() => setElBanner("")}
                      className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded border border-slate-200 text-[10px] font-bold uppercase cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Clear banner
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase font-mono block">Participating parties</label>
                {parties.length === 0 ? (
                  <p className="text-[10px] text-red-600 font-mono">Create at least one party before configuring an election.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[124px] overflow-y-auto border border-slate-200 p-2 rounded bg-slate-50">
                    {parties.map(party => {
                      const candidateTotal = candidates.filter(candidate => candidate.partyId === party.id).length;
                      return (
                        <label key={party.id} className="flex items-center gap-2 text-[11px] font-sans text-slate-700 select-none cursor-pointer bg-white border border-slate-200 rounded px-2 py-1.5">
                          <input
                            type="checkbox"
                            checked={elSelectedParties.includes(party.id)}
                            onChange={() => toggleElectionPartyMapping(party.id)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="min-w-0">
                            <span className="block font-bold text-slate-900 truncate">{party.partyName}</span>
                            <span className="block text-[9px] text-slate-500">{candidateTotal} candidate{candidateTotal === 1 ? "" : "s"}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Position selector checklist */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase font-mono block">Map contested positions</label>
                {elSelectedParties.length === 0 ? (
                  <p className="text-[10px] text-slate-500 font-mono">Select participating parties first.</p>
                ) : positions.length === 0 ? (
                  <p className="text-[10px] text-red-500 font-mono">You need to create position seat indexes first.</p>
                ) : eligibleElectionPositions.length === 0 ? (
                  <p className="text-[10px] text-amber-700 font-mono">No positions have been configured yet.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-1.5 max-h-[150px] overflow-y-auto border border-slate-200 p-2 rounded bg-slate-50">
                    {eligibleElectionPositions.map(pos => (
                      <div key={pos.id} className="grid grid-cols-[1fr_74px] items-center gap-2 rounded border border-slate-200 bg-white px-2 py-1.5">
                        <label className="flex min-w-0 items-center space-x-1.5 text-[11px] font-sans text-slate-700 select-none cursor-pointer">
                          <input
                            type="checkbox"
                            checked={elSelectedPositions.includes(pos.id)}
                            onChange={() => toggleElectionPositionMapping(pos.id)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="min-w-0">
                            <span className="block truncate font-bold text-slate-800">{pos.positionName}</span>
                            {!positionHasSelectedPartyCandidate(pos.id) && (
                              <span className="block text-[9px] text-amber-600">(no candidates yet)</span>
                            )}
                          </span>
                        </label>
                        <input
                          type="number"
                          min={1}
                          step={1}
                          disabled={!elSelectedPositions.includes(pos.id)}
                          value={elPositionWinnerSlots[pos.id] || defaultWinnerSlotsForPosition(pos.id)}
                          onChange={(event) => setElectionPositionWinnerSlots(pos.id, Number(event.target.value))}
                          className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-center text-[10px] font-mono font-bold text-slate-800 disabled:opacity-40"
                          title="Winner slots for this election"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button type="submit" disabled={loading} className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] rounded border border-blue-700 uppercase cursor-pointer shadow-sm disabled:cursor-not-allowed disabled:opacity-60">
                {loading ? "Saving Election..." : editingElectionId ? "Save Electoral Profile" : "Commit Electoral Profile to Registry"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
