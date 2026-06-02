package com.example.voting.controller;

import com.example.voting.model.AuditLog;
import com.example.voting.model.Candidate;
import com.example.voting.model.Database;
import com.example.voting.model.Election;
import com.example.voting.model.Party;
import com.example.voting.model.Position;
import com.example.voting.model.User;
import com.example.voting.model.Vote;
import com.example.voting.model.Voter;
import com.example.voting.service.DatabaseStore;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@CrossOrigin(originPatterns = "*")
@RestController
@RequestMapping("/api")
public class VotingController {
  private final DatabaseStore store;

  public VotingController(DatabaseStore store) {
    this.store = store;
  }

  @PostMapping("/auth/login")
  ResponseEntity<?> login(@RequestBody Map<String, Object> body, HttpServletRequest request) {
    Database db = store.load();
    String username = str(body.get("username"));
    String password = str(body.get("password"));
    if (blank(username) || blank(password)) return error(HttpStatus.BAD_REQUEST, "Username and password are required");

    User user = db.users.stream().filter(u -> u.username.equalsIgnoreCase(username)).findFirst().orElse(null);
    if (user == null || !password.equals(db.passwords.get(user.id))) return error(HttpStatus.UNAUTHORIZED, "Invalid username or password");
    if (!user.enabled) return error(HttpStatus.FORBIDDEN, "Account is disabled");

    Voter voter = "VOTER".equals(user.role) ? findVoterByUserId(db, user.id).orElse(null) : null;
    log(db, "USER_LOGIN", user.id, user.username, "Successful login for user: " + user.username, ip(request));
    store.insertAuditLog(db.auditLogs.get(0));

    Map<String, Object> response = new LinkedHashMap<>();
    response.put("token", "mock-jwt-token-" + user.id + "-" + System.currentTimeMillis());
    response.put("user", user);
    if (voter != null) {
      response.put("voter", voter);
    }
    return ResponseEntity.ok(response);
  }

  @PostMapping("/auth/register")
  ResponseEntity<?> register(@RequestBody Map<String, Object> body, HttpServletRequest request) {
    String username = str(body.get("username"));
    String email = str(body.get("email"));
    String fullName = str(body.get("fullName"));
    String password = str(body.get("password"));
    String voterId = str(body.get("voterId"));

    if (blank(username) || blank(email) || blank(fullName) || blank(password)) return error(HttpStatus.BAD_REQUEST, "Required fields are missing");
    if (store.usernameExists(username)) return error(HttpStatus.BAD_REQUEST, "Username already exists");
    if (store.emailExists(email)) return error(HttpStatus.BAD_REQUEST, "Email already exists");
    if (blank(voterId)) voterId = generateVoterId();
    if (store.voterIdExists(voterId)) return error(HttpStatus.BAD_REQUEST, "Voter ID Number has already been registered");

    String now = now();
    String profilePhoto = orDefault(str(body.get("profilePhoto")), "");
    User user = new User("u_" + id(), username, email, fullName, profilePhoto, "VOTER", true, now, now);
    Voter voter = new Voter();
    voter.id = "v_" + id();
    voter.userId = user.id;
    voter.voterIdNumber = voterId;
    voter.phone = str(body.get("phone"));
    voter.address = str(body.get("address"));
    voter.profilePhoto = profilePhoto;
    voter.approved = false;
    voter.registeredAt = now;

    AuditLog auditLog = new AuditLog("lg_" + id(), "USER_REGISTRATION", user.id, username, "Voter registered under username " + username + ", waiting for approval.", ip(request), now());
    store.insertRegisteredVoter(user, password, voter, auditLog);

    return ResponseEntity.ok(Map.of("success", true, "message", "Registration successful! Please wait for administration approval.", "user", user, "voter", voter));
  }

  @GetMapping("/admin/audit-logs")
  List<AuditLog> auditLogs() {
    return store.load().auditLogs;
  }

  @PutMapping("/profile")
  ResponseEntity<?> updateProfile(@RequestHeader(value = "x-user-id", required = false) String userId, @RequestBody Map<String, Object> body) {
    Database db = store.load();
    if (blank(userId)) return error(HttpStatus.UNAUTHORIZED, "Unauthorized access");
    User user = findUser(db, userId).orElse(null);
    if (user == null) return error(HttpStatus.NOT_FOUND, "User profile not found");

    String fullName = str(body.get("fullName"));
    String email = str(body.get("email"));
    if (!blank(email) && db.users.stream().anyMatch(u -> !u.id.equals(userId) && u.email.equalsIgnoreCase(email))) {
      return error(HttpStatus.BAD_REQUEST, "Email already exists");
    }

    if (!blank(fullName)) user.fullName = fullName;
    if (!blank(email)) user.email = email;
    if (body.containsKey("profilePhoto")) user.profilePhoto = orDefault(str(body.get("profilePhoto")), "");
    user.updatedAt = now();

    Voter voter = findVoterByUserId(db, userId).orElse(null);
    if (voter != null && body.containsKey("profilePhoto")) {
      voter.profilePhoto = user.profilePhoto;
    }

    store.save(db);

    Map<String, Object> response = new LinkedHashMap<>();
    response.put("user", user);
    if (voter != null) response.put("voter", voter);
    return ResponseEntity.ok(response);
  }

