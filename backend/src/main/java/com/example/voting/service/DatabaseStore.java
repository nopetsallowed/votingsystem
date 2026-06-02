package com.example.voting.service;

import com.example.voting.model.AuditLog;
import com.example.voting.model.Candidate;
import com.example.voting.model.Database;
import com.example.voting.model.Election;
import com.example.voting.model.Party;
import com.example.voting.model.Position;
import com.example.voting.model.User;
import com.example.voting.model.Vote;
import com.example.voting.model.Voter;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DatabaseStore {
  private final JdbcTemplate jdbc;

  public DatabaseStore(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
    initializeSchema();
  }

  public synchronized Database load() {
    initializeSchema();

    Database db = new Database();
    db.users = jdbc.query("select * from users order by created_at", this::mapUser);
    Map<String, String> passwords = jdbc.query(
        "select user_id, password from user_passwords",
        rs -> {
          Map<String, String> loaded = new HashMap<>();
          while (rs.next()) {
            loaded.put(rs.getString("user_id"), rs.getString("password"));
          }
          return loaded;
        }
    );
    db.passwords.putAll(passwords);
    db.voters = jdbc.query("select * from voters order by registered_at", this::mapVoter);
    db.parties = jdbc.query("select * from parties order by created_at", this::mapParty);
    db.positions = jdbc.query("select * from positions order by created_at", this::mapPosition);
    db.candidates = jdbc.query("select * from candidates order by created_at", this::mapCandidate);
    db.elections = jdbc.query("select * from elections order by created_at", this::mapElection);

    Map<String, List<String>> electionPositions = jdbc.query(
        "select election_id, position_id from election_positions order by election_id, sort_order",
        rs -> {
          java.util.Map<String, List<String>> positions = new java.util.HashMap<>();
          while (rs.next()) {
            positions.computeIfAbsent(rs.getString("election_id"), key -> new ArrayList<>()).add(rs.getString("position_id"));
          }
          return positions;
        }
    );
    Map<String, List<String>> positionsByElection = electionPositions == null ? Map.of() : electionPositions;
    db.elections.forEach(election -> election.positions = new ArrayList<>(positionsByElection.getOrDefault(election.id, List.of())));

    Map<String, List<String>> electionParties = jdbc.query(
        "select election_id, party_id from election_parties order by election_id, sort_order",
        rs -> {
          java.util.Map<String, List<String>> parties = new java.util.HashMap<>();
          while (rs.next()) {
            parties.computeIfAbsent(rs.getString("election_id"), key -> new ArrayList<>()).add(rs.getString("party_id"));
          }
          return parties;
        }
    );
    Map<String, List<String>> partiesByElection = electionParties == null ? Map.of() : electionParties;
    db.elections.forEach(election -> election.partyIds = new ArrayList<>(partiesByElection.getOrDefault(election.id, List.of())));

    db.votes = jdbc.query("select * from votes order by timestamp", this::mapVote);
    db.auditLogs = jdbc.query("select * from audit_logs order by timestamp desc", this::mapAuditLog);

    if (db.users.isEmpty()) {
      db = seed();
      save(db);
    } else if (ensureTestingElectionData(db)) {
      save(db);
    }

    return db;
  }

  public synchronized boolean usernameExists(String username) {
    initializeSchema();
    Integer count = jdbc.queryForObject(
        "select count(*) from users where lower(username) = lower(?)",
        Integer.class,
        username
    );
    return count != null && count > 0;
  }

  public synchronized boolean emailExists(String email) {
    initializeSchema();
    Integer count = jdbc.queryForObject(
        "select count(*) from users where lower(email) = lower(?)",
        Integer.class,
        email
    );
    return count != null && count > 0;
  }

  public synchronized boolean voterIdExists(String voterIdNumber) {
    initializeSchema();
    Integer count = jdbc.queryForObject(
        "select count(*) from voters where lower(voter_id_number) = lower(?)",
        Integer.class,
        voterIdNumber
    );
    return count != null && count > 0;
  }

  @Transactional
  public synchronized void save(Database db) {
    initializeSchema();

    jdbc.update("delete from election_positions");
    jdbc.update("delete from election_parties");
    jdbc.update("delete from audit_logs");
    jdbc.update("delete from votes");
    jdbc.update("delete from candidates");
    jdbc.update("delete from elections");
    jdbc.update("delete from positions");
    jdbc.update("delete from parties");
    jdbc.update("delete from voters");
    jdbc.update("delete from user_passwords");
    jdbc.update("delete from users");

    for (User user : db.users) {
      jdbc.update(
          """
          insert into users (id, username, email, full_name, profile_photo, role, enabled, created_at, updated_at)
          values (?, ?, ?, ?, ?, ?, ?, ?, ?)
          """,
          user.id, user.username, user.email, user.fullName, user.profilePhoto, user.role, user.enabled, user.createdAt, user.updatedAt
      );
    }

    db.passwords.forEach((userId, password) -> jdbc.update(
        "insert into user_passwords (user_id, password) values (?, ?)",
        userId, password
    ));

    for (Voter voter : db.voters) {
      jdbc.update(
          """
          insert into voters (id, user_id, voter_id_number, date_of_birth, address, phone, profile_photo,
            approved, approved_by, approved_at, registered_at)
          values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          """,
          voter.id, voter.userId, voter.voterIdNumber, voter.dateOfBirth, voter.address, voter.phone,
          voter.profilePhoto, voter.approved, voter.approvedBy, voter.approvedAt, voter.registeredAt
      );
    }

    for (Party party : db.parties) {
      jdbc.update(
          """
          insert into parties (id, party_name, acronym, logo, description, slogan, leader, color, created_at, updated_at)
          values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          """,
          party.id, party.partyName, party.acronym, party.logo, party.description, party.slogan, party.leader,
          party.color, party.createdAt, party.updatedAt
      );
    }

    for (Position position : db.positions) {
      jdbc.update(
          "insert into positions (id, position_name, description, created_at) values (?, ?, ?, ?)",
          position.id, position.positionName, position.description, position.createdAt
      );
    }

    for (Candidate candidate : db.candidates) {
      jdbc.update(
          """
          insert into candidates (id, full_name, party_id, position_id, photo, poster, biography,
            platform_statement, achievements, education, contact_info, social_media_links, created_at, updated_at)
          values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          """,
          candidate.id, candidate.fullName, candidate.partyId, candidate.positionId, candidate.photo, candidate.poster,
          candidate.biography, candidate.platformStatement, candidate.achievements, candidate.education,
          candidate.contactInfo, candidate.socialMediaLinks, candidate.createdAt, candidate.updatedAt
      );
    }

    for (Election election : db.elections) {
      jdbc.update(
          """
          insert into elections (id, election_name, description, start_date, end_date, banner, status,
            created_by, created_at, updated_at)
          values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          """,
          election.id, election.electionName, election.description, election.startDate, election.endDate,
          election.banner, election.status, election.createdBy, election.createdAt, election.updatedAt
      );

      if (election.positions == null) election.positions = new ArrayList<>();
      if (election.partyIds == null) election.partyIds = new ArrayList<>();

      for (int i = 0; i < election.positions.size(); i++) {
        jdbc.update(
            "insert into election_positions (election_id, position_id, sort_order) values (?, ?, ?)",
            election.id, election.positions.get(i), i
        );
      }

      for (int i = 0; i < election.partyIds.size(); i++) {
        jdbc.update(
            "insert into election_parties (election_id, party_id, sort_order) values (?, ?, ?)",
            election.id, election.partyIds.get(i), i
        );
      }
    }

    for (Vote vote : db.votes) {
      jdbc.update(
          """
          insert into votes (id, voter_id, candidate_id, election_id, position_id, timestamp, ip_address)
          values (?, ?, ?, ?, ?, ?, ?)
          """,
          vote.id, vote.voterId, vote.candidateId, vote.electionId, vote.positionId, vote.timestamp, vote.ipAddress
      );
    }

    for (AuditLog log : db.auditLogs) {
      jdbc.update(
          """
          insert into audit_logs (id, action, user_id, username, details, ip_address, timestamp)
          values (?, ?, ?, ?, ?, ?, ?)
          """,
          log.id, log.action, log.userId, log.username, log.details, log.ipAddress, log.timestamp
      );
    }
  }

  @Transactional
  public synchronized void insertVoteWithAuditLog(Vote vote, AuditLog log) {
    initializeSchema();
    jdbc.update(
        """
        insert into votes (id, voter_id, candidate_id, election_id, position_id, timestamp, ip_address)
        values (?, ?, ?, ?, ?, ?, ?)
        """,
        vote.id, vote.voterId, vote.candidateId, vote.electionId, vote.positionId, vote.timestamp, vote.ipAddress
    );
    if (log != null) {
      jdbc.update(
          """
          insert into audit_logs (id, action, user_id, username, details, ip_address, timestamp)
          values (?, ?, ?, ?, ?, ?, ?)
          """,
          log.id, log.action, log.userId, log.username, log.details, log.ipAddress, log.timestamp
      );
    }
  }

  @Transactional
  public synchronized void insertParty(Party party) {
    initializeSchema();
    jdbc.update(
        """
        insert into parties (id, party_name, acronym, logo, description, slogan, leader, color, created_at, updated_at)
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        party.id, party.partyName, party.acronym, party.logo, party.description, party.slogan, party.leader,
        party.color, party.createdAt, party.updatedAt
    );
  }

  @Transactional
  public synchronized void updateParty(Party party) {
    initializeSchema();
    jdbc.update(
        """
        update parties
        set party_name = ?, acronym = ?, logo = ?, description = ?, slogan = ?, leader = ?, color = ?, updated_at = ?
        where id = ?
        """,
        party.partyName, party.acronym, party.logo, party.description, party.slogan, party.leader, party.color,
        party.updatedAt, party.id
    );
  }

  @Transactional
  public synchronized void deleteParty(String partyId) {
    initializeSchema();
    jdbc.update("delete from election_parties where party_id = ?", partyId);
    jdbc.update("update candidates set party_id = null where party_id = ?", partyId);
    jdbc.update("delete from parties where id = ?", partyId);
  }

  @Transactional
  public synchronized void insertAuditLog(AuditLog log) {
    initializeSchema();
    jdbc.update(
        """
        insert into audit_logs (id, action, user_id, username, details, ip_address, timestamp)
        values (?, ?, ?, ?, ?, ?, ?)
        """,
        log.id, log.action, log.userId, log.username, log.details, log.ipAddress, log.timestamp
    );
  }

  @Transactional
  public synchronized void insertRegisteredVoter(User user, String password, Voter voter, AuditLog log) {
    initializeSchema();
    jdbc.update(
        """
        insert into users (id, username, email, full_name, profile_photo, role, enabled, created_at, updated_at)
        values (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        user.id, user.username, user.email, user.fullName, user.profilePhoto, user.role, user.enabled,
        user.createdAt, user.updatedAt
    );
    jdbc.update(
        "insert into user_passwords (user_id, password) values (?, ?)",
        user.id, password
    );
    jdbc.update(
        """
        insert into voters (id, user_id, voter_id_number, date_of_birth, address, phone, profile_photo,
          approved, approved_by, approved_at, registered_at)
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        voter.id, voter.userId, voter.voterIdNumber, voter.dateOfBirth, voter.address, voter.phone,
        voter.profilePhoto, voter.approved, voter.approvedBy, voter.approvedAt, voter.registeredAt
    );
    if (log != null) {
      jdbc.update(
          """
          insert into audit_logs (id, action, user_id, username, details, ip_address, timestamp)
          values (?, ?, ?, ?, ?, ?, ?)
          """,
          log.id, log.action, log.userId, log.username, log.details, log.ipAddress, log.timestamp
      );
    }
  }

  private void initializeSchema() {
    jdbc.execute("""
        create table if not exists users (
          id varchar(64) primary key,
          username varchar(191) not null unique,
          email varchar(191) not null unique,
          full_name varchar(191) not null,
          profile_photo longtext,
          role varchar(32) not null,
          enabled boolean not null,
          created_at varchar(64) not null,
          updated_at varchar(64) not null
        )
        """);
    jdbc.execute("""
        create table if not exists user_passwords (
          user_id varchar(64) primary key,
          password varchar(255) not null
        )
        """);
    jdbc.execute("""
        create table if not exists voters (
          id varchar(64) primary key,
          user_id varchar(64) not null unique,
          voter_id_number varchar(191) not null unique,
          date_of_birth varchar(64),
          address text,
          phone varchar(64),
          profile_photo longtext,
          approved boolean not null,
          approved_by varchar(64),
          approved_at varchar(64),
          registered_at varchar(64) not null
        )
        """);
    jdbc.execute("""
        create table if not exists parties (
          id varchar(64) primary key,
          party_name varchar(191) not null unique,
          acronym varchar(64) not null unique,
          logo longtext,
          description text,
          slogan text,
          leader varchar(191),
          color varchar(32),
          created_at varchar(64) not null,
          updated_at varchar(64) not null
        )
        """);
    jdbc.execute("""
        create table if not exists positions (
          id varchar(64) primary key,
          position_name varchar(191) not null unique,
          description text,
          created_at varchar(64) not null
        )
        """);
    jdbc.execute("""
        create table if not exists candidates (
          id varchar(64) primary key,
          full_name varchar(191) not null,
          party_id varchar(64),
          position_id varchar(64) not null,
          photo longtext,
          poster longtext,
          biography text,
          platform_statement text,
          achievements text,
          education text,
          contact_info text,
          social_media_links text,
          created_at varchar(64) not null,
          updated_at varchar(64) not null
        )
        """);
    jdbc.execute("""
        create table if not exists elections (
          id varchar(64) primary key,
          election_name varchar(191) not null,
          description text,
          start_date varchar(64) not null,
          end_date varchar(64) not null,
          banner longtext,
          status varchar(32) not null,
          created_by varchar(64) not null,
          created_at varchar(64) not null,
          updated_at varchar(64) not null
        )
        """);
    jdbc.execute("""
        create table if not exists election_positions (
          election_id varchar(64) not null,
          position_id varchar(64) not null,
          sort_order int not null,
          primary key (election_id, position_id)
        )
        """);
    jdbc.execute("""
        create table if not exists election_parties (
          election_id varchar(64) not null,
          party_id varchar(64) not null,
          sort_order int not null,
          primary key (election_id, party_id)
        )
        """);
    jdbc.execute("""
        create table if not exists votes (
          id varchar(64) primary key,
          voter_id varchar(64) not null,
          candidate_id varchar(64) not null,
          election_id varchar(64) not null,
          position_id varchar(64) not null,
          timestamp varchar(64) not null,
          ip_address varchar(64)
        )
        """);
    jdbc.execute("""
        create table if not exists audit_logs (
          id varchar(64) primary key,
          action varchar(191) not null,
          user_id varchar(64),
          username varchar(191),
          details text,
          ip_address varchar(64),
          timestamp varchar(64) not null
        )
        """);
    ensureLargeImageColumns();
  }

  private void ensureLargeImageColumns() {
    ensureLongTextColumn("users", "profile_photo");
    ensureLongTextColumn("voters", "profile_photo");
    ensureLongTextColumn("parties", "logo");
    ensureLongTextColumn("candidates", "photo");
    ensureLongTextColumn("candidates", "poster");
    ensureLongTextColumn("elections", "banner");
  }

  private void ensureLongTextColumn(String tableName, String columnName) {
    String dataType = jdbc.query(
        """
        select data_type from information_schema.columns
        where table_schema = database() and table_name = ? and column_name = ?
        """,
        rs -> rs.next() ? rs.getString("data_type") : null,
        tableName,
        columnName
    );

    if (dataType == null) {
      jdbc.execute("alter table " + tableName + " add column " + columnName + " longtext");
    } else if (!"longtext".equalsIgnoreCase(dataType)) {
      jdbc.execute("alter table " + tableName + " modify column " + columnName + " longtext");
    }
  }

  private User mapUser(ResultSet rs, int rowNum) throws SQLException {
    return new User(
        rs.getString("id"),
        rs.getString("username"),
        rs.getString("email"),
        rs.getString("full_name"),
        rs.getString("profile_photo"),
        rs.getString("role"),
        rs.getBoolean("enabled"),
        rs.getString("created_at"),
        rs.getString("updated_at")
    );
  }

  private Voter mapVoter(ResultSet rs, int rowNum) throws SQLException {
    Voter voter = new Voter();
    voter.id = rs.getString("id");
    voter.userId = rs.getString("user_id");
    voter.voterIdNumber = rs.getString("voter_id_number");
    voter.dateOfBirth = rs.getString("date_of_birth");
    voter.address = rs.getString("address");
    voter.phone = rs.getString("phone");
    voter.profilePhoto = rs.getString("profile_photo");
    voter.approved = rs.getBoolean("approved");
    voter.approvedBy = rs.getString("approved_by");
    voter.approvedAt = rs.getString("approved_at");
    voter.registeredAt = rs.getString("registered_at");
    return voter;
  }

  private Party mapParty(ResultSet rs, int rowNum) throws SQLException {
    return new Party(
        rs.getString("id"),
        rs.getString("party_name"),
        rs.getString("acronym"),
        rs.getString("logo"),
        rs.getString("description"),
        rs.getString("slogan"),
        rs.getString("leader"),
        rs.getString("color"),
        rs.getString("created_at"),
        rs.getString("updated_at")
    );
  }

  private Position mapPosition(ResultSet rs, int rowNum) throws SQLException {
    return new Position(
        rs.getString("id"),
        rs.getString("position_name"),
        rs.getString("description"),
        rs.getString("created_at")
    );
  }

  private Candidate mapCandidate(ResultSet rs, int rowNum) throws SQLException {
    return new Candidate(
        rs.getString("id"),
        rs.getString("full_name"),
        rs.getString("party_id"),
        rs.getString("position_id"),
        rs.getString("photo"),
        rs.getString("poster"),
        rs.getString("biography"),
        rs.getString("platform_statement"),
        rs.getString("achievements"),
        rs.getString("education"),
        rs.getString("contact_info"),
        rs.getString("social_media_links"),
        rs.getString("created_at"),
        rs.getString("updated_at")
    );
  }

  private Election mapElection(ResultSet rs, int rowNum) throws SQLException {
    Election election = new Election();
    election.id = rs.getString("id");
    election.electionName = rs.getString("election_name");
    election.description = rs.getString("description");
    election.startDate = rs.getString("start_date");
    election.endDate = rs.getString("end_date");
    election.banner = rs.getString("banner");
    election.status = rs.getString("status");
    election.createdBy = rs.getString("created_by");
    election.createdAt = rs.getString("created_at");
    election.updatedAt = rs.getString("updated_at");
    return election;
  }

  private Vote mapVote(ResultSet rs, int rowNum) throws SQLException {
    return new Vote(
        rs.getString("id"),
        rs.getString("voter_id"),
        rs.getString("candidate_id"),
        rs.getString("election_id"),
        rs.getString("position_id"),
        rs.getString("timestamp"),
        rs.getString("ip_address")
    );
  }

  private AuditLog mapAuditLog(ResultSet rs, int rowNum) throws SQLException {
    return new AuditLog(
        rs.getString("id"),
        rs.getString("action"),
        rs.getString("user_id"),
        rs.getString("username"),
        rs.getString("details"),
        rs.getString("ip_address"),
        rs.getString("timestamp")
    );
  }

  private Database seed() {
    String now = Instant.now().toString();
    Database db = new Database();
    db.users.add(new User("u_sa", "superadmin", "admin@votesystem.com", "System Administrator", "SUPER_ADMIN", true, now, now));
    db.users.add(new User("u_ea", "electionadmin", "election@votesystem.com", "Election Manager", "ELECTION_ADMIN", true, now, now));
    db.users.add(new User("u_v1", "alice_voter", "alice@example.com", "Alice Voter", "VOTER", true, now, now));
    db.passwords.put("u_sa", "admin123");
    db.passwords.put("u_ea", "admin123");
    db.passwords.put("u_v1", "voter123");

    Voter voter = new Voter();
    voter.id = "v_001";
    voter.userId = "u_v1";
    voter.voterIdNumber = "VOTER-001";
    voter.phone = "+1 555 0101";
    voter.address = "123 Democracy Ave";
    voter.profilePhoto = "";
    voter.approved = true;
    voter.approvedBy = "u_sa";
    voter.approvedAt = now;
    voter.registeredAt = now;
    db.voters.add(voter);

    ensureTestingElectionData(db);

    db.auditLogs.add(new AuditLog("lg_seed", "SYSTEM_SEED", "u_sa", "superadmin", "Seeded Java backend MySQL tables.", "127.0.0.1", now));
    return db;
  }

  private boolean ensureTestingElectionData(Database db) {
    String now = Instant.now().toString();
    boolean changed = false;

    changed |= addPartyIfMissing(db, new Party("pt_civic_future", "Civic Future Party", "CFP", partyLogo("#2563eb", "CFP"), "Student services, transparent budgets, and faster digital access for every voter.", "Build tomorrow today", "Avery Santos", "#2563eb", now, now));
    changed |= addPartyIfMissing(db, new Party("pt_green_horizon", "Green Horizon Movement", "GHM", partyLogo("#16a34a", "GHM"), "Sustainability programs, wellness support, and cleaner campus operations.", "Grow with purpose", "Mika Reyes", "#16a34a", now, now));
    changed |= addPartyIfMissing(db, new Party("pt_unity_voice", "Unity Voice Coalition", "UVC", partyLogo("#9333ea", "UVC"), "Inclusive representation, peer support, and practical community-first reforms.", "One voice, one community", "Noah Bennett", "#9333ea", now, now));
    changed |= addPartyIfMissing(db, new Party("pt_tech_alliance", "Tech Alliance Party", "TAP", partyLogo("#f97316", "TAP"), "Modern systems, online services, and data-informed student governance.", "Smarter service for all", "Riley Chen", "#f97316", now, now));

    changed |= addPositionIfMissing(db, new Position("p_president", "President", "Leads the organization, represents voters, and supervises executive programs.", now));
    changed |= addPositionIfMissing(db, new Position("p_vice_president", "Vice President", "Supports the president and coordinates committees and internal operations.", now));
    changed |= addPositionIfMissing(db, new Position("p_secretary", "Secretary", "Maintains records, meeting minutes, announcements, and official communication.", now));
    changed |= addPositionIfMissing(db, new Position("p_treasurer", "Treasurer", "Manages budgets, spending reports, fundraising records, and financial transparency.", now));
    changed |= addPositionIfMissing(db, new Position("p_auditor", "Auditor", "Reviews financial records, checks reports, and supports accountability.", now));
    changed |= addPositionIfMissing(db, new Position("p_pio", "Public Information Officer", "Manages public announcements, media posts, and voter information campaigns.", now));
    changed |= addPositionIfMissing(db, new Position("p_business_manager", "Business Manager", "Coordinates partnerships, supplies, logistics, and project resources.", now));
    changed |= addPositionIfMissing(db, new Position("p_representative", "Representative", "Represents student concerns and brings community feedback to the council.", now));

    changed |= addCandidateIfMissing(db, candidate("c_cfp_president", "Jamie Alvarez", "pt_civic_future", "p_president", "#2563eb", "JA", "Experienced council chair focused on reliable student services and transparent decision-making.", "Publish monthly progress dashboards and speed up service requests.", "Former class chair; debate finalist; service desk coordinator", "BA Public Administration", "jamie.alvarez@votesystem.test", "@jamiecfp", now));
    changed |= addCandidateIfMissing(db, candidate("c_cfp_vp", "Priya Nand", "pt_civic_future", "p_vice_president", "#2563eb", "PN", "Operations volunteer with a background in event planning and committee coordination.", "Create clear committee timelines and student feedback checkpoints.", "Volunteer lead; events committee marshal", "BS Management", "priya.nand@votesystem.test", "@priyacfp", now));
    changed |= addCandidateIfMissing(db, candidate("c_cfp_secretary", "Owen Park", "pt_civic_future", "p_secretary", "#2563eb", "OP", "Records assistant committed to accurate minutes and accessible announcements.", "Digitize minutes, notices, and forms in one searchable hub.", "Documentation team; newsletter editor", "Information Systems", "owen.park@votesystem.test", "@owencfp", now));
    changed |= addCandidateIfMissing(db, candidate("c_cfp_treasurer", "Sofia Grant", "pt_civic_future", "p_treasurer", "#2563eb", "SG", "Finance committee member focused on simple and transparent budget reporting.", "Release itemized spending summaries after every council project.", "Finance assistant; scholarship audit volunteer", "Accountancy", "sofia.grant@votesystem.test", "@sofiacfp", now));
    changed |= addCandidateIfMissing(db, candidate("c_cfp_auditor", "Dante Ramos", "pt_civic_future", "p_auditor", "#2563eb", "DR", "Detail-oriented reviewer focused on clear audit trails and accountable reporting.", "Check council records monthly and publish easy-to-read audit notes.", "Audit assistant; inventory reviewer", "Accounting Information Systems", "dante.ramos@votesystem.test", "@dantecfp", now));
    changed |= addCandidateIfMissing(db, candidate("c_cfp_pio", "Mina Patel", "pt_civic_future", "p_pio", "#2563eb", "MP", "Student communicator who creates simple updates for busy voters.", "Post verified announcements and weekly service reminders on schedule.", "Newsletter designer; public speaking awardee", "Mass Communication", "mina.patel@votesystem.test", "@minacfp", now));
    changed |= addCandidateIfMissing(db, candidate("c_cfp_business_manager", "Theo Martin", "pt_civic_future", "p_business_manager", "#2563eb", "TM", "Logistics planner experienced in event supplies and vendor coordination.", "Build a transparent request system for supplies and event support.", "Logistics aide; procurement volunteer", "Operations Management", "theo.martin@votesystem.test", "@theocfp", now));
    changed |= addCandidateIfMissing(db, candidate("c_cfp_representative", "Ari Kim", "pt_civic_future", "p_representative", "#2563eb", "AK", "Class representative focused on quick response and respectful consultation.", "Collect voter concerns through monthly surveys and open desk hours.", "Class representative; peer tutor", "Education", "ari.kim@votesystem.test", "@aricfp", now));

    changed |= addCandidateIfMissing(db, candidate("c_ghm_president", "Leo Mercado", "pt_green_horizon", "p_president", "#16a34a", "LM", "Environmental advocate who led waste reduction and student wellness campaigns.", "Launch green events, wellness stations, and cleaner shared spaces.", "Eco club president; wellness fair organizer", "Environmental Science", "leo.mercado@votesystem.test", "@leoghm", now));
    changed |= addCandidateIfMissing(db, candidate("c_ghm_vp", "Hana Flores", "pt_green_horizon", "p_vice_president", "#16a34a", "HF", "Peer mentor with experience coordinating volunteer teams across departments.", "Connect committees with community service and sustainability partners.", "Peer mentor; outreach coordinator", "Psychology", "hana.flores@votesystem.test", "@hanaghm", now));
    changed |= addCandidateIfMissing(db, candidate("c_ghm_secretary", "Caleb Stone", "pt_green_horizon", "p_secretary", "#16a34a", "CS", "Communications officer focused on concise updates and open meeting records.", "Send weekly action summaries and archive council decisions clearly.", "Comms officer; publication contributor", "Communication Arts", "caleb.stone@votesystem.test", "@calebghm", now));
    changed |= addCandidateIfMissing(db, candidate("c_ghm_treasurer", "Iris Tan", "pt_green_horizon", "p_treasurer", "#16a34a", "IT", "Budget volunteer who prioritizes cost-efficient, sustainable project planning.", "Track savings from green initiatives and publish fund usage reports.", "Budget volunteer; campus market treasurer", "Business Economics", "iris.tan@votesystem.test", "@irisghm", now));
    changed |= addCandidateIfMissing(db, candidate("c_ghm_auditor", "Paolo Vega", "pt_green_horizon", "p_auditor", "#16a34a", "PV", "Sustainability project reviewer with a careful eye for spending and impact.", "Audit projects for cost, waste reduction, and promised outcomes.", "Eco project monitor; records volunteer", "Environmental Management", "paolo.vega@votesystem.test", "@paologhm", now));
    changed |= addCandidateIfMissing(db, candidate("c_ghm_pio", "Nadia Lim", "pt_green_horizon", "p_pio", "#16a34a", "NL", "Campaign writer focused on positive messaging and accessible public updates.", "Create friendly reminders for wellness, clean-up, and election programs.", "Campaign copywriter; social media volunteer", "Digital Media", "nadia.lim@votesystem.test", "@nadiaghm", now));
    changed |= addCandidateIfMissing(db, candidate("c_ghm_business_manager", "Felix Moore", "pt_green_horizon", "p_business_manager", "#16a34a", "FM", "Resource coordinator who promotes practical and sustainable event planning.", "Prioritize reusable materials and cost-saving vendor partnerships.", "Supply team lead; market booth coordinator", "Supply Chain Management", "felix.moore@votesystem.test", "@felixghm", now));
    changed |= addCandidateIfMissing(db, candidate("c_ghm_representative", "Clara Nguyen", "pt_green_horizon", "p_representative", "#16a34a", "CN", "Student advocate who listens closely to wellness and campus environment concerns.", "Bring student feedback into every sustainability and support project.", "Wellness advocate; community volunteer", "Social Work", "clara.nguyen@votesystem.test", "@claraghm", now));

    changed |= addCandidateIfMissing(db, candidate("c_uvc_president", "Marcus Hill", "pt_unity_voice", "p_president", "#9333ea", "MH", "Community organizer focused on fair representation and student support systems.", "Open monthly town halls and create a faster concern escalation process.", "Student ambassador; inclusion forum host", "Political Science", "marcus.hill@votesystem.test", "@marcusuvc", now));
    changed |= addCandidateIfMissing(db, candidate("c_uvc_vp", "Elena Cruz", "pt_unity_voice", "p_vice_president", "#9333ea", "EC", "Team coordinator who has managed cross-section programs and peer circles.", "Improve committee handoffs and strengthen student organization partnerships.", "Org relations aide; peer circle facilitator", "Sociology", "elena.cruz@votesystem.test", "@elenauvc", now));
    changed |= addCandidateIfMissing(db, candidate("c_uvc_secretary", "Nico Ward", "pt_unity_voice", "p_secretary", "#9333ea", "NW", "Student writer who wants council information to be easier to understand.", "Rewrite public notices into concise summaries with clear next steps.", "Campus writer; records assistant", "English", "nico.ward@votesystem.test", "@nicouvc", now));
    changed |= addCandidateIfMissing(db, candidate("c_uvc_treasurer", "Amara Lewis", "pt_unity_voice", "p_treasurer", "#9333ea", "AL", "Fundraising lead with experience balancing project needs and affordability.", "Create transparent project budgets and accessible funding request forms.", "Fundraising chair; grant workshop participant", "Entrepreneurship", "amara.lewis@votesystem.test", "@amarauvc", now));
    changed |= addCandidateIfMissing(db, candidate("c_uvc_auditor", "Jules Carter", "pt_unity_voice", "p_auditor", "#9333ea", "JC", "Fairness-focused auditor candidate who values complete and understandable reports.", "Review records with clear notes and publish plain-language audit summaries.", "Compliance volunteer; student forum recorder", "Legal Studies", "jules.carter@votesystem.test", "@julesuvc", now));
    changed |= addCandidateIfMissing(db, candidate("c_uvc_pio", "Rosa Diaz", "pt_unity_voice", "p_pio", "#9333ea", "RD", "Public relations volunteer who wants all students to feel informed and included.", "Use multilingual and visual announcements for major council updates.", "PR volunteer; campus host", "Communication", "rosa.diaz@votesystem.test", "@rosauvc", now));
    changed |= addCandidateIfMissing(db, candidate("c_uvc_business_manager", "Ben Torres", "pt_unity_voice", "p_business_manager", "#9333ea", "BT", "Partnership builder focused on affordable projects and reliable event support.", "Negotiate fair supplier options and document resource requests clearly.", "Sponsorship aide; event marshal", "Marketing Management", "ben.torres@votesystem.test", "@benuvc", now));
    changed |= addCandidateIfMissing(db, candidate("c_uvc_representative", "Keira Scott", "pt_unity_voice", "p_representative", "#9333ea", "KS", "Representative candidate committed to listening across groups and sections.", "Hold rotating feedback sessions for different year levels and programs.", "Peer facilitator; section officer", "Humanities", "keira.scott@votesystem.test", "@keirauvc", now));

    changed |= addCandidateIfMissing(db, candidate("c_tap_president", "Kai Nakamura", "pt_tech_alliance", "p_president", "#f97316", "KN", "Systems-focused candidate who wants faster, smarter student services.", "Automate request tracking and publish live service status updates.", "Hackathon finalist; IT helpdesk volunteer", "Computer Science", "kai.nakamura@votesystem.test", "@kaitap", now));
    changed |= addCandidateIfMissing(db, candidate("c_tap_vp", "Maya Brooks", "pt_tech_alliance", "p_vice_president", "#f97316", "MB", "Project manager with experience connecting technical teams and student groups.", "Use shared dashboards to keep committees aligned and accountable.", "Project lead; robotics club coordinator", "Information Technology", "maya.brooks@votesystem.test", "@mayatap", now));
    changed |= addCandidateIfMissing(db, candidate("c_tap_secretary", "Ethan Yu", "pt_tech_alliance", "p_secretary", "#f97316", "EY", "Digital records advocate who wants cleaner archives and faster announcements.", "Build searchable digital records and template-based announcements.", "Records digitization aide; coding tutor", "Data Science", "ethan.yu@votesystem.test", "@ethantap", now));
    changed |= addCandidateIfMissing(db, candidate("c_tap_treasurer", "Lila Moreno", "pt_tech_alliance", "p_treasurer", "#f97316", "LM", "Analytics-minded treasurer candidate focused on clear spending insights.", "Create visual budget reports and spending alerts for council projects.", "Analytics club officer; budget tracker maintainer", "Financial Technology", "lila.moreno@votesystem.test", "@lilatap", now));
    changed |= addCandidateIfMissing(db, candidate("c_tap_auditor", "Zane Foster", "pt_tech_alliance", "p_auditor", "#f97316", "ZF", "Data checker who wants audit reports to be faster, clearer, and easier to verify.", "Use simple trackers to compare records, receipts, and project outcomes.", "Data validation aide; spreadsheet trainer", "Business Analytics", "zane.foster@votesystem.test", "@zanetap", now));
    changed |= addCandidateIfMissing(db, candidate("c_tap_pio", "Tara Singh", "pt_tech_alliance", "p_pio", "#f97316", "TS", "Digital content creator focused on fast, accurate, and accessible announcements.", "Use scheduled posts, QR notices, and visual briefs for all major updates.", "Content editor; UX volunteer", "Multimedia Arts", "tara.singh@votesystem.test", "@taratap", now));
    changed |= addCandidateIfMissing(db, candidate("c_tap_business_manager", "Cole Jensen", "pt_tech_alliance", "p_business_manager", "#f97316", "CJ", "Resource systems volunteer focused on organized logistics and asset tracking.", "Create a digital inventory for event materials and borrowed equipment.", "Inventory lead; systems volunteer", "Industrial Engineering", "cole.jensen@votesystem.test", "@coletap", now));
    changed |= addCandidateIfMissing(db, candidate("c_tap_representative", "Yuna Park", "pt_tech_alliance", "p_representative", "#f97316", "YP", "Student representative focused on using feedback data to solve real concerns.", "Collect digital suggestions and report progress through visible trackers.", "Feedback desk volunteer; class officer", "Computer Engineering", "yuna.park@votesystem.test", "@yunatap", now));

    List<String> testingPartyIds = List.of("pt_civic_future", "pt_green_horizon", "pt_unity_voice", "pt_tech_alliance");
    List<String> testingPositionIds = List.of("p_president", "p_vice_president", "p_secretary", "p_treasurer", "p_auditor", "p_pio", "p_business_manager", "p_representative");
    Election testingElection = db.elections.stream().filter(election -> "el_testing_2026".equals(election.id)).findFirst().orElse(null);
    if (testingElection == null) {
      Election election = new Election();
      election.id = "el_testing_2026";
      election.electionName = "Testing Election 2026";
      election.description = "Ready-to-use demo election with four parties and complete candidates for every position.";
      election.startDate = now;
      election.endDate = "2026-12-31T23:59:59Z";
      election.banner = electionBanner();
      election.status = "ACTIVE";
      election.createdBy = "u_sa";
      election.partyIds = new ArrayList<>(testingPartyIds);
      election.positions = new ArrayList<>(testingPositionIds);
      election.createdAt = now;
      election.updatedAt = now;
      db.elections.add(election);
      changed = true;
    } else {
      if (!testingElection.partyIds.containsAll(testingPartyIds) || testingElection.partyIds.size() != testingPartyIds.size()) {
        testingElection.partyIds = new ArrayList<>(testingPartyIds);
        testingElection.updatedAt = now;
        changed = true;
      }
      if (!testingElection.positions.containsAll(testingPositionIds) || testingElection.positions.size() != testingPositionIds.size()) {
        testingElection.positions = new ArrayList<>(testingPositionIds);
        testingElection.updatedAt = now;
        changed = true;
      }
    }

    if (changed) {
      db.auditLogs.add(new AuditLog("lg_test_catalog_" + System.currentTimeMillis(), "SYSTEM_TEST_DATA", "u_sa", "superadmin", "Added four-party testing election catalog with complete candidates and images.", "127.0.0.1", now));
    }

    return changed;
  }

  private boolean addPartyIfMissing(Database db, Party party) {
    Party existingParty = db.parties.stream()
        .filter(existing -> existing.id.equals(party.id)
            || existing.partyName.equalsIgnoreCase(party.partyName)
            || existing.acronym.equalsIgnoreCase(party.acronym))
        .findFirst()
        .orElse(null);
    if (existingParty != null) {
      boolean changed = false;
      if (!existingParty.id.equals(party.id)) {
        updatePartyReferences(db, existingParty.id, party.id);
        existingParty.id = party.id;
        changed = true;
      }
      changed |= !Objects.equals(existingParty.partyName, party.partyName);
      changed |= !Objects.equals(existingParty.acronym, party.acronym);
      changed |= !Objects.equals(existingParty.logo, party.logo);
      changed |= !Objects.equals(existingParty.description, party.description);
      changed |= !Objects.equals(existingParty.slogan, party.slogan);
      changed |= !Objects.equals(existingParty.leader, party.leader);
      changed |= !Objects.equals(existingParty.color, party.color);
      existingParty.partyName = party.partyName;
      existingParty.acronym = party.acronym;
      existingParty.logo = party.logo;
      existingParty.description = party.description;
      existingParty.slogan = party.slogan;
      existingParty.leader = party.leader;
      existingParty.color = party.color;
      if (changed) existingParty.updatedAt = party.updatedAt;
      return changed;
    }
    db.parties.add(party);
    return true;
  }

  private boolean addPositionIfMissing(Database db, Position position) {
    Position existingById = db.positions.stream()
        .filter(existing -> existing.id.equals(position.id))
        .findFirst()
        .orElse(null);
    if (existingById != null) {
      if (existingById.createdAt == null) {
        existingById.createdAt = position.createdAt;
        return true;
      }
      return false;
    }

    Position existingPosition = db.positions.stream()
        .filter(existing -> existing.positionName.equalsIgnoreCase(position.positionName))
        .findFirst()
        .orElse(null);
    if (existingPosition != null) {
      boolean changed = false;
      if (!existingPosition.id.equals(position.id)) {
        updatePositionReferences(db, existingPosition.id, position.id);
        existingPosition.id = position.id;
        changed = true;
      }
      existingPosition.createdAt = existingPosition.createdAt == null ? position.createdAt : existingPosition.createdAt;
      return changed;
    }
    db.positions.add(position);
    return true;
  }

  private boolean addCandidateIfMissing(Database db, Candidate candidate) {
    if (db.candidates.stream().anyMatch(existing -> existing.id.equals(candidate.id))) return false;
    db.candidates.add(candidate);
    return true;
  }

  private void updatePartyReferences(Database db, String oldPartyId, String newPartyId) {
    db.candidates.forEach(candidate -> {
      if (oldPartyId.equals(candidate.partyId)) candidate.partyId = newPartyId;
    });
    db.elections.forEach(election -> {
      if (election.partyIds != null) {
        election.partyIds.replaceAll(partyId -> oldPartyId.equals(partyId) ? newPartyId : partyId);
      }
    });
  }

  private void updatePositionReferences(Database db, String oldPositionId, String newPositionId) {
    db.candidates.forEach(candidate -> {
      if (oldPositionId.equals(candidate.positionId)) candidate.positionId = newPositionId;
    });
    db.votes.forEach(vote -> {
      if (oldPositionId.equals(vote.positionId)) vote.positionId = newPositionId;
    });
    db.elections.forEach(election -> {
      if (election.positions != null) {
        election.positions.replaceAll(positionId -> oldPositionId.equals(positionId) ? newPositionId : positionId);
      }
    });
  }

  private Candidate candidate(String id, String fullName, String partyId, String positionId, String color, String initials, String biography, String platform, String achievements, String education, String contact, String social, String now) {
    return new Candidate(id, fullName, partyId, positionId, avatar(color, initials), candidatePoster(color, fullName), biography, platform, achievements, education, contact, social, now, now);
  }

  private static String partyLogo(String color, String acronym) {
    return svgDataUri("<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"320\" height=\"320\" viewBox=\"0 0 320 320\"><rect width=\"320\" height=\"320\" rx=\"48\" fill=\"" + color + "\"/><circle cx=\"246\" cy=\"74\" r=\"44\" fill=\"#ffffff\" opacity=\"0.22\"/><circle cx=\"68\" cy=\"256\" r=\"54\" fill=\"#ffffff\" opacity=\"0.14\"/><text x=\"160\" y=\"180\" text-anchor=\"middle\" font-family=\"Arial, sans-serif\" font-size=\"70\" font-weight=\"700\" fill=\"#ffffff\">" + acronym + "</text></svg>");
  }

  private static String avatar(String color, String initials) {
    return svgDataUri("<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"420\" height=\"420\" viewBox=\"0 0 420 420\"><rect width=\"420\" height=\"420\" rx=\"56\" fill=\"#f8fafc\"/><circle cx=\"210\" cy=\"168\" r=\"86\" fill=\"" + color + "\" opacity=\"0.92\"/><path d=\"M92 382c17-83 75-126 118-126s101 43 118 126\" fill=\"" + color + "\" opacity=\"0.72\"/><text x=\"210\" y=\"190\" text-anchor=\"middle\" font-family=\"Arial, sans-serif\" font-size=\"72\" font-weight=\"700\" fill=\"#ffffff\">" + initials + "</text></svg>");
  }

  private static String candidatePoster(String color, String fullName) {
    return svgDataUri("<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"900\" height=\"420\" viewBox=\"0 0 900 420\"><rect width=\"900\" height=\"420\" fill=\"" + color + "\"/><rect x=\"36\" y=\"36\" width=\"828\" height=\"348\" rx=\"28\" fill=\"#ffffff\" opacity=\"0.16\"/><text x=\"64\" y=\"164\" font-family=\"Arial, sans-serif\" font-size=\"34\" font-weight=\"700\" fill=\"#ffffff\">Vote for</text><text x=\"64\" y=\"234\" font-family=\"Arial, sans-serif\" font-size=\"58\" font-weight=\"700\" fill=\"#ffffff\">" + fullName + "</text><text x=\"64\" y=\"302\" font-family=\"Arial, sans-serif\" font-size=\"26\" fill=\"#ffffff\" opacity=\"0.9\">Testing Election 2026</text></svg>");
  }

  private static String electionBanner() {
    return svgDataUri("<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1280\" height=\"480\" viewBox=\"0 0 1280 480\"><rect width=\"1280\" height=\"480\" fill=\"#0f172a\"/><circle cx=\"1080\" cy=\"80\" r=\"170\" fill=\"#2563eb\" opacity=\"0.45\"/><circle cx=\"160\" cy=\"410\" r=\"190\" fill=\"#16a34a\" opacity=\"0.38\"/><text x=\"96\" y=\"214\" font-family=\"Arial, sans-serif\" font-size=\"64\" font-weight=\"700\" fill=\"#ffffff\">Testing Election 2026</text><text x=\"100\" y=\"280\" font-family=\"Arial, sans-serif\" font-size=\"30\" fill=\"#cbd5e1\">Four parties, complete candidates, ready for voting tests</text></svg>");
  }

  private static String svgDataUri(String svg) {
    return "data:image/svg+xml;utf8," + svg
        .replace("\"", "'")
        .replace("#", "%23")
        .replace("<", "%3C")
        .replace(">", "%3E")
        .replace(" ", "%20");
  }
}
