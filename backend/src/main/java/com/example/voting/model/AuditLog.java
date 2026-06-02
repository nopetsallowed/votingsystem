package com.example.voting.model;

public class AuditLog {
  public String id;
  public String action;
  public String userId;
  public String username;
  public String details;
  public String ipAddress;
  public String timestamp;

  public AuditLog() {}

  public AuditLog(String id, String action, String userId, String username, String details, String ipAddress, String timestamp) {
    this.id = id;
    this.action = action;
    this.userId = userId;
    this.username = username;
    this.details = details;
    this.ipAddress = ipAddress;
    this.timestamp = timestamp;
  }
}