  @PutMapping("/profile/password")
  ResponseEntity<?> updatePassword(@RequestHeader(value = "x-user-id", required = false) String userId, @RequestBody Map<String, Object> body) {
    Database db = store.load();
    if (blank(userId)) return error(HttpStatus.UNAUTHORIZED, "Unauthorized access");
    User user = findUser(db, userId).orElse(null);
    if (user == null) return error(HttpStatus.NOT_FOUND, "User profile not found");

    String currentPassword = str(body.get("currentPassword"));
    String newPassword = str(body.get("newPassword"));
    if (blank(currentPassword) || blank(newPassword)) return error(HttpStatus.BAD_REQUEST, "Current and new password are required");
    if (!currentPassword.equals(db.passwords.get(userId))) return error(HttpStatus.BAD_REQUEST, "Current password is incorrect");
    if (newPassword.length() < 6) return error(HttpStatus.BAD_REQUEST, "New password must be at least 6 characters");

    db.passwords.put(userId, newPassword);
    user.updatedAt = now();
    store.save(db);
    return ResponseEntity.ok(Map.of("success", true));
  }

  @GetMapping("/admin/metrics")
  Map<String, Object> metrics() {
    Database db = store.load();
    return Map.of(
        "totalVoters", db.voters.size(),
        "totalCandidates", db.candidates.size(),
        "totalParties", db.parties.size(),
        "activeElections", db.elections.stream().filter(e -> "ACTIVE".equals(e.status)).count(),
        "totalVotes", db.votes.size(),
        "pendingVoters", db.voters.stream().filter(v -> !v.approved).count()
    );
  }

  @GetMapping("/admin/voters")
  List<Map<String, Object>> voters() {
    Database db = store.load();
    return db.voters.stream().map(voter -> {
      Map<String, Object> item = objectMap(voter);
      findUser(db, voter.userId).ifPresent(user -> item.put("user", user));
      return item;
    }).toList();
  }

  @PostMapping("/admin/voters/{id}/approve")
  ResponseEntity<?> approveVoter(@PathVariable String id, @RequestHeader(value = "x-admin-id", defaultValue = "u_sa") String adminId, HttpServletRequest request) {
    Database db = store.load();
    Voter voter = findVoter(db, id).orElse(null);
    if (voter == null) return error(HttpStatus.NOT_FOUND, "Voter profile not found");
    voter.approved = true;
    voter.approvedBy = adminId;
    voter.approvedAt = now();
    log(db, "APPROVE_VOTER", adminId, userName(db, adminId), "Approved voter: " + voter.voterIdNumber, ip(request));
    store.save(db);
    return ResponseEntity.ok(Map.of("success", true, "voter", voter));
  }

  @PostMapping("/admin/voters/{id}/suspend")
  ResponseEntity<?> suspendVoter(@PathVariable String id, @RequestHeader(value = "x-admin-id", defaultValue = "u_sa") String adminId, HttpServletRequest request) {
    Database db = store.load();
    Voter voter = findVoter(db, id).orElse(null);
    if (voter == null) return error(HttpStatus.NOT_FOUND, "Voter profile not found");
    voter.approved = false;
    voter.approvedBy = null;
    voter.approvedAt = null;
    log(db, "SUSPEND_VOTER", adminId, userName(db, adminId), "Suspended voter: " + voter.voterIdNumber, ip(request));
    store.save(db);
    return ResponseEntity.ok(Map.of("success", true, "voter", voter));
  }

  @DeleteMapping("/admin/voters/{id}")
  ResponseEntity<?> deleteVoter(@PathVariable String id) {
    Database db = store.load();
    Voter voter = findVoter(db, id).orElse(null);
    if (voter == null) return error(HttpStatus.NOT_FOUND, "Voter list profile not found");
    db.voters.removeIf(v -> v.id.equals(id));
    db.users.removeIf(u -> u.id.equals(voter.userId));
    db.passwords.remove(voter.userId);
    store.save(db);
    return ResponseEntity.ok(Map.of("success", true));
  }

  @GetMapping("/admin/parties")
  List<Party> parties() {
    return store.load().parties;
  }

  @PostMapping("/admin/parties")
  ResponseEntity<?> createParty(@RequestBody Party body, @RequestHeader(value = "x-admin-id", defaultValue = "u_sa") String adminId, HttpServletRequest request) {
    Database db = store.load();
    if (blank(body.partyName) || blank(body.acronym)) return error(HttpStatus.BAD_REQUEST, "Party name and acronym are required");
    if (db.parties.stream().anyMatch(p -> p.partyName.equalsIgnoreCase(body.partyName))) return error(HttpStatus.BAD_REQUEST, "Party Name is already in use");
    if (db.parties.stream().anyMatch(p -> p.acronym.equalsIgnoreCase(body.acronym))) return error(HttpStatus.BAD_REQUEST, "Acronym is already in use");
    String now = now();
    body.id = "pt_" + id();
    body.logo = orDefault(body.logo, "");
    body.color = orDefault(body.color, "#3b82f6");
    body.createdAt = now;
    body.updatedAt = now;
    db.parties.add(body);
    log(db, "CREATE_PARTY", adminId, userName(db, adminId), "Created party: " + body.partyName + " (" + body.acronym + ")", ip(request));
    store.insertParty(body);
    store.insertAuditLog(db.auditLogs.get(0));
    return ResponseEntity.ok(body);
  }

