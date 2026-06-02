/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  profilePhoto?: string;
  role: 'SUPER_ADMIN' | 'ELECTION_ADMIN' | 'VOTER';
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Voter {
  id: string;
  userId: string;
  voterIdNumber: string;
  dateOfBirth?: string;
  address?: string;
  phone?: string;
  profilePhoto?: string;
  approved: boolean;
  approvedBy?: string; // User ID of admin
  approvedAt?: string;
  registeredAt: string;
}

export interface Party {
  id: string;
  partyName: string;
  acronym: string;
  logo?: string;
  description?: string;
  slogan?: string;
  leader?: string;
  color: string; // hex code
  createdAt: string;
  updatedAt: string;
}

export interface Position {
  id: string;
  positionName: string;
  description?: string;
  createdAt: string;
}

export interface Election {
  id: string;
  electionName: string;
  description?: string;
  startDate: string;
  endDate: string;
  banner?: string;
  status: 'SCHEDULED' | 'ACTIVE' | 'CLOSED';
  createdBy: string; // User ID
  partyIds?: string[]; // Participating party IDs
  positions: string[]; // List of Position IDs
  createdAt: string;
  updatedAt: string;
}

export interface Candidate {
  id: string;
  fullName: string;
  partyId?: string; // empty if Independent
  positionId: string;
  photo?: string;
  poster?: string;
  biography?: string;
  platformStatement?: string;
  achievements?: string;
  education?: string;
  contactInfo?: string;
  socialMediaLinks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Vote {
  id: string;
  voterId: string;
  candidateId: string;
  electionId: string;
  positionId: string;
  timestamp: string;
  ipAddress?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  userId?: string;
  username?: string;
  details: string;
  ipAddress?: string;
  timestamp: string;
}

export interface ElectionResult {
  candidateId: string;
  candidateName: string;
  partyName: string;
  partyColor: string;
  voteCount: number;
  percentage: number;
}

export interface PositionResult {
  positionId: string;
  positionName: string;
  totalVotes: number;
  candidates: ElectionResult[];
}
