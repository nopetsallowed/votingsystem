package com.example.voting.model;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class Database {
  public List<User> users = new ArrayList<>();
  public Map<String, String> passwords = new HashMap<>();
  public List<Voter> voters = new ArrayList<>();
  public List<Party> parties = new ArrayList<>();
  public List<Position> positions = new ArrayList<>();
  public List<Election> elections = new ArrayList<>();
  public List<Candidate> candidates = new ArrayList<>();
  public List<Vote> votes = new ArrayList<>();
  public List<AuditLog> auditLogs = new ArrayList<>();
}