  @PutMapping("/admin/parties/{id}")
  ResponseEntity<?> updateParty(@PathVariable String id, @RequestBody Party body) {
    Database db = store.load();
    Party party = db.parties.stream().filter(p -> p.id.equals(id)).findFirst().orElse(null);
    if (party == null) return error(HttpStatus.NOT_FOUND, "Party not found");
    if (!blank(body.partyName) && db.parties.stream().anyMatch(p -> !p.id.equals(id) && p.partyName.equalsIgnoreCase(body.partyName))) return error(HttpStatus.BAD_REQUEST, "Party Name is already in use");
    if (!blank(body.acronym) && db.parties.stream().anyMatch(p -> !p.id.equals(id) && p.acronym.equalsIgnoreCase(body.acronym))) return error(HttpStatus.BAD_REQUEST, "Acronym is already in use");
    if (!blank(body.partyName)) party.partyName = body.partyName;
    if (!blank(body.acronym)) party.acronym = body.acronym;
    if (body.logo != null) party.logo = body.logo;
    if (body.description != null) party.description = body.description;
    if (body.slogan != null) party.slogan = body.slogan;
    if (body.leader != null) party.leader = body.leader;
    if (!blank(body.color)) party.color = body.color;
    party.updatedAt = now();
    store.updateParty(party);
    return ResponseEntity.ok(party);
  }

  @DeleteMapping("/admin/parties/{id}")
  ResponseEntity<?> deleteParty(@PathVariable String id, @RequestHeader(value = "x-admin-id", defaultValue = "u_sa") String adminId, HttpServletRequest request) {
    Database db = store.load();
    Party party = db.parties.stream().filter(p -> p.id.equals(id)).findFirst().orElse(null);
    if (party == null) return error(HttpStatus.NOT_FOUND, "Party not found");
    log(db, "DELETE_PARTY", adminId, userName(db, adminId), "Deleted party: " + party.partyName, ip(request));
    store.deleteParty(id);
    store.insertAuditLog(db.auditLogs.get(0));
    return ResponseEntity.ok(Map.of("success", true));
  }

  @GetMapping("/admin/positions")
  List<Position> positions() {
    return store.load().positions;
  }

  @PostMapping("/admin/positions")
  ResponseEntity<?> createPosition(@RequestBody Position body) {
    Database db = store.load();
    if (blank(body.positionName)) return error(HttpStatus.BAD_REQUEST, "Position Name is required");
    if (db.positions.stream().anyMatch(p -> p.positionName.equalsIgnoreCase(body.positionName))) return error(HttpStatus.BAD_REQUEST, "Position Name already exists");
    body.id = "p_" + id();
    body.winnerSlots = normalizeWinnerSlots(body.winnerSlots);
    body.createdAt = now();
    db.positions.add(body);
    store.save(db);
    return ResponseEntity.ok(body);
  }

  @PutMapping("/admin/positions/{id}")
  ResponseEntity<?> updatePosition(@PathVariable String id, @RequestBody Position body) {
    Database db = store.load();
    Position position = db.positions.stream().filter(p -> p.id.equals(id)).findFirst().orElse(null);
    if (position == null) return error(HttpStatus.NOT_FOUND, "Position not found");
    if (!blank(body.positionName) && db.positions.stream().anyMatch(p -> !p.id.equals(id) && p.positionName.equalsIgnoreCase(body.positionName))) {
      return error(HttpStatus.BAD_REQUEST, "Position Name already exists");
    }
    if (!blank(body.positionName)) position.positionName = body.positionName;
    if (body.description != null) position.description = body.description;
    if (body.winnerSlots > 0) position.winnerSlots = normalizeWinnerSlots(body.winnerSlots);
    store.save(db);
    return ResponseEntity.ok(position);
  }

  @DeleteMapping("/admin/positions/{id}")
  ResponseEntity<?> deletePosition(@PathVariable String id) {
    Database db = store.load();
    if (db.positions.stream().noneMatch(p -> p.id.equals(id))) return error(HttpStatus.NOT_FOUND, "Position not found");
    db.positions.removeIf(p -> p.id.equals(id));
    db.candidates.removeIf(c -> id.equals(c.positionId));
    db.elections.forEach(e -> {
      if (e.positions != null) e.positions.removeIf(positionId -> positionId.equals(id));
    });
    store.save(db);
    return ResponseEntity.ok(Map.of("success", true));
  }

  @GetMapping("/admin/candidates")
  List<Candidate> candidates() {
    return store.load().candidates;
  }

