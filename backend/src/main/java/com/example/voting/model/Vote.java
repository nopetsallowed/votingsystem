package com.example.voting.model;

public class Vote {
  public String id;
  public String voterId;
  public String candidateId;
  public String electionId;
  public String positionId;
  public String timestamp;
  public String ipAddress;

  public Vote() {}

  public Vote(String id, String voterId, String candidateId, String electionId, String positionId, String timestamp, String ipAddress) {
    this.id = id;
    this.voterId = voterId;
    this.candidateId = candidateId;
    this.electionId = electionId;
    this.positionId = positionId;
    this.timestamp = timestamp;
    this.ipAddress = ipAddress;
  }
}
