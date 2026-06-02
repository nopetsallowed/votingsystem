package com.example.voting.model;

public class Position {
  public String id;
  public String positionName;
  public String description;
  public int winnerSlots = 1;
  public String createdAt;

  public Position() {}

  public Position(String id, String positionName, String description, String createdAt) {
    this.id = id;
    this.positionName = positionName;
    this.description = description;
    this.winnerSlots = 1;
    this.createdAt = createdAt;
  }

  public Position(String id, String positionName, String description, int winnerSlots, String createdAt) {
    this.id = id;
    this.positionName = positionName;
    this.description = description;
    this.winnerSlots = Math.max(1, winnerSlots);
    this.createdAt = createdAt;
  }
}