  @PostMapping("/admin/candidates")
  ResponseEntity<?> createCandidate(@RequestBody Map<String, Object> body, @RequestHeader(value = "x-admin-id", defaultValue = "u_sa") String adminId, HttpServletRequest request) {
    Database db = store.load();
    String fullName = str(body.get("fullName"));
    String partyId = str(body.get("partyId"));
    String positionId = str(body.get("positionId"));
    if (blank(fullName) || blank(positionId)) return error(HttpStatus.BAD_REQUEST, "Full Name and Position are required");
    if (db.positions.stream().noneMatch(p -> p.id.equals(positionId))) return error(HttpStatus.BAD_REQUEST, "Select an existing position for this candidate");
    if (!blank(partyId) && db.parties.stream().noneMatch(p -> p.id.equals(partyId))) return error(HttpStatus.BAD_REQUEST, "Select an existing party for this candidate");
    String now = now();
    Candidate candidate = new Candidate();
    applyCandidateBody(candidate, body);
    candidate.id = "c_" + id();
    candidate.partyId = blank(candidate.partyId) ? null : candidate.partyId;
    candidate.photo = orDefault(candidate.photo, "");
    candidate.poster = orDefault(candidate.poster, "");
    candidate.createdAt = now;
    candidate.updatedAt = now;
    db.candidates.add(candidate);
    log(db, "CREATE_CANDIDATE", adminId, userName(db, adminId), "Added candidate: " + candidate.fullName, ip(request));
    store.save(db);
    return ResponseEntity.ok(candidate);
  }

  @PutMapping("/admin/candidates/{id}")
  ResponseEntity<?> updateCandidate(@PathVariable String id, @RequestBody Map<String, Object> body) {
    Database db = store.load();
    Candidate candidate = db.candidates.stream().filter(c -> c.id.equals(id)).findFirst().orElse(null);
    if (candidate == null) return error(HttpStatus.NOT_FOUND, "Candidate not found");
    String fullName = str(body.get("fullName"));
    String partyId = str(body.get("partyId"));
    String positionId = str(body.get("positionId"));
    if (blank(fullName) || blank(positionId)) return error(HttpStatus.BAD_REQUEST, "Full Name and Position are required");
    if (db.positions.stream().noneMatch(p -> p.id.equals(positionId))) return error(HttpStatus.BAD_REQUEST, "Select an existing position for this candidate");
    if (!blank(partyId) && db.parties.stream().noneMatch(p -> p.id.equals(partyId))) return error(HttpStatus.BAD_REQUEST, "Select an existing party for this candidate");
    applyCandidateBody(candidate, body);
    candidate.partyId = blank(candidate.partyId) ? null : candidate.partyId;
    candidate.updatedAt = now();
    store.save(db);
    return ResponseEntity.ok(candidate);
  }

  @DeleteMapping("/admin/candidates/{id}")
  ResponseEntity<?> deleteCandidate(@PathVariable String id, @RequestHeader(value = "x-admin-id", defaultValue = "u_sa") String adminId, HttpServletRequest request) {
    Database db = store.load();
    Candidate candidate = db.candidates.stream().filter(c -> c.id.equals(id)).findFirst().orElse(null);
    if (candidate == null) return error(HttpStatus.NOT_FOUND, "Candidate not found");
    db.candidates.removeIf(c -> c.id.equals(id));
    log(db, "DELETE_CANDIDATE", adminId, userName(db, adminId), "Deleted candidate: " + candidate.fullName, ip(request));
    store.save(db);
    return ResponseEntity.ok(Map.of("success", true));
  }

  @GetMapping("/admin/elections")
  List<Election> elections() {
    return store.load().elections;
  }

  @PostMapping("/admin/elections")
  ResponseEntity<?> createElection(@RequestBody Election body, @RequestHeader(value = "x-admin-id", defaultValue = "u_sa") String adminId, HttpServletRequest request) {
    Database db = store.load();
    if (blank(body.electionName) || blank(body.startDate) || blank(body.endDate) || body.partyIds == null || body.partyIds.isEmpty() || body.positions == null || body.positions.isEmpty()) return error(HttpStatus.BAD_REQUEST, "Election name, bounds, participating parties, and mapped positions are required");
    List<String> validPartyIds = body.partyIds.stream().filter(partyId -> db.parties.stream().anyMatch(p -> p.id.equals(partyId))).distinct().toList();
    if (validPartyIds.isEmpty()) return error(HttpStatus.BAD_REQUEST, "Select at least one existing party for this election");
    List<String> validPositionIds = body.positions.stream()
        .filter(positionId -> db.positions.stream().anyMatch(p -> p.id.equals(positionId)))
        .distinct()
        .toList();
    if (validPositionIds.isEmpty()) return error(HttpStatus.BAD_REQUEST, "Select at least one existing position for this election");
    String now = now();
    body.id = "el_" + id();
    body.partyIds = validPartyIds;
    body.positions = validPositionIds;
    body.positionWinnerSlots = normalizedElectionWinnerSlots(db, body, validPositionIds);
    body.banner = orDefault(body.banner, "");
    body.status = "SCHEDULED";
    body.createdBy = adminId;
    body.createdAt = now;
    body.updatedAt = now;
    db.elections.add(body);
    log(db, "CREATE_ELECTION", adminId, userName(db, adminId), "Created election profile: " + body.electionName, ip(request));
    store.save(db);
    return ResponseEntity.ok(body);
  }

  @PutMapping("/admin/elections/{id}")
  ResponseEntity<?> updateElection(@PathVariable String id, @RequestBody Election body, @RequestHeader(value = "x-admin-id", defaultValue = "u_sa") String adminId, HttpServletRequest request) {
    Database db = store.load();
    Election election = db.elections.stream().filter(e -> e.id.equals(id)).findFirst().orElse(null);
    if (election == null) return error(HttpStatus.NOT_FOUND, "Election not found");
    if (blank(body.electionName) || blank(body.startDate) || blank(body.endDate) || body.partyIds == null || body.partyIds.isEmpty() || body.positions == null || body.positions.isEmpty()) {
      return error(HttpStatus.BAD_REQUEST, "Election name, bounds, participating parties, and mapped positions are required");
    }
    List<String> validPartyIds = body.partyIds.stream().filter(partyId -> db.parties.stream().anyMatch(p -> p.id.equals(partyId))).distinct().toList();
    if (validPartyIds.isEmpty()) return error(HttpStatus.BAD_REQUEST, "Select at least one existing party for this election");
    List<String> validPositionIds = body.positions.stream()
        .filter(positionId -> db.positions.stream().anyMatch(p -> p.id.equals(positionId)))
        .distinct()
        .toList();
    if (validPositionIds.isEmpty()) return error(HttpStatus.BAD_REQUEST, "Select at least one existing position for this election");

    election.electionName = body.electionName;
    election.description = body.description;
    election.startDate = body.startDate;
    election.endDate = body.endDate;
    election.banner = orDefault(body.banner, "");
    election.partyIds = validPartyIds;
    election.positions = validPositionIds;
    election.positionWinnerSlots = normalizedElectionWinnerSlots(db, body, validPositionIds);
    election.updatedAt = now();
    log(db, "UPDATE_ELECTION", adminId, userName(db, adminId), "Updated election profile: " + election.electionName, ip(request));
    store.save(db);
    return ResponseEntity.ok(election);
  }

  @PostMapping("/admin/elections/{id}/activate")
  ResponseEntity<?> activateElection(@PathVariable String id, @RequestHeader(value = "x-admin-id", defaultValue = "u_sa") String adminId, HttpServletRequest request) {
    return setElectionStatus(id, "ACTIVE", "ACTIVATE_ELECTION", "Activated election: ", adminId, request);
  }

  @PostMapping("/admin/elections/{id}/close")
  ResponseEntity<?> closeElection(@PathVariable String id, @RequestHeader(value = "x-admin-id", defaultValue = "u_sa") String adminId, HttpServletRequest request) {
    return setElectionStatus(id, "CLOSED", "CLOSE_ELECTION", "Closed election results collection: ", adminId, request);
  }

  @DeleteMapping("/admin/elections/{id}")
  ResponseEntity<?> deleteElection(@PathVariable String id, @RequestHeader(value = "x-admin-id", defaultValue = "u_sa") String adminId, HttpServletRequest request) {
    Database db = store.load();
    Election election = db.elections.stream().filter(e -> e.id.equals(id)).findFirst().orElse(null);
    if (election == null) return error(HttpStatus.NOT_FOUND, "Election not found");
    db.elections.removeIf(e -> e.id.equals(id));
    log(db, "DELETE_ELECTION", adminId, userName(db, adminId), "Deleted election profile: " + election.electionName, ip(request));
    store.save(db);
    return ResponseEntity.ok(Map.of("success", true));
  }

  @GetMapping("/voter/dashboard-data")
  ResponseEntity<?> voterDashboard(@RequestHeader(value = "x-user-id", required = false) String userId) {
    Database db = store.load();
    if (blank(userId)) return error(HttpStatus.UNAUTHORIZED, "Unauthorized access");
    Voter voter = findVoterByUserId(db, userId).orElse(null);
    if (voter == null) return error(HttpStatus.NOT_FOUND, "Voter details not found");
    List<Election> activeElections = db.elections.stream().filter(e -> "ACTIVE".equals(e.status)).toList();
    List<Map<String, Object>> votingHistory = db.votes.stream().filter(v -> v.voterId.equals(voter.id)).map(vote -> {
      Map<String, Object> item = objectMap(vote);
      db.elections.stream().filter(e -> e.id.equals(vote.electionId)).findFirst().ifPresent(e -> item.put("election", e));
      db.positions.stream().filter(p -> p.id.equals(vote.positionId)).findFirst().ifPresent(p -> item.put("position", p));
      db.candidates.stream().filter(c -> c.id.equals(vote.candidateId)).findFirst().ifPresent(c -> item.put("candidate", c));
      return item;
    }).toList();
    return ResponseEntity.ok(Map.of("voter", voter, "activeElections", activeElections, "votingHistory", votingHistory));
  }

  @GetMapping("/voter/elections/{id}")
  ResponseEntity<?> voterElection(@PathVariable String id, @RequestHeader(value = "x-user-id", required = false) String userId) {
    Database db = store.load();
    Election election = db.elections.stream().filter(e -> e.id.equals(id)).findFirst().orElse(null);
    if (election == null) return error(HttpStatus.NOT_FOUND, "Election not found");
    Voter voter = findVoterByUserId(db, userId).orElse(null);
    if (voter == null) return error(HttpStatus.FORBIDDEN, "Voter profile verified status missing");
    List<Map<String, Object>> positions = sortedElectionPositionIds(db, election).stream().map(posId -> {
      Position position = db.positions.stream().filter(p -> p.id.equals(posId)).findFirst().orElse(null);
      if (position == null) return null;
      Map<String, Object> item = objectMap(position);
      item.put("winnerSlots", winnerSlotsForElectionPosition(db, election, posId));
      item.put("voted", db.votes.stream().anyMatch(v -> v.voterId.equals(voter.id) && v.electionId.equals(id) && v.positionId.equals(posId)));
      List<Map<String, Object>> candidates = db.candidates.stream()
          .filter(c -> c.positionId.equals(posId))
          .filter(c -> candidateBelongsToElectionParty(election, c))
          .map(candidate -> {
            Map<String, Object> candidateItem = objectMap(candidate);
            db.parties.stream().filter(p -> p.id.equals(candidate.partyId)).findFirst().ifPresent(p -> candidateItem.put("party", p));
            return candidateItem;
          }).toList();
      item.put("candidates", candidates);
      return item;
    }).filter(item -> item != null).toList();
    return ResponseEntity.ok(Map.of("election", election, "positions", positions, "voterApproved", voter.approved));
  }

  @GetMapping("/voter/elections/{id}/position/{posId}")
  ResponseEntity<?> electionPosition(@PathVariable String id, @PathVariable String posId) {
    Database db = store.load();
    Election election = db.elections.stream().filter(e -> e.id.equals(id)).findFirst().orElse(null);
    if (election == null) return error(HttpStatus.NOT_FOUND, "Election not found");
    Position position = db.positions.stream().filter(p -> p.id.equals(posId)).findFirst().orElse(null);
    if (position == null) return error(HttpStatus.NOT_FOUND, "Position not found");
    List<Map<String, Object>> candidates = db.candidates.stream()
        .filter(c -> c.positionId.equals(posId))
        .filter(c -> candidateBelongsToElectionParty(election, c))
        .map(candidate -> {
      Map<String, Object> item = objectMap(candidate);
      db.parties.stream().filter(p -> p.id.equals(candidate.partyId)).findFirst().ifPresent(p -> item.put("party", p));
      return item;
    }).toList();
    return ResponseEntity.ok(Map.of("election", election, "position", position, "candidates", candidates));
  }

  @PostMapping("/voter/vote")
  ResponseEntity<?> castVote(@RequestHeader(value = "x-user-id", required = false) String userId, @RequestBody Map<String, Object> body, HttpServletRequest request) {
    Database db = store.load();
    String electionId = str(body.get("electionId"));
    String positionId = str(body.get("positionId"));
    String candidateId = str(body.get("candidateId"));
    if (blank(userId) || blank(electionId) || blank(positionId) || blank(candidateId)) return error(HttpStatus.BAD_REQUEST, "Mandatory fields to record vote are missing");
    Voter voter = findVoterByUserId(db, userId).orElse(null);
    if (voter == null) return error(HttpStatus.FORBIDDEN, "Logged in user does not own a voter identity");
    if (!voter.approved) return error(HttpStatus.FORBIDDEN, "Your voter card registration is pending administrator approval.");
    Election election = db.elections.stream().filter(e -> e.id.equals(electionId)).findFirst().orElse(null);
    if (election == null || !"ACTIVE".equals(election.status)) return error(HttpStatus.BAD_REQUEST, "This election is not currently active for vote submission");
    if (db.votes.stream().anyMatch(v -> v.voterId.equals(voter.id) && v.electionId.equals(electionId) && v.positionId.equals(positionId))) return error(HttpStatus.BAD_REQUEST, "Our system has already recorded a choice for this electoral seat.");
    Candidate candidate = db.candidates.stream().filter(c -> c.id.equals(candidateId)).findFirst().orElse(null);
    if (candidate == null || !positionId.equals(candidate.positionId)) return error(HttpStatus.BAD_REQUEST, "Candidate selected is invalid for this seat placement");
    List<String> orderedPositionIds = sortedElectionPositionIds(db, election);
    if (!orderedPositionIds.contains(positionId)) return error(HttpStatus.BAD_REQUEST, "This position is not mapped to the selected election");
    if (!candidateBelongsToElectionParty(election, candidate)) return error(HttpStatus.BAD_REQUEST, "Candidate selected is not part of a participating party for this election");
    Vote vote = new Vote("vt_" + id(), voter.id, candidateId, electionId, positionId, now(), ip(request));
    AuditLog auditLog = new AuditLog("lg_" + id(), "CAST_VOTE", userId, userName(db, userId), "Success vote on position " + positionId + " in election " + electionId, ip(request), now());
    store.insertVoteWithAuditLog(vote, auditLog);
    return ResponseEntity.ok(Map.of("success", true, "message", "Your ballot choice was signed and recorded in our system. Thank you!"));
  }

  @GetMapping("/results/{electionId}")
  ResponseEntity<?> results(@PathVariable String electionId) {
    Database db = store.load();
    Election election = db.elections.stream().filter(e -> e.id.equals(electionId)).findFirst().orElse(null);
    if (election == null) return error(HttpStatus.NOT_FOUND, "Election not found");
    List<Vote> votes = db.votes.stream()
        .filter(v -> v.electionId.equals(electionId))
        .filter(v -> voteBelongsToElectionCandidate(db, election, v))
        .toList();
    int approvedVoters = (int) db.voters.stream().filter(v -> v.approved).count();
    int participation = new HashSet<>(votes.stream().map(v -> v.voterId).toList()).size();
    double turnout = approvedVoters > 0 ? participation * 100.0 / approvedVoters : 0;
    List<Map<String, Object>> positions = sortedElectionPositionIds(db, election).stream().map(posId -> resultForPosition(db, election, votes, posId)).filter(item -> item != null).toList();
    return ResponseEntity.ok(Map.of("election", election, "totalVotes", votes.size(), "registeredVotersCount", approvedVoters, "participationCount", participation, "turnoutPercentage", oneDecimal(turnout), "positions", positions));
  }

  @GetMapping("/health")
  Map<String, String> health() {
    return Map.of("status", "healthy", "host", "spring-boot-mysql");
  }

  private ResponseEntity<?> setElectionStatus(String id, String status, String action, String detailsPrefix, String adminId, HttpServletRequest request) {
    Database db = store.load();
    Election election = db.elections.stream().filter(e -> e.id.equals(id)).findFirst().orElse(null);
    if (election == null) return error(HttpStatus.NOT_FOUND, "Election not found");
    election.status = status;
    election.updatedAt = now();
    log(db, action, adminId, userName(db, adminId), detailsPrefix + election.electionName, ip(request));
    store.save(db);
    return ResponseEntity.ok(Map.of("success", true, "election", election));
  }

  private static void applyCandidateBody(Candidate candidate, Map<String, Object> body) {
    String fullName = str(body.get("fullName"));
    String partyId = str(body.get("partyId"));
    String positionId = str(body.get("positionId"));
    if (!blank(fullName)) candidate.fullName = fullName;
    candidate.partyId = blank(partyId) ? null : partyId;
    if (!blank(positionId)) candidate.positionId = positionId;
    if (body.containsKey("photo")) candidate.photo = orDefault(str(body.get("photo")), "");
    if (body.containsKey("poster")) candidate.poster = orDefault(str(body.get("poster")), "");
    if (body.containsKey("biography")) candidate.biography = str(body.get("biography"));
    if (body.containsKey("platformStatement")) candidate.platformStatement = str(body.get("platformStatement"));
    if (body.containsKey("achievements")) candidate.achievements = str(body.get("achievements"));
    if (body.containsKey("education")) candidate.education = str(body.get("education"));
    if (body.containsKey("contactInfo")) candidate.contactInfo = str(body.get("contactInfo"));
    if (body.containsKey("socialMediaLinks")) candidate.socialMediaLinks = str(body.get("socialMediaLinks"));
  }

  private Map<String, Object> resultForPosition(Database db, Election election, List<Vote> electionVotes, String posId) {
    Position position = db.positions.stream().filter(p -> p.id.equals(posId)).findFirst().orElse(null);
    if (position == null) return null;
    List<Vote> positionVotes = electionVotes.stream().filter(v -> v.positionId.equals(posId)).toList();
    List<Map<String, Object>> candidates = db.candidates.stream()
        .filter(c -> c.positionId.equals(posId))
        .filter(c -> candidateBelongsToElectionParty(election, c))
        .map(candidate -> {
      Party party = db.parties.stream().filter(p -> p.id.equals(candidate.partyId)).findFirst().orElse(null);
      int count = (int) positionVotes.stream().filter(v -> v.candidateId.equals(candidate.id)).count();
      double pct = positionVotes.isEmpty() ? 0 : count * 100.0 / positionVotes.size();
      Map<String, Object> item = new LinkedHashMap<>();
      item.put("candidateId", candidate.id);
      item.put("candidateName", candidate.fullName);
      item.put("partyName", party == null ? "Independent" : party.partyName);
      item.put("partyColor", party == null ? "#6c757d" : party.color);
      item.put("voteCount", count);
      item.put("percentage", oneDecimal(pct));
      return item;
    }).sorted(Comparator.comparingInt((Map<String, Object> item) -> (Integer) item.get("voteCount")).reversed()).toList();
    int winnerSlots = winnerSlotsForElectionPosition(db, election, posId);
    return Map.of("positionId", posId, "positionName", position.positionName, "winnerSlots", winnerSlots, "totalVotes", positionVotes.size(), "candidates", candidates);
  }

  private static boolean candidateBelongsToElectionParty(Election election, Candidate candidate) {
    return election.partyIds != null
        && candidate.partyId != null
        && election.partyIds.contains(candidate.partyId);
  }

  private static List<String> sortedElectionPositionIds(Database db, Election election) {
    if (election.positions == null) return List.of();
    Map<String, Integer> savedOrder = new LinkedHashMap<>();
    for (int i = 0; i < election.positions.size(); i++) {
      savedOrder.putIfAbsent(election.positions.get(i), i);
    }

    return election.positions.stream()
        .distinct()
        .sorted(Comparator
            .comparingInt((String positionId) -> db.positions.stream()
                .filter(position -> position.id.equals(positionId))
                .findFirst()
                .map(position -> positionRank(position.positionName))
                .orElse(1000))
            .thenComparingInt(positionId -> savedOrder.getOrDefault(positionId, 1000)))
        .toList();
  }

  private static int positionRank(String positionName) {
    if (positionName == null) return 1000;
    String normalized = positionName.toLowerCase().replace(".", "").replace("-", " ").trim();
    if (normalized.equals("president")) return 0;
    if (normalized.equals("vice president") || normalized.equals("vice-president")) return 1;
    if (normalized.equals("secretary")) return 2;
    if (normalized.equals("treasurer")) return 3;
    if (normalized.equals("auditor")) return 4;
    if (normalized.equals("pio") || normalized.equals("public information officer")) return 5;
    if (normalized.equals("business manager")) return 6;
    if (normalized.equals("representative")) return 7;
    return 1000;
  }

  private static boolean voteBelongsToElectionCandidate(Database db, Election election, Vote vote) {
    return election.positions != null
        && election.positions.contains(vote.positionId)
        && db.candidates.stream().anyMatch(candidate ->
            candidate.id.equals(vote.candidateId)
                && vote.positionId.equals(candidate.positionId)
                && candidateBelongsToElectionParty(election, candidate)
        );
  }

  private static ResponseEntity<Map<String, String>> error(HttpStatusCode status, String message) {
    return ResponseEntity.status(status).body(Map.of("error", message));
  }

  private static String now() {
    return Instant.now().toString();
  }

  private static String id() {
    return UUID.randomUUID().toString().replace("-", "").substring(0, 7);
  }

  private static String str(Object value) {
    return value == null ? null : value.toString();
  }

  private static boolean blank(String value) {
    return value == null || value.isBlank();
  }

  private static String orDefault(String value, String fallback) {
    return blank(value) ? fallback : value;
  }

  private String generateVoterId() {
    String candidate;
    do {
      candidate = "VOT-" + Instant.now().toEpochMilli() + "-" + id().substring(0, 4).toUpperCase();
    } while (store.voterIdExists(candidate));
    return candidate;
  }

  private static String ip(HttpServletRequest request) {
    return request.getRemoteAddr() == null ? "127.0.0.1" : request.getRemoteAddr();
  }

  private static double oneDecimal(double value) {
    return Math.round(value * 10.0) / 10.0;
  }

  private static int normalizeWinnerSlots(int winnerSlots) {
    return Math.max(1, winnerSlots);
  }

  private static Map<String, Integer> normalizedElectionWinnerSlots(Database db, Election election, List<String> validPositionIds) {
    Map<String, Integer> slots = new LinkedHashMap<>();
    Map<String, Integer> requestedSlots = election.positionWinnerSlots == null ? Map.of() : election.positionWinnerSlots;
    for (String positionId : validPositionIds) {
      Integer requested = requestedSlots.get(positionId);
      slots.put(positionId, requested == null ? defaultWinnerSlotsForPosition(db, positionId) : normalizeWinnerSlots(requested));
    }
    return slots;
  }

  private static int winnerSlotsForElectionPosition(Database db, Election election, String positionId) {
    if (election.positionWinnerSlots != null && election.positionWinnerSlots.containsKey(positionId)) {
      return normalizeWinnerSlots(election.positionWinnerSlots.get(positionId));
    }
    return defaultWinnerSlotsForPosition(db, positionId);
  }

  private static int defaultWinnerSlotsForPosition(Database db, String positionId) {
    return db.positions.stream()
        .filter(position -> position.id.equals(positionId))
        .findFirst()
        .map(position -> normalizeWinnerSlots(position.winnerSlots))
        .orElse(1);
  }

  private static Optional<User> findUser(Database db, String id) {
    return db.users.stream().filter(u -> u.id.equals(id)).findFirst();
  }

  private static Optional<Voter> findVoter(Database db, String id) {
    return db.voters.stream().filter(v -> v.id.equals(id)).findFirst();
  }

  private static Optional<Voter> findVoterByUserId(Database db, String userId) {
    return db.voters.stream().filter(v -> v.userId.equals(userId)).findFirst();
  }

  private static String userName(Database db, String id) {
    return findUser(db, id).map(u -> u.username).orElse("admin");
  }

  private static void log(Database db, String action, String userId, String username, String details, String ipAddress) {
    db.auditLogs.add(0, new AuditLog("lg_" + id(), action, userId, username, details, ipAddress, now()));
  }

  private static Map<String, Object> objectMap(Object value) {
    return new ObjectMapper().convertValue(value, new TypeReference<LinkedHashMap<String, Object>>() {});
  }
}
